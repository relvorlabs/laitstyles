import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { paymentMethodIdentifierSchema } from "@/modules/payments/schema";
import {
  decryptAuthorizationCode,
  encryptAuthorizationCode,
} from "@/modules/payments/server/authorization-secrets";
import {
  createRefund,
  deactivateAuthorization,
  initializeTransaction,
  verifyTransaction,
} from "@/modules/payments/server/paystack";
import type {
  CreatePaymentMethodSetupInput,
  PaymentMethod,
  PaymentMethodError,
  PaymentMethodIdentity,
  PaymentMethodSetup,
} from "@/modules/payments/types";

const SETUP_AMOUNT_MINOR = 5_000;
const SETUP_AMOUNT_DECIMAL = "50.00";
const IDEMPOTENCY_SCOPE = "payment-method.setup";

export async function listPaymentMethods(identity: PaymentMethodIdentity): Promise<PaymentMethod[]> {
  const methods = await prisma.payment_authorizations.findMany({
    where: { customer_id: identity.customerId, status: "active" },
    orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
  });
  return methods.map(toPaymentMethod);
}

export async function createPaymentMethodSetup(
  identity: PaymentMethodIdentity,
  input: CreatePaymentMethodSetupInput,
  callbackUrl: string,
): Promise<Result<PaymentMethodSetup, PaymentMethodError>> {
  if (!identity.email) {
    return err({ code: "PAYMENT_METHOD_INVALID", message: "Add an email address before saving a payment method." });
  }
  const replay = await findSetupReplay(identity.customerId, input.idempotencyKey);
  if (replay) return ok(replay);

  const attemptId = crypto.randomUUID();
  const reference = `LS-METHOD-${crypto.randomUUID().replaceAll("-", "")}`;
  const orderNumber = `LS-METHOD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const placeholderCode = encryptAuthorizationCode(`pending:${attemptId}`);

  const pending = await prisma.$transaction(async (tx) => {
    const idempotency = await tx.idempotency_records.create({
      data: {
        scope: IDEMPOTENCY_SCOPE,
        idempotency_key: input.idempotencyKey,
        request_hash: identity.customerId,
        status: "in_progress",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1_000),
      },
    });
    const authorization = await tx.payment_authorizations.create({
      data: {
        id: attemptId,
        customer_id: identity.customerId,
        authorization_code: placeholderCode,
        signature: `setup:${attemptId}`,
        status: "pending",
        reusable: false,
      },
    });
    const order = await tx.orders.create({
      data: {
        order_number: orderNumber,
        customer_id: identity.customerId,
        source: "payment-method-setup",
        channel: "account",
        payment_status: "pending",
        payment_method: "paystack",
        customer_name: identity.displayName,
        customer_email: identity.email,
        currency: "NGN",
        subtotal: SETUP_AMOUNT_DECIMAL,
        total: SETUP_AMOUNT_DECIMAL,
        attention: "payment-method-setup",
        created_by_profile_id: identity.authUserId,
      },
    });
    const payment = await tx.payments.create({
      data: {
        order_id: order.id,
        reference,
        amount: SETUP_AMOUNT_DECIMAL,
        currency: "NGN",
        status: "initializing",
        payment_authorization_id: authorization.id,
      },
    });
    return { idempotencyId: idempotency.id, authorization, payment };
  });

  try {
    const initialized = await initializeTransaction({
      email: identity.email,
      amountMinor: SETUP_AMOUNT_MINOR,
      reference,
      callbackUrl,
      currency: "NGN",
      metadata: { purpose: "payment-method-setup", attemptId, customerId: identity.customerId },
    });
    const setup = await prisma.$transaction(async (tx) => {
      await tx.payments.update({
        where: { id: pending.payment.id },
        data: { access_code: initialized.accessCode, status: "initialized" },
      });
      const value: PaymentMethodSetup = {
        attemptId,
        paymentId: pending.payment.id,
        reference,
        accessCode: initialized.accessCode,
        status: "initialized",
        refundStatus: "not_requested",
        method: null,
      };
      await tx.idempotency_records.update({
        where: { id: pending.idempotencyId },
        data: { status: "completed", completed_at: new Date(), response_snapshot: value },
      });
      return value;
    });
    return ok(setup);
  } catch {
    await prisma.$transaction([
      prisma.payments.update({ where: { id: pending.payment.id }, data: { status: "failed" } }),
      prisma.idempotency_records.update({ where: { id: pending.idempotencyId }, data: { status: "failed" } }),
    ]);
    return err({ code: "PAYMENT_METHOD_PROVIDER_UNAVAILABLE", message: "Payment method setup could not be initialized." });
  }
}

export async function getPaymentMethodSetup(
  identity: PaymentMethodIdentity,
  attemptId: string,
): Promise<Result<PaymentMethodSetup, PaymentMethodError>> {
  const parsed = paymentMethodIdentifierSchema.safeParse(attemptId);
  if (!parsed.success) return err({ code: "PAYMENT_METHOD_INVALID", message: "Setup identifier is invalid." });
  const authorization = await prisma.payment_authorizations.findFirst({
    where: { id: parsed.data, customer_id: identity.customerId },
    include: {
      payments: {
        orderBy: { created_at: "desc" },
        take: 1,
        include: { payment_refunds: { orderBy: { requested_at: "desc" }, take: 1 } },
      },
    },
  });
  if (!authorization || !authorization.payments[0]) {
    return err({ code: "PAYMENT_METHOD_SETUP_NOT_FOUND", message: "Payment method setup was not found." });
  }
  return ok(toSetup(authorization, authorization.payments[0]));
}

export async function verifyPaymentMethodSetup(
  identity: PaymentMethodIdentity,
  attemptId: string,
): Promise<Result<PaymentMethodSetup, PaymentMethodError>> {
  const current = await getPaymentMethodSetup(identity, attemptId);
  if (!current.ok) return current;
  if (current.value.method?.status === "active" && current.value.refundStatus !== "not_requested") return current;

  const authorization = await prisma.payment_authorizations.findFirst({
    where: { id: attemptId, customer_id: identity.customerId },
    include: { payments: { orderBy: { created_at: "desc" }, take: 1, include: { orders: true, payment_refunds: true } } },
  });
  const payment = authorization?.payments[0];
  if (!authorization || !payment) {
    return err({ code: "PAYMENT_METHOD_SETUP_NOT_FOUND", message: "Payment method setup was not found." });
  }
  const provider = await verifyTransaction(payment.reference);
  if (provider.status !== "success") {
    await prisma.payments.update({
      where: { id: payment.id },
      data: { status: provider.status === "failed" || provider.status === "abandoned" ? provider.status : "pending" },
    });
    return err({
      code: provider.status === "failed" || provider.status === "abandoned" ? "PAYMENT_METHOD_SETUP_FAILED" : "PAYMENT_METHOD_SETUP_PENDING",
      message: provider.status === "failed" || provider.status === "abandoned" ? "The setup charge did not succeed." : "The setup charge is still pending.",
    });
  }
  if (provider.amountMinor !== SETUP_AMOUNT_MINOR) {
    return err({ code: "PAYMENT_METHOD_AMOUNT_MISMATCH", message: "The setup charge amount does not match NGN 50." });
  }
  if (provider.currency.toUpperCase() !== "NGN") {
    return err({ code: "PAYMENT_METHOD_CURRENCY_MISMATCH", message: "The setup charge currency does not match NGN." });
  }
  if (provider.customer?.email.toLowerCase() !== identity.email?.toLowerCase()) {
    return err({ code: "PAYMENT_METHOD_CUSTOMER_MISMATCH", message: "The Paystack customer does not match this account." });
  }
  if (!provider.authorization?.reusable || !provider.authorization.authorizationCode || !provider.authorization.signature) {
    return err({ code: "PAYMENT_METHOD_NOT_REUSABLE", message: "Paystack did not return a reusable payment authorization." });
  }

  const saved = await prisma.$transaction(async (tx) => {
    const existingDefault = await tx.payment_authorizations.findFirst({
      where: { customer_id: identity.customerId, status: "active", is_default: true },
      select: { id: true },
    });
    const method = await tx.payment_authorizations.update({
      where: { id: authorization.id },
      data: {
        authorization_code: encryptAuthorizationCode(provider.authorization.authorizationCode),
        signature: provider.authorization.signature,
        provider_customer_code: provider.customer.customerCode,
        status: "active",
        reusable: true,
        is_default: !existingDefault,
        channel: provider.authorization.channel,
        card_type: provider.authorization.brand ?? provider.authorization.cardType,
        bank: provider.authorization.bank,
        last4: provider.authorization.last4,
        exp_month: provider.authorization.expMonth,
        exp_year: provider.authorization.expYear,
        verified_at: new Date(),
      },
    });
    await tx.payments.update({
      where: { id: payment.id },
      data: {
        status: "success",
        provider_transaction_id: provider.id,
        provider_customer_code: provider.customer.customerCode,
        verified_at: new Date(),
        verification_source: "manual_verify",
        paid_at: provider.paidAt ? new Date(provider.paidAt) : new Date(),
        channel: provider.channel,
        gateway_response: provider.gatewayResponse,
      },
    });
    const refund = payment.payment_refunds[0] ?? await tx.payment_refunds.create({
      data: {
        payment_id: payment.id,
        requested_amount: SETUP_AMOUNT_DECIMAL,
        currency: "NGN",
        status: "pending",
        reason: "Automatic refund for payment-method setup charge.",
        requested_by_profile_id: identity.authUserId,
        metadata: { purpose: "payment-method-setup-refund", attemptId: authorization.id },
      },
    });
    return { method, refund };
  });

  if (!saved.refund.provider_reference) {
    try {
      const providerRefund = await createRefund({
        transaction: payment.reference,
        amountMinor: SETUP_AMOUNT_MINOR,
        currency: "NGN",
        customerNote: "Payment method setup refund",
        merchantNote: `Automatic refund for setup ${authorization.id}`,
      });
      await prisma.payment_refunds.update({
        where: { id: saved.refund.id },
        data: {
          provider_reference: providerRefund.id,
          status: mapRefundStatus(providerRefund.status),
          ...(providerRefund.status === "processed" ? { processed_amount: SETUP_AMOUNT_DECIMAL, processed_at: new Date() } : {}),
        },
      });
    } catch (error) {
      await prisma.payment_refunds.update({
        where: { id: saved.refund.id },
        data: { status: "needs_attention", failure_reason: error instanceof Error ? error.message : "Setup refund requires attention." },
      });
    }
  }
  return getPaymentMethodSetup(identity, authorization.id);
}

export async function setDefaultPaymentMethod(
  identity: PaymentMethodIdentity,
  methodId: string,
): Promise<Result<PaymentMethod, PaymentMethodError>> {
  const parsed = paymentMethodIdentifierSchema.safeParse(methodId);
  if (!parsed.success) return err({ code: "PAYMENT_METHOD_INVALID", message: "Payment method identifier is invalid." });
  const method = await prisma.$transaction(async (tx) => {
    const owned = await tx.payment_authorizations.findFirst({
      where: { id: parsed.data, customer_id: identity.customerId, status: "active", reusable: true },
    });
    if (!owned) return null;
    await tx.payment_authorizations.updateMany({
      where: { customer_id: identity.customerId, is_default: true, id: { not: owned.id } },
      data: { is_default: false },
    });
    return tx.payment_authorizations.update({ where: { id: owned.id }, data: { is_default: true } });
  });
  return method ? ok(toPaymentMethod(method)) : err({ code: "PAYMENT_METHOD_NOT_FOUND", message: "Payment method was not found." });
}

export async function deletePaymentMethod(
  identity: PaymentMethodIdentity,
  methodId: string,
): Promise<Result<{ id: string; inactive: true }, PaymentMethodError>> {
  const parsed = paymentMethodIdentifierSchema.safeParse(methodId);
  if (!parsed.success) return err({ code: "PAYMENT_METHOD_INVALID", message: "Payment method identifier is invalid." });
  const method = await prisma.payment_authorizations.findFirst({ where: { id: parsed.data, customer_id: identity.customerId } });
  if (!method) return err({ code: "PAYMENT_METHOD_NOT_FOUND", message: "Payment method was not found." });
  if (method.status === "inactive") return ok({ id: method.id, inactive: true });
  await deactivateAuthorization(decryptAuthorizationCode(method.authorization_code));
  await prisma.payment_authorizations.update({
    where: { id: method.id },
    data: { status: "inactive", reusable: false, is_default: false, deactivated_at: new Date() },
  });
  return ok({ id: method.id, inactive: true });
}

async function findSetupReplay(customerId: string, idempotencyKey: string) {
  const record = await prisma.idempotency_records.findUnique({
    where: { scope_idempotency_key: { scope: IDEMPOTENCY_SCOPE, idempotency_key: idempotencyKey } },
  });
  if (!record?.response_snapshot || record.request_hash !== customerId) return null;
  return record.response_snapshot as unknown as PaymentMethodSetup;
}

function toPaymentMethod(method: {
  id: string; bank: string | null; last4: string | null; exp_month: string | null; exp_year: string | null;
  channel: string | null; card_type: string | null; reusable: boolean; is_default: boolean; status: string; created_at: Date;
}): PaymentMethod {
  return {
    id: method.id,
    brand: method.card_type,
    bank: method.bank,
    last4: method.last4,
    expMonth: method.exp_month,
    expYear: method.exp_year,
    channel: method.channel,
    reusable: method.reusable,
    isDefault: method.is_default,
    status: method.status as PaymentMethod["status"],
    createdAt: method.created_at.toISOString(),
  };
}

function toSetup(authorization: any, payment: any): PaymentMethodSetup {
  const refund = payment.payment_refunds?.[0];
  return {
    attemptId: authorization.id,
    paymentId: payment.id,
    reference: payment.reference,
    accessCode: payment.access_code,
    status: payment.status,
    refundStatus: refund?.status ?? "not_requested",
    method: authorization.status === "active" ? toPaymentMethod(authorization) : null,
  };
}

function mapRefundStatus(status: string): "pending" | "processing" | "needs_attention" | "processed" | "failed" {
  switch (status) {
    case "processing": return "processing";
    case "processed": return "processed";
    case "failed": return "failed";
    case "needs-attention": return "needs_attention";
    default: return "pending";
  }
}

import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { type Prisma, prisma } from "@/lib/prisma";
import { paymentMethodIdentifierSchema } from "@/modules/payments/schema";
import {
  decryptAuthorizationCode,
  encryptAuthorizationCode,
} from "@/modules/payments/server/authorization-secrets";
import {
  findPaymentMethodSetupReplay,
  isAuthorizationSignatureConflict,
  isPrismaUniqueConstraintError,
  PAYMENT_METHOD_SETUP_SCOPE,
  paymentMethodSetupReplayResult,
} from "@/modules/payments/server/payment-method-idempotency";
import {
  failInitializedPaymentMethodSetup,
  failVerifiedPaymentMethodSetup,
  type PendingPaymentMethodSetup,
  tombstonePaymentAuthorizationSignature,
} from "@/modules/payments/server/payment-method-lifecycle";
import {
  mapPaymentMethodRefundStatus,
  type PaymentMethodProjectionRow,
  toPaymentMethod,
  toPaymentMethodSetup,
} from "@/modules/payments/server/payment-method-projection";
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

export async function listPaymentMethods(
  identity: PaymentMethodIdentity,
): Promise<PaymentMethod[]> {
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
  const email = identity.email?.trim().toLowerCase();
  if (!email) {
    return err({
      code: "PAYMENT_METHOD_INVALID",
      message: "Add an email address before saving a payment method.",
    });
  }

  const replay = await findPaymentMethodSetupReplay(identity.customerId, input.idempotencyKey);
  const replayResult = paymentMethodSetupReplayResult(replay);
  if (replayResult) return replayResult;

  const attemptId = crypto.randomUUID();
  const reference = `LS-METHOD-${crypto.randomUUID().replaceAll("-", "")}`;
  const orderNumber = `LS-METHOD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const placeholderCode = encryptAuthorizationCode(`pending:${attemptId}`);

  let pending: PendingPaymentMethodSetup;
  try {
    pending = await prisma.$transaction(async (tx) => {
      const idempotency = await tx.idempotency_records.create({
        data: {
          scope: PAYMENT_METHOD_SETUP_SCOPE,
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
          customer_email: email,
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
      return {
        idempotencyId: idempotency.id,
        authorizationId: authorization.id,
        orderId: order.id,
        paymentId: payment.id,
      };
    });
  } catch (error: unknown) {
    if (!isPrismaUniqueConstraintError(error)) throw error;
    const raced = await findPaymentMethodSetupReplay(identity.customerId, input.idempotencyKey);
    return (
      paymentMethodSetupReplayResult(raced) ??
      err({
        code: "PAYMENT_METHOD_SETUP_PENDING",
        message: "This payment method setup is already being prepared.",
      })
    );
  }

  try {
    const initialized = await initializeTransaction({
      email,
      amountMinor: SETUP_AMOUNT_MINOR,
      reference,
      callbackUrl,
      currency: "NGN",
      metadata: {
        purpose: "payment-method-setup",
        attemptId,
        customerId: identity.customerId,
      },
    });
    const setup = await prisma.$transaction(async (tx) => {
      await tx.payments.update({
        where: { id: pending.paymentId },
        data: { access_code: initialized.accessCode, status: "initialized" },
      });
      const value: PaymentMethodSetup = {
        attemptId,
        paymentId: pending.paymentId,
        reference,
        accessCode: initialized.accessCode,
        status: "initialized",
        refundStatus: "not_requested",
        method: null,
      };
      await tx.idempotency_records.update({
        where: { id: pending.idempotencyId },
        data: {
          status: "completed",
          completed_at: new Date(),
          response_snapshot: toPrismaJsonObject(value),
        },
      });
      return value;
    });
    return ok(setup);
  } catch {
    await failInitializedPaymentMethodSetup(pending);
    return err({
      code: "PAYMENT_METHOD_PROVIDER_UNAVAILABLE",
      message: "Payment method setup could not be initialized.",
    });
  }
}

export async function getPaymentMethodSetup(
  identity: PaymentMethodIdentity,
  attemptId: string,
): Promise<Result<PaymentMethodSetup, PaymentMethodError>> {
  const parsed = paymentMethodIdentifierSchema.safeParse(attemptId);
  if (!parsed.success) {
    return err({
      code: "PAYMENT_METHOD_INVALID",
      message: "Setup identifier is invalid.",
    });
  }
  const authorization = await prisma.payment_authorizations.findFirst({
    where: { id: parsed.data, customer_id: identity.customerId },
    include: {
      payments: {
        orderBy: { created_at: "desc" },
        take: 1,
        include: {
          payment_refunds: { orderBy: { requested_at: "desc" }, take: 1 },
        },
      },
    },
  });
  const payment = authorization?.payments[0];
  if (!authorization || !payment) {
    return err({
      code: "PAYMENT_METHOD_SETUP_NOT_FOUND",
      message: "Payment method setup was not found.",
    });
  }
  return ok(toPaymentMethodSetup(authorization, payment));
}

export async function verifyPaymentMethodSetup(
  identity: PaymentMethodIdentity,
  attemptId: string,
): Promise<Result<PaymentMethodSetup, PaymentMethodError>> {
  const current = await getPaymentMethodSetup(identity, attemptId);
  if (!current.ok) return current;
  if (current.value.method?.status === "active" && current.value.refundStatus !== "not_requested") {
    return current;
  }

  const authorization = await prisma.payment_authorizations.findFirst({
    where: { id: attemptId, customer_id: identity.customerId },
    include: {
      payments: {
        orderBy: { created_at: "desc" },
        take: 1,
        include: { orders: true, payment_refunds: true },
      },
    },
  });
  const payment = authorization?.payments[0];
  if (!authorization || !payment) {
    return err({
      code: "PAYMENT_METHOD_SETUP_NOT_FOUND",
      message: "Payment method setup was not found.",
    });
  }

  const provider = await verifyTransaction(payment.reference);
  if (provider.status !== "success") {
    const terminal = provider.status === "failed" || provider.status === "abandoned";
    if (terminal) {
      const terminalStatus = provider.status === "abandoned" ? "abandoned" : "failed";
      await failVerifiedPaymentMethodSetup({
        authorizationId: authorization.id,
        authorizationSignature: authorization.signature,
        orderId: payment.orders.id,
        paymentId: payment.id,
        paymentStatus: terminalStatus,
      });
    } else {
      await prisma.payments.update({
        where: { id: payment.id },
        data: { status: "pending" },
      });
    }
    return err({
      code: terminal ? "PAYMENT_METHOD_SETUP_FAILED" : "PAYMENT_METHOD_SETUP_PENDING",
      message: terminal
        ? "The setup charge did not succeed."
        : "The setup charge is still pending.",
    });
  }
  if (provider.amountMinor !== SETUP_AMOUNT_MINOR) {
    return err({
      code: "PAYMENT_METHOD_AMOUNT_MISMATCH",
      message: "The setup charge amount does not match NGN 50.",
    });
  }
  if (provider.currency.toUpperCase() !== "NGN") {
    return err({
      code: "PAYMENT_METHOD_CURRENCY_MISMATCH",
      message: "The setup charge currency does not match NGN.",
    });
  }

  const providerCustomer = provider.customer;
  const accountEmail = identity.email?.trim().toLowerCase();
  if (
    !accountEmail ||
    !providerCustomer ||
    providerCustomer.email.trim().toLowerCase() !== accountEmail
  ) {
    return err({
      code: "PAYMENT_METHOD_CUSTOMER_MISMATCH",
      message: "The Paystack customer does not match this account.",
    });
  }

  const providerAuthorization = provider.authorization;
  if (
    !providerAuthorization?.reusable ||
    !providerAuthorization.authorizationCode ||
    !providerAuthorization.signature
  ) {
    return err({
      code: "PAYMENT_METHOD_NOT_REUSABLE",
      message: "Paystack did not return a reusable payment authorization.",
    });
  }

  const duplicate = (
    await prisma.payment_authorizations.findMany({
      where: {
        provider: "paystack",
        signature: providerAuthorization.signature,
      },
      orderBy: { created_at: "asc" },
      take: 1,
    })
  )[0];
  if (duplicate && duplicate.customer_id !== identity.customerId) {
    return err({
      code: "PAYMENT_METHOD_CUSTOMER_MISMATCH",
      message: "This reusable authorization is already associated with another account.",
    });
  }

  let saved: {
    method: PaymentMethodProjectionRow;
    refund: {
      id: string;
      provider_reference: string | null;
    };
  };
  try {
    saved = await prisma.$transaction(async (tx) => {
      const duplicateWasDefault = Boolean(duplicate?.is_default);
      if (duplicate && duplicate.id !== authorization.id) {
        await tx.payment_authorizations.update({
          where: { id: duplicate.id },
          data: {
            signature: tombstonePaymentAuthorizationSignature(duplicate.id, duplicate.signature),
            status: "inactive",
            reusable: false,
            is_default: false,
            deactivated_at: new Date(),
          },
        });
      }

      const existingDefault = await tx.payment_authorizations.findFirst({
        where: {
          customer_id: identity.customerId,
          status: "active",
          is_default: true,
          id: { notIn: [authorization.id, ...(duplicate ? [duplicate.id] : [])] },
        },
        select: { id: true },
      });
      const shouldBeDefault = duplicateWasDefault || !existingDefault;
      if (shouldBeDefault) {
        await tx.payment_authorizations.updateMany({
          where: {
            customer_id: identity.customerId,
            is_default: true,
            id: { not: authorization.id },
          },
          data: { is_default: false },
        });
      }

      const paidAt = provider.paidAt ? new Date(provider.paidAt) : new Date();
      const method = await tx.payment_authorizations.update({
        where: { id: authorization.id },
        data: {
          authorization_code: encryptAuthorizationCode(providerAuthorization.authorizationCode),
          signature: providerAuthorization.signature as string,
          provider_customer_code: providerCustomer.customerCode,
          status: "active",
          reusable: true,
          is_default: shouldBeDefault,
          channel: providerAuthorization.channel,
          card_type: providerAuthorization.brand ?? providerAuthorization.cardType,
          bank: providerAuthorization.bank,
          last4: providerAuthorization.last4,
          exp_month: providerAuthorization.expMonth,
          exp_year: providerAuthorization.expYear,
          country_code: providerAuthorization.countryCode?.toUpperCase() ?? null,
          verified_at: new Date(),
        },
      });
      await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: "success",
          provider_transaction_id: provider.id,
          provider_customer_code: providerCustomer.customerCode,
          verified_at: new Date(),
          verification_source: "manual_verify",
          paid_at: paidAt,
          channel: provider.channel,
          gateway_response: provider.gatewayResponse,
        },
      });
      await tx.orders.update({
        where: { id: payment.orders.id },
        data: { payment_status: "paid", paid_at: paidAt, attention: null },
      });

      const existingRefund = await tx.payment_refunds.findFirst({
        where: { payment_id: payment.id },
        orderBy: { requested_at: "desc" },
      });
      const refund =
        existingRefund ??
        (await tx.payment_refunds.create({
          data: {
            payment_id: payment.id,
            requested_amount: SETUP_AMOUNT_DECIMAL,
            currency: "NGN",
            status: "pending",
            reason: "Automatic refund for payment-method setup charge.",
            requested_by_profile_id: identity.authUserId,
            metadata: {
              purpose: "payment-method-setup-refund",
              attemptId: authorization.id,
            },
          },
        }));
      return { method, refund };
    });
  } catch (error: unknown) {
    if (isAuthorizationSignatureConflict(error)) {
      return err({
        code: "PAYMENT_METHOD_CUSTOMER_MISMATCH",
        message: "This reusable authorization is already associated with another account.",
      });
    }
    throw error;
  }

  if (!saved.refund.provider_reference) {
    const claim = await prisma.payment_refunds.updateMany({
      where: {
        id: saved.refund.id,
        provider_reference: null,
        status: "pending",
      },
      data: { status: "processing", failure_reason: null },
    });
    if (claim.count === 1) {
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
            status: mapPaymentMethodRefundStatus(providerRefund.status),
            ...(providerRefund.status === "processed"
              ? {
                  processed_amount: SETUP_AMOUNT_DECIMAL,
                  processed_at: new Date(),
                }
              : {}),
          },
        });
      } catch (error: unknown) {
        await prisma.payment_refunds.update({
          where: { id: saved.refund.id },
          data: {
            status: "needs_attention",
            failure_reason:
              error instanceof Error ? error.message : "Setup refund requires attention.",
          },
        });
      }
    }
  }

  return getPaymentMethodSetup(identity, authorization.id);
}

export async function setDefaultPaymentMethod(
  identity: PaymentMethodIdentity,
  methodId: string,
): Promise<Result<PaymentMethod, PaymentMethodError>> {
  const parsed = paymentMethodIdentifierSchema.safeParse(methodId);
  if (!parsed.success) {
    return err({
      code: "PAYMENT_METHOD_INVALID",
      message: "Payment method identifier is invalid.",
    });
  }
  const method = await prisma.$transaction(async (tx) => {
    const owned = await tx.payment_authorizations.findFirst({
      where: {
        id: parsed.data,
        customer_id: identity.customerId,
        status: "active",
        reusable: true,
      },
    });
    if (!owned) return null;
    await tx.payment_authorizations.updateMany({
      where: {
        customer_id: identity.customerId,
        is_default: true,
        id: { not: owned.id },
      },
      data: { is_default: false },
    });
    return tx.payment_authorizations.update({
      where: { id: owned.id },
      data: { is_default: true },
    });
  });
  return method
    ? ok(toPaymentMethod(method))
    : err({
        code: "PAYMENT_METHOD_NOT_FOUND",
        message: "Payment method was not found.",
      });
}

export async function deletePaymentMethod(
  identity: PaymentMethodIdentity,
  methodId: string,
): Promise<Result<{ id: string; inactive: true }, PaymentMethodError>> {
  const parsed = paymentMethodIdentifierSchema.safeParse(methodId);
  if (!parsed.success) {
    return err({
      code: "PAYMENT_METHOD_INVALID",
      message: "Payment method identifier is invalid.",
    });
  }
  const method = await prisma.payment_authorizations.findFirst({
    where: { id: parsed.data, customer_id: identity.customerId },
  });
  if (!method) {
    return err({
      code: "PAYMENT_METHOD_NOT_FOUND",
      message: "Payment method was not found.",
    });
  }
  if (method.status === "inactive") {
    return ok({ id: method.id, inactive: true });
  }

  if (method.status === "active" && method.reusable) {
    await deactivateAuthorization(decryptAuthorizationCode(method.authorization_code));
  }
  await prisma.payment_authorizations.update({
    where: { id: method.id },
    data: {
      signature: tombstonePaymentAuthorizationSignature(method.id, method.signature),
      status: "inactive",
      reusable: false,
      is_default: false,
      deactivated_at: new Date(),
    },
  });
  return ok({ id: method.id, inactive: true });
}

function toPrismaJsonObject(value: object): Prisma.InputJsonObject {
  const output: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue !== undefined) output[key] = toPrismaJsonValue(nestedValue);
  }
  return output;
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JSON numbers must be finite.");
    return value;
  }
  if (Array.isArray(value)) return value.map(toPrismaJsonValue);
  if (typeof value === "object") return toPrismaJsonObject(value);
  throw new TypeError(`Unsupported JSON value: ${typeof value}`);
}

import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { StaffSession } from "@/modules/auth/server/session";
import { settlePaystackEvent } from "@/modules/checkout/server/settle-payment";
import type { CheckoutError, CheckoutStatus, PaystackSettlementEvent } from "@/modules/checkout/types";
import { adminOrderInclude, mapAdminOrderRow } from "@/modules/orders/server/mappers";
import type { OfflineSalePaymentState } from "@/modules/orders/offline-sale-contract";
import type { SalesActionError } from "@/modules/orders/types";
import { PaystackProviderError, verifyTransaction } from "@/modules/payments/server/paystack";

export async function getOfflineSalePayment(
  _actor: StaffSession,
  orderNumber: string,
): Promise<Result<OfflineSalePaymentState, SalesActionError>> {
  const payment = await findOfflineSalePayment(orderNumber);
  if (!payment) {
    return err({
      code: "order-not-found",
      message: "The in-person order or its Paystack payment attempt was not found.",
      orderId: orderNumber,
    });
  }
  return ok({
    order: mapAdminOrderRow(payment.orders),
    paymentId: payment.id,
    reference: payment.reference,
    status: normalizeLocalStatus(payment.status),
    replayed: payment.status === "success" && payment.orders.payment_status === "paid",
    message:
      payment.status === "success"
        ? "Paystack payment is confirmed."
        : "Paystack payment has not been confirmed yet.",
  });
}

export async function verifyOfflineSalePayment(
  actor: StaffSession,
  orderNumber: string,
): Promise<Result<OfflineSalePaymentState, SalesActionError>> {
  const payment = await findOfflineSalePayment(orderNumber);
  if (!payment) {
    return err({
      code: "order-not-found",
      message: "The in-person order or its Paystack payment attempt was not found.",
      orderId: orderNumber,
    });
  }

  let provider: Awaited<ReturnType<typeof verifyTransaction>>;
  try {
    provider = await verifyTransaction(payment.reference);
  } catch (error) {
    return err({
      code: "paystack-initialization-failed",
      message:
        error instanceof PaystackProviderError
          ? `Paystack payment could not be verified. ${error.message}`
          : "Paystack payment could not be verified.",
      orderId: orderNumber,
    });
  }
  if (provider.reference !== payment.reference) {
    return err({
      code: "invalid-payment-state",
      message: "Paystack returned a different payment reference.",
      orderId: orderNumber,
    });
  }

  const settlement = await settlePaystackEvent({
    source: "manual_verify",
    providerTransactionId: provider.id,
    reference: provider.reference,
    status: normalizeProviderStatus(provider.status),
    amountMinor: provider.amountMinor,
    currency: provider.currency,
    customerEmail: provider.customer?.email ?? null,
    paidAt: provider.paidAt,
    channel: provider.channel,
    gatewayResponse: provider.gatewayResponse,
    failureReason: provider.message,
  });
  if (!settlement.ok) return err(mapSettlementError(settlement.error, orderNumber));

  const current = await getOfflineSalePayment(actor, orderNumber);
  if (!current.ok) return current;
  return ok({
    ...current.value,
    replayed: settlement.value.replayed,
    message:
      settlement.value.status === "success"
        ? "In-person Paystack payment confirmed and reserved stock committed."
        : `Paystack payment is ${settlement.value.status.replaceAll("_", " ")}.`,
  });
}

async function findOfflineSalePayment(orderNumber: string) {
  return prisma.payments.findFirst({
    where: {
      orders: { order_number: orderNumber, source: "offline-sale" },
      provider: "paystack",
    },
    orderBy: { created_at: "desc" },
    include: { orders: { include: adminOrderInclude } },
  });
}

function normalizeLocalStatus(status: string): CheckoutStatus {
  switch (status) {
    case "initializing":
    case "initialized":
    case "pending":
    case "success":
    case "failed":
    case "abandoned":
    case "reversed":
    case "review_required":
      return status;
    default:
      return "pending";
  }
}

function normalizeProviderStatus(status: string): PaystackSettlementEvent["status"] {
  switch (status) {
    case "success":
    case "failed":
    case "abandoned":
    case "reversed":
      return status;
    default:
      return "pending";
  }
}

function mapSettlementError(error: CheckoutError, orderNumber: string): SalesActionError {
  switch (error.code) {
    case "PAYMENT_NOT_FOUND":
      return {
        code: "order-not-found",
        message: error.message,
        orderId: orderNumber,
      };
    case "PAYMENT_REFERENCE_MISMATCH":
      return {
        code: "invalid-payment-state",
        message: error.message,
        orderId: orderNumber,
      };
    default:
      return {
        code: "invalid-payment-state",
        message: error.message,
        orderId: orderNumber,
      };
  }
}

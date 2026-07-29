import "server-only";

import { err, type Result } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { paymentIdentifierSchema } from "@/modules/checkout/schema";
import { settlePaystackEvent } from "@/modules/checkout/server/settle-payment";
import type {
  CheckoutError,
  CheckoutIdentity,
  PaymentSettlement,
  PaystackSettlementEvent,
} from "@/modules/checkout/types";
import { verifyTransaction } from "@/modules/payments/server/paystack";

export async function verifyCheckoutPayment(
  identity: CheckoutIdentity,
  paymentId: string,
): Promise<Result<PaymentSettlement, CheckoutError>> {
  const parsedId = paymentIdentifierSchema.safeParse(paymentId);
  if (!parsedId.success) {
    return err({ code: "CHECKOUT_INVALID", message: "Payment identifier is invalid." });
  }
  const payment = await prisma.payments.findFirst({
    where: { id: parsedId.data, orders: { customer_id: identity.customerId } },
    select: { id: true, reference: true },
  });
  if (!payment) {
    return err({ code: "RESOURCE_NOT_OWNED", message: "Payment was not found." });
  }
  const provider = await verifyTransaction(payment.reference);
  if (provider.reference !== payment.reference) {
    return err({
      code: "PAYMENT_REFERENCE_MISMATCH",
      message: "Paystack returned a different payment reference.",
      paymentId: payment.id,
    });
  }
  const status = normalizeProviderStatus(provider.status);
  return settlePaystackEvent({
    source: "manual_verify",
    providerTransactionId: provider.id,
    reference: provider.reference,
    status,
    amountMinor: provider.amountMinor,
    currency: provider.currency,
    customerEmail: provider.customer?.email ?? null,
    paidAt: provider.paidAt,
    channel: provider.channel,
    gatewayResponse: provider.gatewayResponse,
    failureReason: provider.message,
  });
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

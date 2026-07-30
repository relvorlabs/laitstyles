import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { PaystackSettlementEvent } from "@/modules/checkout/types";
import { PaystackConfigurationError } from "@/modules/payments/server/paystack/client";
import { mapPaystackDispute } from "@/modules/payments/server/paystack/disputes";
import { mapPaystackRefund } from "@/modules/payments/server/paystack/refunds";
import {
  paystackDisputeSchema,
  paystackRefundSchema,
  paystackTransactionSchema,
} from "@/modules/payments/server/paystack/schemas";
import { mapPaystackTransaction } from "@/modules/payments/server/paystack/transactions";
import { normalizeTransferEvent } from "@/modules/payments/server/paystack/transfers";

const paystackEventEnvelopeSchema = z.object({
  event: z.string().trim().min(1),
  data: z.unknown(),
});

const supportedChargeEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("charge.success"), data: paystackTransactionSchema }),
  z.object({ event: z.literal("charge.failed"), data: paystackTransactionSchema }),
  z.object({ event: z.literal("charge.abandoned"), data: paystackTransactionSchema }),
  z.object({ event: z.literal("charge.reversed"), data: paystackTransactionSchema }),
]);

const supportedRefundEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("refund.pending"), data: paystackRefundSchema }),
  z.object({ event: z.literal("refund.processing"), data: paystackRefundSchema }),
  z.object({ event: z.literal("refund.processed"), data: paystackRefundSchema }),
  z.object({ event: z.literal("refund.failed"), data: paystackRefundSchema }),
]);

const supportedDisputeEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("charge.dispute.create"), data: paystackDisputeSchema }),
  z.object({ event: z.literal("charge.dispute.remind"), data: paystackDisputeSchema }),
  z.object({ event: z.literal("charge.dispute.resolve"), data: paystackDisputeSchema }),
]);

const supportedChargeEvents = new Set([
  "charge.success",
  "charge.failed",
  "charge.abandoned",
  "charge.reversed",
]);
const supportedRefundEvents = new Set([
  "refund.pending",
  "refund.processing",
  "refund.processed",
  "refund.failed",
]);
const supportedDisputeEvents = new Set([
  "charge.dispute.create",
  "charge.dispute.remind",
  "charge.dispute.resolve",
]);
const supportedTransferEvents = new Set([
  "transfer.success",
  "transfer.failed",
  "transfer.reversed",
]);

export class PaystackWebhookSignatureError extends Error {
  constructor() {
    super("Paystack webhook signature is invalid.");
    this.name = "PaystackWebhookSignatureError";
  }
}

export function verifyWebhookSignature(rawBody: string | Uint8Array, signature: string): void {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) throw new PaystackConfigurationError();

  const expected = createHmac("sha512", secretKey).update(rawBody).digest();
  const hasValidFormat = /^[a-f\d]{128}$/i.test(signature);
  const received = hasValidFormat ? Buffer.from(signature, "hex") : Buffer.alloc(expected.length);
  const matches = timingSafeEqual(expected, received);
  if (!hasValidFormat || !matches) throw new PaystackWebhookSignatureError();
}

export function parsePaystackEventEnvelope(payload: unknown) {
  return paystackEventEnvelopeSchema.parse(payload);
}

export function isSupportedPaystackChargeEvent(event: string) {
  return supportedChargeEvents.has(event);
}

export function isSupportedPaystackRefundEvent(event: string) {
  return supportedRefundEvents.has(event);
}

export function isSupportedPaystackDisputeEvent(event: string) {
  return supportedDisputeEvents.has(event);
}

export function isSupportedPaystackTransferEvent(event: string) {
  return supportedTransferEvents.has(event);
}

export function isSupportedPaystackFinancialEvent(event: string) {
  return (
    isSupportedPaystackChargeEvent(event) ||
    isSupportedPaystackRefundEvent(event) ||
    isSupportedPaystackDisputeEvent(event) ||
    isSupportedPaystackTransferEvent(event)
  );
}

export function parsePaystackChargeEvent(payload: unknown): {
  event: z.infer<typeof supportedChargeEventSchema>["event"];
  settlement: PaystackSettlementEvent;
} {
  const parsed = supportedChargeEventSchema.parse(payload);
  const transaction = mapPaystackTransaction(parsed.data);
  const status = parsed.event.slice("charge.".length) as PaystackSettlementEvent["status"];
  return {
    event: parsed.event,
    settlement: {
      source: "webhook",
      providerTransactionId: transaction.id,
      reference: transaction.reference,
      status,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      customerEmail: transaction.customer?.email ?? null,
      paidAt: transaction.paidAt,
      channel: transaction.channel,
      gatewayResponse: transaction.gatewayResponse,
      failureReason: transaction.message,
    },
  };
}

export function parsePaystackRefundEvent(payload: unknown) {
  const parsed = supportedRefundEventSchema.parse(payload);
  return { event: parsed.event, refund: mapPaystackRefund(parsed.data) };
}

export function parsePaystackDisputeEvent(payload: unknown) {
  const parsed = supportedDisputeEventSchema.parse(payload);
  return { event: parsed.event, dispute: mapPaystackDispute(parsed.data) };
}

export function parsePaystackTransferEvent(payload: unknown) {
  return normalizeTransferEvent(payload);
}

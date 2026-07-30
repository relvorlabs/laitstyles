import "server-only";

import { createHash } from "node:crypto";
import { ApiError } from "@/lib/errors/api-error";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { settlePaystackEvent } from "@/modules/checkout/server/settle-payment";
import { reconcileOrderDisputeState } from "@/modules/payments/server/dispute-order-state";
import { applyDisputeProviderState } from "@/modules/payments/server/disputes";
import {
  isSupportedPaystackChargeEvent,
  isSupportedPaystackDisputeEvent,
  isSupportedPaystackFinancialEvent,
  isSupportedPaystackRefundEvent,
  parsePaystackChargeEvent,
  parsePaystackDisputeEvent,
  parsePaystackEventEnvelope,
  parsePaystackRefundEvent,
  verifyWebhookSignature,
} from "@/modules/payments/server/paystack";
import { applyRefundWebhookState } from "@/modules/payments/server/refund-webhooks";

type PaystackWebhookInput = {
  rawBody: string;
  signature: string | null;
};

export type PaystackWebhookResult = {
  accepted: true;
  deferred?: true;
  duplicate?: boolean;
  processing?: true;
  status?: string;
  resource?: "payment" | "refund" | "dispute";
};

type FinancialEventFailure = {
  ok: false;
  error: { code: string; message: string };
};

type FinancialEventSuccess = {
  ok: true;
  status: string;
  resource: "payment" | "refund" | "dispute";
  replayed: boolean;
};

type FinancialEventOutcome = FinancialEventFailure | FinancialEventSuccess;

export async function processPaystackWebhook({
  rawBody,
  signature,
}: PaystackWebhookInput): Promise<PaystackWebhookResult> {
  const normalizedSignature = signature?.trim();
  if (!normalizedSignature) {
    throw new ApiError({
      code: "PAYSTACK_SIGNATURE_REQUIRED",
      message: "The Paystack signature is required.",
      status: 401,
    });
  }

  verifySignature(rawBody, normalizedSignature);
  const payload = parseJsonPayload(rawBody);
  const envelope = parsePaystackEventEnvelope(payload);
  const eventId = createHash("sha256").update(rawBody).digest("hex");
  const inbox = await persistWebhookEnvelope({
    eventId,
    eventType: envelope.event,
    payload,
    signature: normalizedSignature,
  });

  if (!isSupportedPaystackFinancialEvent(envelope.event)) {
    return { accepted: true, deferred: true };
  }
  if (inbox.status === "processed") {
    return { accepted: true, duplicate: true };
  }

  const claimed = await claimWebhookEvent(inbox.id);
  if (!claimed) {
    return { accepted: true, duplicate: true, processing: true };
  }

  try {
    const outcome = await processFinancialEvent(envelope.event, payload);
    if (!outcome.ok) {
      await failWebhookEvent(inbox.id, `${outcome.error.code}: ${outcome.error.message}`);
      throw new ApiError({
        code: outcome.error.code,
        message: outcome.error.message,
        status: isMissingFinancialRecord(outcome.error.code) ? 503 : 409,
      });
    }

    await prisma.provider_webhook_events.update({
      where: { id: inbox.id },
      data: { status: "processed", processed_at: new Date(), last_error: null },
    });
    return {
      accepted: true,
      duplicate: outcome.replayed,
      status: outcome.status,
      resource: outcome.resource,
    };
  } catch (error: unknown) {
    if (!(error instanceof ApiError)) {
      await failWebhookEvent(
        inbox.id,
        error instanceof Error ? error.message : "Webhook processing failed.",
      );
    }
    throw error;
  }
}

function verifySignature(rawBody: string, signature: string): void {
  try {
    verifyWebhookSignature(rawBody, signature);
  } catch (cause: unknown) {
    throw new ApiError({
      code: "PAYSTACK_SIGNATURE_INVALID",
      message: "The Paystack webhook signature is invalid.",
      status: 401,
      cause,
    });
  }
}

function parseJsonPayload(rawBody: string): Prisma.InputJsonValue {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (cause: unknown) {
    throw new ApiError({
      code: "INVALID_JSON",
      message: "The webhook body contains invalid JSON.",
      status: 400,
      cause,
    });
  }
  if (!isJsonValue(payload)) {
    throw new ApiError({
      code: "INVALID_JSON",
      message: "The webhook body must contain a JSON value.",
      status: 400,
    });
  }
  return payload;
}

function isJsonValue(value: unknown): value is Prisma.InputJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object") return false;
  return Object.values(value).every(isJsonValue);
}

async function persistWebhookEnvelope(input: {
  eventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  signature: string;
}) {
  return prisma.provider_webhook_events.upsert({
    where: {
      provider_event_id: { provider: "paystack", event_id: input.eventId },
    },
    update: { attempts: { increment: 1 } },
    create: {
      provider: "paystack",
      event_type: input.eventType,
      event_id: input.eventId,
      signature: input.signature,
      payload: input.payload,
      status: "received",
      attempts: 1,
    },
  });
}

async function claimWebhookEvent(inboxId: string): Promise<boolean> {
  const claim = await prisma.provider_webhook_events.updateMany({
    where: { id: inboxId, status: { in: ["received", "failed"] } },
    data: { status: "processing", last_error: null },
  });
  return claim.count === 1;
}

async function failWebhookEvent(inboxId: string, message: string): Promise<void> {
  await prisma.provider_webhook_events.update({
    where: { id: inboxId },
    data: { status: "failed", last_error: message },
  });
}

async function processFinancialEvent(
  eventName: string,
  payload: unknown,
): Promise<FinancialEventOutcome> {
  if (isSupportedPaystackChargeEvent(eventName)) {
    const event = parsePaystackChargeEvent(payload);
    const result = await settlePaystackEvent(event.settlement);
    return result.ok
      ? {
          ok: true,
          status: result.value.status,
          resource: "payment",
          replayed: result.value.replayed,
        }
      : { ok: false, error: result.error };
  }

  if (isSupportedPaystackRefundEvent(eventName)) {
    const event = parsePaystackRefundEvent(payload);
    const result = await applyRefundWebhookState(event.refund);
    return result.ok
      ? { ok: true, status: result.value.status, resource: "refund", replayed: false }
      : { ok: false, error: result.error };
  }

  if (isSupportedPaystackDisputeEvent(eventName)) {
    const event = parsePaystackDisputeEvent(payload);
    const result = await applyDisputeProviderState({ provider: event.dispute });
    if (!result.ok) return { ok: false, error: result.error };
    const normalized = await reconcileOrderDisputeState(result.value);
    return { ok: true, status: normalized.status, resource: "dispute", replayed: false };
  }

  throw new ApiError({
    code: "PAYSTACK_EVENT_UNSUPPORTED",
    message: "The Paystack event is not supported.",
    status: 422,
  });
}

function isMissingFinancialRecord(code: string): boolean {
  return (
    code === "PAYMENT_NOT_FOUND" ||
    code === "REFUND_NOT_FOUND" ||
    code === "DISPUTE_PAYMENT_NOT_FOUND"
  );
}

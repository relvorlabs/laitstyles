import { createHash } from "node:crypto";
import { ApiError } from "@/lib/errors/api-error";
import { handleApiRequest } from "@/lib/http/server";
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

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature")?.trim();
    if (!signature) {
      throw new ApiError({
        code: "PAYSTACK_SIGNATURE_REQUIRED",
        message: "The Paystack signature is required.",
        status: 401,
      });
    }

    try {
      verifyWebhookSignature(rawBody, signature);
    } catch (cause) {
      throw new ApiError({
        code: "PAYSTACK_SIGNATURE_INVALID",
        message: "The Paystack webhook signature is invalid.",
        status: 401,
        cause,
      });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch (cause) {
      throw new ApiError({
        code: "INVALID_JSON",
        message: "The webhook body contains invalid JSON.",
        status: 400,
        cause,
      });
    }

    const envelope = parsePaystackEventEnvelope(payload);
    const eventId = createHash("sha256").update(rawBody).digest("hex");
    const uniqueEvent = {
      provider_event_id: { provider: "paystack" as const, event_id: eventId },
    };

    const inbox = await prisma.provider_webhook_events.upsert({
      where: uniqueEvent,
      update: { attempts: { increment: 1 } },
      create: {
        provider: "paystack",
        event_type: envelope.event,
        event_id: eventId,
        signature,
        payload: payload as Prisma.InputJsonValue,
        status: "received",
        attempts: 1,
      },
    });

    if (!isSupportedPaystackFinancialEvent(envelope.event)) {
      return { data: { accepted: true, deferred: true }, headers: noStore };
    }
    if (inbox.status === "processed") {
      return { data: { accepted: true, duplicate: true }, headers: noStore };
    }

    const claim = await prisma.provider_webhook_events.updateMany({
      where: {
        id: inbox.id,
        status: { in: ["received", "failed"] },
      },
      data: {
        status: "processing",
        last_error: null,
      },
    });
    if (claim.count !== 1) {
      return {
        data: { accepted: true, duplicate: true, processing: true },
        headers: noStore,
      };
    }

    try {
      const outcome = await processFinancialEvent(envelope.event, payload);
      if (!outcome.ok) {
        await prisma.provider_webhook_events.update({
          where: { id: inbox.id },
          data: {
            status: "failed",
            last_error: `${outcome.error.code}: ${outcome.error.message}`,
          },
        });
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
        data: {
          accepted: true,
          duplicate: outcome.replayed,
          status: outcome.status,
          resource: outcome.resource,
        },
        headers: noStore,
      };
    } catch (error) {
      if (!(error instanceof ApiError)) {
        await prisma.provider_webhook_events.update({
          where: { id: inbox.id },
          data: {
            status: "failed",
            last_error: error instanceof Error ? error.message : "Webhook processing failed.",
          },
        });
      }
      throw error;
    }
  });
}

async function processFinancialEvent(eventName: string, payload: unknown) {
  if (isSupportedPaystackChargeEvent(eventName)) {
    const event = parsePaystackChargeEvent(payload);
    const result = await settlePaystackEvent(event.settlement);
    return result.ok
      ? {
          ok: true as const,
          status: result.value.status,
          resource: "payment" as const,
          replayed: result.value.replayed,
        }
      : { ok: false as const, error: result.error };
  }

  if (isSupportedPaystackRefundEvent(eventName)) {
    const event = parsePaystackRefundEvent(payload);
    const result = await applyRefundWebhookState(event.refund);
    return result.ok
      ? {
          ok: true as const,
          status: result.value.status,
          resource: "refund" as const,
          replayed: false,
        }
      : { ok: false as const, error: result.error };
  }

  if (isSupportedPaystackDisputeEvent(eventName)) {
    const event = parsePaystackDisputeEvent(payload);
    const result = await applyDisputeProviderState({ provider: event.dispute });
    if (!result.ok) return { ok: false as const, error: result.error };
    await reconcileOrderDisputeState(result.value);
    return {
      ok: true as const,
      status: result.value.status,
      resource: "dispute" as const,
      replayed: false,
    };
  }

  throw new ApiError({
    code: "PAYSTACK_EVENT_UNSUPPORTED",
    message: "The Paystack event is not supported.",
    status: 422,
  });
}

function isMissingFinancialRecord(code: string) {
  return (
    code === "PAYMENT_NOT_FOUND" ||
    code === "REFUND_NOT_FOUND" ||
    code === "DISPUTE_PAYMENT_NOT_FOUND"
  );
}

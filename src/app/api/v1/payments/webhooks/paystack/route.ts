import { createHash } from "node:crypto";
import { ApiError } from "@/lib/errors/api-error";
import { handleApiRequest } from "@/lib/http/server";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { settlePaystackEvent } from "@/modules/checkout/server/settle-payment";
import {
  isSupportedPaystackChargeEvent,
  parsePaystackChargeEvent,
  parsePaystackEventEnvelope,
  verifyWebhookSignature,
} from "@/modules/payments/server/paystack";

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

    if (!isSupportedPaystackChargeEvent(envelope.event)) {
      await prisma.provider_webhook_events.upsert({
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
      return { data: { accepted: true, deferred: true }, headers: noStore };
    }

    const event = parsePaystackChargeEvent(payload);
    const inbox = await prisma.provider_webhook_events.upsert({
      where: uniqueEvent,
      update: { attempts: { increment: 1 } },
      create: {
        provider: "paystack",
        event_type: event.event,
        event_id: eventId,
        signature,
        payload: payload as Prisma.InputJsonValue,
        status: "received",
        attempts: 1,
      },
    });

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
      const result = await settlePaystackEvent(event.settlement);
      if (!result.ok) {
        await prisma.provider_webhook_events.update({
          where: { id: inbox.id },
          data: {
            status: "failed",
            last_error: `${result.error.code}: ${result.error.message}`,
          },
        });
        throw new ApiError({
          code: result.error.code,
          message: result.error.message,
          status: result.error.code === "PAYMENT_NOT_FOUND" ? 503 : 409,
        });
      }

      await prisma.provider_webhook_events.update({
        where: { id: inbox.id },
        data: { status: "processed", processed_at: new Date(), last_error: null },
      });
      return {
        data: { accepted: true, duplicate: result.value.replayed, status: result.value.status },
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

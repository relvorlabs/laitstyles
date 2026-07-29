import "server-only";

import { Prisma, prisma } from "@/lib/prisma";
import type { ProviderEventInput, ProviderEventReceipt } from "@/modules/operations/types";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Durable webhook inbox. Persists the provider, its dedupe key (`event_id`),
 * event type, signature and validated payload before any business dispatch,
 * using the unique `(provider, event_id)` constraint to guarantee a
 * redelivered webhook is never dispatched twice:
 *
 * - `new`: first receipt — safe to dispatch.
 * - `duplicate`: a redelivery with a matching signature — must not dispatch
 *   again.
 * - `conflict`: the same dedupe key arrived with a different signature — a
 *   suspicious mismatch that must not dispatch.
 */
export async function receiveProviderEvent(
  input: ProviderEventInput,
): Promise<ProviderEventReceipt> {
  try {
    const created = await prisma.provider_webhook_events.create({
      data: {
        provider: input.provider,
        event_id: input.eventId,
        event_type: input.eventType,
        signature: input.signature,
        payload: input.payload as Prisma.InputJsonValue,
        status: "received",
      },
    });
    return { status: "new", id: created.id };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  const existing = await prisma.provider_webhook_events.findUniqueOrThrow({
    where: { provider_event_id: { provider: input.provider, event_id: input.eventId } },
  });

  if (existing.signature !== input.signature) {
    return { status: "conflict", id: existing.id };
  }

  await prisma.provider_webhook_events.update({
    where: { id: existing.id },
    data: { attempts: { increment: 1 } },
  });

  return { status: "duplicate", id: existing.id };
}

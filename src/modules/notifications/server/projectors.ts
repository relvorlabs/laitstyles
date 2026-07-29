import "server-only";

import { Prisma, prisma } from "@/lib/prisma";
import type { NotificationEvent } from "@/modules/notifications/types";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Projects one outbox notification event into the customer's stored
 * notification feed. Idempotent on `event_key` (unique wherever not null):
 * a redelivered outbox message — the reason this consumes an outbox in the
 * first place — creates no second row.
 *
 * Checks for the existing row before writing so a repeated sequential
 * delivery never calls `create` a second time; the unique constraint on
 * `event_key` remains the safety net for two genuinely concurrent
 * projections racing each other. */
export async function projectNotification(event: NotificationEvent): Promise<void> {
  const existing = await prisma.notifications.findUnique({
    where: { event_key: event.eventKey },
    select: { id: true },
  });
  if (existing) return;

  try {
    await prisma.notifications.create({
      data: {
        customer_id: event.customerId,
        category: event.category,
        title: event.title,
        body: event.body ?? null,
        data: (event.data ?? {}) as Prisma.InputJsonValue,
        event_key: event.eventKey,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    // A concurrent projector won the race for this event_key: already projected.
  }
}

import "server-only";

import type { Prisma } from "@/lib/prisma";
import type { OutboxMessageInput, OutboxMessageReceipt } from "@/modules/operations/types";

/**
 * Enqueues a non-critical follow-up (receipt, notification, reconciliation
 * fan-out) through the caller's transaction client, so the business fact and
 * the request to notify commit — or roll back — together. A separate
 * dispatcher later polls `outbox_messages` for `pending` rows; it is not part
 * of this module.
 */
export async function enqueueOutbox(
  tx: Prisma.TransactionClient,
  message: OutboxMessageInput,
): Promise<OutboxMessageReceipt> {
  const created = await tx.outbox_messages.create({
    data: {
      topic: message.topic,
      payload: message.payload as Prisma.InputJsonValue,
      status: "pending",
      ...(message.availableAt ? { available_at: message.availableAt } : {}),
    },
  });
  return { id: created.id };
}

import "server-only";

import type { Prisma } from "@/lib/prisma";

export async function closeCancelledCheckoutResources(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    actorProfileId?: string;
    requestedBy: "customer" | "staff";
  },
): Promise<void> {
  const now = new Date();

  await tx.holds.updateMany({
    where: { order_id: input.orderId, status: "active" },
    data: {
      status: "cancelled",
      payment_progress: "failed",
      released_at: now,
      note: `Checkout resources closed after ${input.requestedBy} cancellation.`,
    },
  });

  await tx.payments.updateMany({
    where: { order_id: input.orderId, status: { not: "success" } },
    data: {
      access_code: null,
      failure_code: "ORDER_CANCELLED",
      failure_reason: `Order cancelled by ${input.requestedBy} before verified payment.`,
    },
  });

  await tx.order_payment_events.create({
    data: {
      order_id: input.orderId,
      kind: "note",
      actor_profile_id: input.actorProfileId,
      note: "Checkout recovery and provider access were closed because the order was cancelled.",
      metadata: { requestedBy: input.requestedBy },
    },
  });
}

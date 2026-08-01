import "server-only";

import { prisma } from "@/lib/prisma";
import { applyOperationalStockMutation } from "@/modules/inventory/server/operational-stock";
import { closeCancelledCheckoutResources } from "@/modules/orders/server/cancel-checkout-payment";

const BATCH_SIZE = 50;

export type ExpireAbandonedCheckoutsResult = {
  ordersCancelled: number;
  standaloneHoldsReleased: number;
};

/**
 * Releases stock for holds whose `expires_at` has passed. A hold created for
 * checkout carries an `order_id`; that order (still pending/unfulfilled) is
 * cancelled the same way a customer-initiated cancellation would, so the
 * checkout is closed and stock returns to `available` even if the customer
 * never explicitly cancelled or came back to the site.
 */
export async function expireAbandonedCheckouts(
  now: Date = new Date(),
): Promise<ExpireAbandonedCheckoutsResult> {
  let ordersCancelled = 0;
  let standaloneHoldsReleased = 0;

  const expiredOrderIds = await prisma.holds.findMany({
    where: { status: "active", expires_at: { lte: now }, order_id: { not: null } },
    distinct: ["order_id"],
    select: { order_id: true },
    take: BATCH_SIZE,
  });

  for (const { order_id } of expiredOrderIds) {
    if (!order_id) continue;
    const cancelled = await cancelExpiredOrder(order_id, now);
    if (cancelled) ordersCancelled += 1;
  }

  const expiredStandaloneHolds = await prisma.holds.findMany({
    where: { status: "active", expires_at: { lte: now }, order_id: null },
    select: { id: true, product_id: true, variant_id: true, quantity: true },
    take: BATCH_SIZE,
  });

  for (const hold of expiredStandaloneHolds) {
    const released = await releaseExpiredStandaloneHold(hold, now);
    if (released) standaloneHoldsReleased += 1;
  }

  return { ordersCancelled, standaloneHoldsReleased };
}

async function cancelExpiredOrder(orderId: string, now: Date): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        order_number: true,
        payment_status: true,
        fulfilment_status: true,
        order_lines: {
          select: {
            id: true,
            product_id: true,
            variant_id: true,
            quantity: true,
            stock_state: true,
          },
        },
      },
    });
    if (!order) return false;
    if (order.payment_status !== "pending" || order.fulfilment_status !== "unfulfilled") {
      return false;
    }

    for (const line of order.order_lines) {
      if (line.stock_state !== "reserved" && line.stock_state !== "committed") continue;
      await applyOperationalStockMutation(tx, {
        productId: line.product_id,
        ...(line.variant_id ? { variantId: line.variant_id } : {}),
        quantity: line.quantity,
        kind: line.stock_state === "reserved" ? "release-reserved" : "release-committed",
        note: `${order.order_number} auto-cancelled after checkout hold expired.`,
        relatedOrderId: order.id,
        metadata: {
          previousStatus: order.fulfilment_status,
          nextStatus: "cancelled",
          orderLineId: line.id,
        },
      });
      await tx.order_lines.update({
        where: { id: line.id },
        data: { stock_state: "released" },
      });
    }

    await tx.orders.update({
      where: { id: order.id },
      data: { payment_status: "cancelled", fulfilment_status: "cancelled", attention: null },
    });
    await closeCancelledCheckoutResources(tx, { orderId: order.id, requestedBy: "system" });
    await tx.order_timeline_events.create({
      data: {
        order_id: order.id,
        status: "cancelled",
        note: "Checkout hold expired without payment; order auto-cancelled and stock released.",
        metadata: { requestedBy: "system" },
      },
    });
    await tx.activity_events.create({
      data: {
        kind: "order",
        title: `${order.order_number} auto-cancelled`,
        detail: "Checkout hold expired before payment. Stock returned to availability.",
        order_id: order.id,
      },
    });

    return true;
  });
}

async function releaseExpiredStandaloneHold(
  hold: { id: string; product_id: string; variant_id: string | null; quantity: number },
  now: Date,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.holds.updateMany({
      where: { id: hold.id, status: "active", expires_at: { lte: now } },
      data: { status: "expired", released_at: now },
    });
    if (claimed.count !== 1) return false;

    await applyOperationalStockMutation(tx, {
      productId: hold.product_id,
      ...(hold.variant_id ? { variantId: hold.variant_id } : {}),
      quantity: hold.quantity,
      kind: "release-reserved",
      note: "Hold expired before checkout began.",
      relatedHoldId: hold.id,
      metadata: { operation: "hold-expiry-sweep" },
    });
    return true;
  });
}

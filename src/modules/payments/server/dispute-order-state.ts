import "server-only";

import { prisma } from "@/lib/prisma";
import type { DisputeProjection } from "@/modules/payments/server/disputes";

export async function reconcileOrderDisputeState(dispute: DisputeProjection) {
  const order = await prisma.orders.findUnique({
    where: { id: dispute.orderId },
    select: {
      id: true,
      total: true,
      refunded_amount: true,
      payments: {
        where: { id: dispute.paymentId },
        select: { status: true },
        take: 1,
      },
    },
  });
  if (!order) return;

  const unresolved = await prisma.payment_disputes.count({
    where: {
      payments: { order_id: order.id },
      status: { in: ["awaiting_evidence", "pending"] },
    },
  });
  if (unresolved > 0) {
    await prisma.orders.update({
      where: { id: order.id },
      data: {
        payment_status: "review_required",
        attention: "A Paystack dispute requires review.",
      },
    });
    return;
  }

  const paymentSucceeded = order.payments[0]?.status === "success";
  const paymentStatus = order.refunded_amount.gte(order.total)
    ? "refunded"
    : order.refunded_amount.gt(0)
      ? "partially_refunded"
      : paymentSucceeded
        ? "paid"
        : "review_required";
  await prisma.orders.update({
    where: { id: order.id },
    data: {
      payment_status: paymentStatus,
      attention: paymentStatus === "review_required" ? "Payment state needs reconciliation." : null,
    },
  });
}

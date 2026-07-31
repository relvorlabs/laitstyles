import "server-only";

import { prisma } from "@/lib/prisma";
import type { DisputeProjection } from "@/modules/payments/server/disputes";

export async function reconcileOrderDisputeState(
  dispute: DisputeProjection,
): Promise<DisputeProjection> {
  const normalized =
    dispute.providerStatus === "archived" && dispute.status !== "resolved"
      ? await archiveLocalDispute(dispute)
      : dispute;
  const order = await prisma.orders.findUnique({
    where: { id: normalized.orderId },
    select: {
      id: true,
      total: true,
      refunded_amount: true,
      payments: {
        where: { id: normalized.paymentId },
        select: { status: true },
        take: 1,
      },
    },
  });
  if (!order) return normalized;

  const unresolved = await prisma.payment_disputes.count({
    where: {
      payments: { order_id: order.id },
      status: { in: ["awaiting_evidence", "pending"] },
      provider_status: { not: "archived" },
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
    return normalized;
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
  return normalized;
}

async function archiveLocalDispute(dispute: DisputeProjection): Promise<DisputeProjection> {
  const resolvedAt = dispute.resolvedAt ?? new Date().toISOString();
  await prisma.payment_disputes.updateMany({
    where: { id: dispute.id, provider_status: "archived", status: { not: "resolved" } },
    data: { status: "resolved", resolved_at: new Date(resolvedAt) },
  });
  return { ...dispute, status: "resolved", resolvedAt };
}

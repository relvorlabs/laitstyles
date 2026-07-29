import "server-only";

import { prisma } from "@/lib/prisma";
import type { DeletionBlockerReason } from "@/modules/account-lifecycle/types";

/** Completed export downloads expire 7 days after generation (approved spec,
 * §4.3). */
export const EXPORT_EXPIRY_DAYS = 7;

/** A deletion request may be cancelled for 14 days before it executes
 * (approved spec, §4.3). */
export const DELETION_CANCELLATION_DAYS = 14;

const ACTIVE_ORDER_FULFILMENT_STATUSES = [
  "unfulfilled",
  "processing",
  "ready_for_dispatch",
  "dispatched",
] as const;
const ACTIVE_ORDER_PAYMENT_STATUSES = ["pending", "processing", "review_required"] as const;
const OPEN_RETURN_STATUSES = ["requested", "approved", "received", "inspecting"] as const;
const PENDING_REFUND_STATUSES = ["pending", "processing", "needs_attention"] as const;
const OPEN_DISPUTE_STATUSES = ["awaiting_evidence", "pending"] as const;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}

/** Finds the first reason (in priority order) an account deletion request
 * must be blocked for, per the approved policy: active orders, open
 * returns, pending refunds, open disputes or an unresolved payment-method
 * verification payout. Returns `null` when nothing blocks deletion. */
export async function findActiveDeletionBlocker(
  customerId: string,
): Promise<DeletionBlockerReason | null> {
  const activeOrder = await prisma.orders.findFirst({
    where: {
      customer_id: customerId,
      OR: [
        { fulfilment_status: { in: [...ACTIVE_ORDER_FULFILMENT_STATUSES] } },
        { payment_status: { in: [...ACTIVE_ORDER_PAYMENT_STATUSES] } },
      ],
    },
    select: { id: true },
  });
  if (activeOrder) return "active-order";

  const openReturn = await prisma.returns.findFirst({
    where: {
      status: { in: [...OPEN_RETURN_STATUSES] },
      order: { customer_id: customerId },
    },
    select: { id: true },
  });
  if (openReturn) return "open-return";

  const pendingRefund = await prisma.payment_refunds.findFirst({
    where: {
      status: { in: [...PENDING_REFUND_STATUSES] },
      payments: { orders: { customer_id: customerId } },
    },
    select: { id: true },
  });
  if (pendingRefund) return "pending-refund";

  const openDispute = await prisma.payment_disputes.findFirst({
    where: {
      status: { in: [...OPEN_DISPUTE_STATUSES] },
      payments: { orders: { customer_id: customerId } },
    },
    select: { id: true },
  });
  if (openDispute) return "open-dispute";

  // A saved-payment-method verification charge (NGN 50 setup charge, spec
  // §7.2) refunds automatically once Paystack confirms it — while `pending`,
  // that reversal is an unresolved payout owed back to the customer.
  const pendingPayout = await prisma.payment_authorizations.findFirst({
    where: { customer_id: customerId, status: "pending" },
    select: { id: true },
  });
  if (pendingPayout) return "pending-payout";

  return null;
}

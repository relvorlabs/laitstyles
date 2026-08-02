import "server-only";

import { err, type Result } from "@/lib/errors";
import { type Prisma, prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import {
  createRefund as createPaystackRefund,
  fetchRefund as fetchPaystackRefund,
} from "@/modules/payments/server/paystack";
import {
  applyRefundProviderState,
  type RefundError,
  type RefundProjection,
} from "@/modules/payments/server/refunds";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function retryRefundCommand(
  actor: StaffSession,
  refundId: string,
  idempotencyKey: string,
): Promise<Result<RefundProjection, RefundError>> {
  if (!hasCapability(actor.role, "payments:refund")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to retry refunds." });
  }
  if (!uuidPattern.test(refundId) || idempotencyKey.trim().length < 8) {
    return err({ code: "REFUND_INVALID", message: "The refund retry identity is invalid." });
  }

  const refund = await prisma.payment_refunds.findUnique({
    where: { id: refundId },
    select: {
      id: true,
      payment_id: true,
      provider_reference: true,
      status: true,
      requested_amount: true,
      currency: true,
      reason: true,
      retry_count: true,
      payments: { select: { reference: true } },
    },
  });
  if (!refund) return err({ code: "REFUND_NOT_FOUND", message: "The refund could not be found." });
  if (refund.status !== "failed" && refund.status !== "needs_attention") {
    return err({
      code: "REFUND_INVALID_STATE",
      message: "Only failed or needs-attention refunds can be retried.",
    });
  }

  if (refund.provider_reference) {
    try {
      const provider = await fetchPaystackRefund(refund.provider_reference);
      return applyRefundProviderState({
        refundId: refund.id,
        provider,
        actorProfileId: actor.authUserId,
      });
    } catch {
      return err({
        code: "REFUND_RECONCILIATION_REQUIRED",
        message: "Paystack truth could not be resolved, so no second refund was submitted.",
      });
    }
  }

  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.payment_refunds.updateMany({
      where: {
        id: refund.id,
        provider_reference: null,
        status: { in: ["failed", "needs_attention"] },
      },
      data: {
        status: "processing",
        retry_count: { increment: 1 },
        failure_reason: null,
        failed_at: null,
      },
    });
    if (claim.count !== 1) return false;
    await tx.audit_events.create({
      data: {
        actor_profile_id: actor.authUserId,
        action: "payments:refund:retry-claimed",
        target_table: "payment_refunds",
        target_id: refund.id,
        metadata: {
          payment_id: refund.payment_id,
          retry_count: refund.retry_count + 1,
          idempotency_key: idempotencyKey,
        },
      },
    });
    return true;
  });
  if (!claimed) {
    return err({
      code: "REFUND_RECONCILIATION_REQUIRED",
      message: "Another refund retry already claimed provider execution.",
    });
  }

  try {
    const provider = await createPaystackRefund({
      transaction: refund.payments.reference,
      amountMinor: decimalToMinor(refund.requested_amount),
      currency: "NGN",
      customerNote: refund.reason || undefined,
      merchantNote: `Laitstyles refund ${refund.id}`,
    });
    return applyRefundProviderState({
      refundId: refund.id,
      provider,
      actorProfileId: actor.authUserId,
    });
  } catch {
    await prisma.payment_refunds.updateMany({
      where: { id: refund.id, status: "processing", provider_reference: null },
      data: {
        status: "needs_attention",
        failure_reason: "The provider did not confirm the retry.",
        last_provider_sync_at: new Date(),
      },
    });
    return err({
      code: "REFUND_RECONCILIATION_REQUIRED",
      message: "Paystack did not confirm the retry. Reconcile provider truth before trying again.",
    });
  }
}

function decimalToMinor(amount: Prisma.Decimal) {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}

import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import { runSerializable } from "@/lib/prisma/serializable";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import {
  applyRefundLineAllocations,
  buildRefundLineAllocations,
} from "@/modules/payments/server/refund-lines";
import {
  decimalToMinor,
  type ListRefundsQuery,
  mapProviderRefundStatus,
  mergeRefundProviderMetadata,
  minorToDecimal,
  type RefundError,
  refundInclude,
  type RefundProjection,
  type RefundRow,
  type RequestRefundInput,
  readLineAllocations,
  toRefundProjection,
} from "@/modules/payments/server/refund-projection";
import {
  createRefund as createPaystackRefund,
  type PaystackRefund,
} from "@/modules/payments/server/paystack";

export type {
  ListRefundsQuery,
  RefundError,
  RefundLineAllocation,
  RefundProjection,
  RequestRefundInput,
} from "@/modules/payments/server/refund-projection";

const countedRefundStatuses = ["pending", "processing", "needs_attention", "processed"] as const;
const terminalRefundStatuses = ["processed", "failed"] as const;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NormalizedRefundRequest = RequestRefundInput & { reason: string };

export async function requestRefund(
  actor: StaffSession,
  input: RequestRefundInput,
): Promise<Result<RefundProjection, RefundError>> {
  if (!hasCapability(actor.role, "payments:refund")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to issue refunds." });
  }

  const normalized = normalizeRequest(input);
  if (!normalized.ok) return normalized;

  const replay = await findRefundReplay(
    normalized.value.paymentId,
    normalized.value.idempotencyKey,
  );
  if (replay) return ok(toRefundProjection(replay));

  let command: Result<RefundRow, RefundError>;
  try {
    command = await runSerializable((tx) => createRefundCommand(tx, actor, normalized.value));
  } catch (error: unknown) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await findRefundReplay(
      normalized.value.paymentId,
      normalized.value.idempotencyKey,
    );
    return raced
      ? ok(toRefundProjection(raced))
      : err({
          code: "REFUND_RECONCILIATION_REQUIRED",
          message:
            "This refund request is already being processed. Refresh its status before retrying.",
        });
  }

  if (!command.ok) return command;

  try {
    const provider = await createPaystackRefund({
      transaction: command.value.payments.reference,
      amountMinor: normalized.value.amountMinor,
      currency: "NGN",
      customerNote: normalized.value.reason || undefined,
      merchantNote: `Laitstyles refund ${command.value.id}`,
    });
    return applyRefundProviderState({
      refundId: command.value.id,
      provider,
      actorProfileId: actor.authUserId,
    });
  } catch {
    const persisted = await prisma.payment_refunds.update({
      where: { id: command.value.id },
      data: {
        status: "needs_attention",
        failure_reason: "The provider did not confirm the refund request.",
        last_provider_sync_at: new Date(),
      },
      include: refundInclude,
    });
    await prisma.audit_events.create({
      data: {
        actor_profile_id: actor.authUserId,
        action: "payments:refund:provider-unconfirmed",
        target_table: "payment_refunds",
        target_id: persisted.id,
        metadata: { payment_id: persisted.payment_id },
      },
    });
    return ok(toRefundProjection(persisted));
  }
}

export async function getRefund(
  actor: StaffSession,
  id: string,
): Promise<Result<RefundProjection, RefundError>> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view refunds." });
  }
  const refund = uuidPattern.test(id)
    ? await prisma.payment_refunds.findUnique({ where: { id }, include: refundInclude })
    : null;
  return refund
    ? ok(toRefundProjection(refund))
    : err({ code: "REFUND_NOT_FOUND", message: "The refund could not be found." });
}

export async function listRefunds(
  actor: StaffSession,
  query: ListRefundsQuery = {},
): Promise<
  Result<{ items: RefundProjection[]; page: number; perPage: number; total: number }, RefundError>
> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view refunds." });
  }

  const page = normalizePositiveInteger(query.page, 1);
  const perPage = Math.min(normalizePositiveInteger(query.perPage, 25), 100);
  const where: Prisma.payment_refundsWhereInput = {
    ...(query.paymentId ? { payment_id: query.paymentId } : {}),
    ...(query.returnId ? { return_id: query.returnId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.payment_refunds.findMany({
      where,
      include: refundInclude,
      orderBy: { requested_at: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.payment_refunds.count({ where }),
  ]);
  return ok({ items: items.map(toRefundProjection), page, perPage, total });
}

export async function applyRefundProviderState(input: {
  refundId?: string;
  provider: PaystackRefund;
  actorProfileId?: string | null;
}): Promise<Result<RefundProjection, RefundError>> {
  const result = await runSerializable(
    async (tx): Promise<Result<RefundRow, RefundError>> => {
      const refund = await tx.payment_refunds.findFirst({
        where: input.refundId
          ? { id: input.refundId }
          : { provider: "paystack", provider_reference: input.provider.id },
        include: refundInclude,
      });
      if (!refund) {
        return err({ code: "REFUND_NOT_FOUND", message: "The refund could not be found." });
      }

      const providerStatus = mapProviderRefundStatus(input.provider.status);
      const mappedStatus =
        refund.status === "processed" && providerStatus !== "processed"
          ? "processed"
          : providerStatus;
      const providerProcessedAmount = minorToDecimal(input.provider.amountMinor);
      if (providerProcessedAmount.gt(refund.requested_amount)) {
        return err({
          code: "REFUND_RECONCILIATION_REQUIRED",
          message: "Paystack reported a refund amount above the local request.",
        });
      }
      if (isProviderReplay(refund, input.provider, mappedStatus, providerProcessedAmount)) {
        return ok(refund);
      }

      const now = new Date();
      if (mappedStatus === "processed" && refund.status !== "processed") {
        const nextOrderRefunded = refund.payments.orders.refunded_amount.add(
          providerProcessedAmount,
        );
        if (nextOrderRefunded.gt(refund.payments.orders.total)) {
          return err({
            code: "REFUND_LIMIT_EXCEEDED",
            message: "The provider refund exceeds the captured order total and needs reconciliation.",
            remainingAmountMinor: Math.max(
              0,
              decimalToMinor(
                refund.payments.orders.total.sub(refund.payments.orders.refunded_amount),
              ),
            ),
          });
        }

        await applyRefundLineAllocations(tx, refund, readLineAllocations(refund.metadata));
        if (refund.return_id) {
          await tx.returns.update({
            where: { id: refund.return_id },
            data: { refund_amount: { increment: providerProcessedAmount } },
          });
        }
        await tx.orders.update({
          where: { id: refund.payments.order_id },
          data: {
            refunded_amount: nextOrderRefunded,
            payment_status: nextOrderRefunded.gte(refund.payments.orders.total)
              ? "refunded"
              : "partially_refunded",
          },
        });
        await tx.order_payment_events.create({
          data: {
            order_id: refund.payments.order_id,
            payment_id: refund.payment_id,
            kind: "refund_recorded",
            amount: providerProcessedAmount,
            currency: refund.currency,
            actor_profile_id: input.actorProfileId ?? null,
            note: "Paystack confirmed the refund.",
            metadata: { refund_id: refund.id, provider_refund_id: input.provider.id },
          },
        });
      }

      const updated = await tx.payment_refunds.update({
        where: { id: refund.id },
        data: {
          provider_reference: input.provider.id,
          provider_status:
            refund.status === "processed" && providerStatus !== "processed"
              ? refund.provider_status
              : input.provider.providerStatus,
          status: mappedStatus,
          processed_amount:
            mappedStatus === "processed" ? providerProcessedAmount : refund.processed_amount,
          processed_at:
            mappedStatus === "processed"
              ? refund.processed_at ??
                (input.provider.refundedAt ? new Date(input.provider.refundedAt) : now)
              : refund.processed_at,
          failed_at:
            mappedStatus === "failed"
              ? now
              : mappedStatus === "processed"
                ? null
                : refund.failed_at,
          failure_reason:
            mappedStatus === "failed"
              ? "Paystack marked the refund as failed."
              : mappedStatus === "processed"
                ? null
                : refund.failure_reason,
          last_provider_sync_at: now,
          metadata: mergeRefundProviderMetadata(refund.metadata, input.provider),
        },
        include: refundInclude,
      });

      await tx.audit_events.create({
        data: {
          actor_profile_id: input.actorProfileId ?? null,
          action: `payments:refund:${mappedStatus}`,
          target_table: "payment_refunds",
          target_id: refund.id,
          metadata: {
            payment_id: refund.payment_id,
            provider_refund_id: input.provider.id,
            provider_status: input.provider.providerStatus,
          },
        },
      });
      return ok(updated);
    },
  );
  return result.ok ? ok(toRefundProjection(result.value)) : result;
}

async function createRefundCommand(
  tx: Prisma.TransactionClient,
  actor: StaffSession,
  input: NormalizedRefundRequest,
): Promise<Result<RefundRow, RefundError>> {
  const payment = await tx.payments.findUnique({
    where: { id: input.paymentId },
    include: {
      orders: { include: { order_lines: true } },
      payment_refunds: { where: { status: { in: [...countedRefundStatuses] } } },
    },
  });
  if (!payment || payment.status !== "success" || payment.currency !== input.currency) {
    return err({
      code: "PAYMENT_NOT_REFUNDABLE",
      message: "Only a captured payment in the requested currency can be refunded.",
    });
  }

  const requested = minorToDecimal(input.amountMinor);
  const reserved = payment.payment_refunds.reduce((total, refund) => {
    return total.add(
      refund.status === "processed" ? refund.processed_amount : refund.requested_amount,
    );
  }, new Prisma.Decimal(0));
  const remaining = payment.amount.sub(reserved);
  if (requested.gt(remaining)) {
    return err({
      code: "REFUND_LIMIT_EXCEEDED",
      message: "The requested refund exceeds the remaining captured amount.",
      remainingAmountMinor: Math.max(0, decimalToMinor(remaining)),
    });
  }

  const linkedReturn = input.returnId
    ? await tx.returns.findFirst({
        where: { id: input.returnId, order_id: payment.order_id },
        include: { return_lines: { select: { order_line_id: true } } },
      })
    : null;
  if (input.returnId && !linkedReturn) {
    return err({
      code: "REFUND_RETURN_MISMATCH",
      message: "The selected return does not belong to this payment's order.",
    });
  }

  const allocationsResult = buildRefundLineAllocations({
    amountMinor: input.amountMinor,
    requested: input.lineAllocations,
    orderLines: payment.orders.order_lines,
    allowedLineIds: linkedReturn
      ? new Set(linkedReturn.return_lines.map((line) => line.order_line_id))
      : null,
  });
  if (!allocationsResult.ok) return allocationsResult;

  const created = await tx.payment_refunds.create({
    data: {
      payment_id: payment.id,
      return_id: linkedReturn?.id ?? null,
      idempotency_key: input.idempotencyKey,
      requested_amount: requested,
      currency: input.currency,
      status: "pending",
      reason: input.reason || null,
      requested_by_profile_id: actor.authUserId,
      metadata: {
        source: "admin",
        lineAllocations: allocationsResult.value,
      },
    },
    include: refundInclude,
  });
  await tx.audit_events.create({
    data: {
      actor_profile_id: actor.authUserId,
      action: "payments:refund:requested",
      target_table: "payment_refunds",
      target_id: created.id,
      metadata: {
        payment_id: payment.id,
        order_id: payment.order_id,
        return_id: linkedReturn?.id ?? null,
        requested_amount_minor: input.amountMinor,
        idempotency_key: input.idempotencyKey,
      },
    },
  });
  return ok(created);
}

function normalizeRequest(
  input: RequestRefundInput,
): Result<NormalizedRefundRequest, RefundError> {
  const reason = input.reason?.trim().replace(/\s+/g, " ") ?? "";
  const key = input.idempotencyKey?.trim();
  if (
    !uuidPattern.test(input.paymentId) ||
    (input.returnId !== undefined && !uuidPattern.test(input.returnId)) ||
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor <= 0 ||
    input.currency !== "NGN" ||
    !key ||
    key.length < 8 ||
    key.length > 200 ||
    reason.length > 500
  ) {
    return err({
      code: "REFUND_INVALID",
      message: "Provide a valid refund amount and request identity.",
    });
  }
  return ok({ ...input, idempotencyKey: key, reason });
}

async function findRefundReplay(paymentId: string, idempotencyKey: string) {
  return prisma.payment_refunds.findFirst({
    where: { payment_id: paymentId, idempotency_key: idempotencyKey },
    include: refundInclude,
  });
}

function isProviderReplay(
  refund: RefundRow,
  provider: PaystackRefund,
  status: RefundProjection["status"],
  processedAmount: Prisma.Decimal,
): boolean {
  return (
    refund.provider_reference === provider.id &&
    refund.status === status &&
    (status !== "processed" || refund.processed_amount.equals(processedAmount)) &&
    (refund.status === "processed" || refund.provider_status === provider.providerStatus)
  );
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export const REFUND_TERMINAL_STATUSES = terminalRefundStatuses;

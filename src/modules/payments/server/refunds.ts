import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import {
  createRefund as createPaystackRefund,
  fetchRefund as fetchPaystackRefund,
  type PaystackRefund,
} from "@/modules/payments/server/paystack";

const countedRefundStatuses = ["pending", "processing", "needs_attention", "processed"] as const;
const terminalRefundStatuses = ["processed", "failed"] as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const refundInclude = {
  payments: {
    include: {
      orders: {
        include: {
          order_lines: true,
        },
      },
    },
  },
  returns: true,
  profiles: { select: { display_name: true, email: true } },
} satisfies Prisma.payment_refundsInclude;

type RefundRow = Prisma.payment_refundsGetPayload<{ include: typeof refundInclude }>;
type TransactionClient = Prisma.TransactionClient;

export type RefundLineAllocation = {
  orderLineId: string;
  amountMinor: number;
};

export type RequestRefundInput = {
  paymentId: string;
  amountMinor: number;
  currency: "NGN";
  reason?: string;
  returnId?: string;
  idempotencyKey: string;
  lineAllocations?: RefundLineAllocation[];
};

export type ListRefundsQuery = {
  page?: number;
  perPage?: number;
  paymentId?: string;
  returnId?: string;
  status?: RefundProjection["status"];
};

export type RefundProjection = {
  id: string;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  returnId: string | null;
  providerReference: string | null;
  providerStatus: string | null;
  idempotencyKey: string | null;
  requestedAmountMinor: number;
  processedAmountMinor: number;
  currency: string;
  status: "pending" | "processing" | "needs_attention" | "processed" | "failed";
  reason: string | null;
  failureReason: string | null;
  retryCount: number;
  requestedBy: string | null;
  requestedAt: string;
  processedAt: string | null;
  failedAt: string | null;
  lastProviderSyncAt: string | null;
  lineAllocations: RefundLineAllocation[];
};

export type RefundError = {
  code:
    | "FORBIDDEN"
    | "REFUND_INVALID"
    | "REFUND_NOT_FOUND"
    | "PAYMENT_NOT_REFUNDABLE"
    | "REFUND_LIMIT_EXCEEDED"
    | "REFUND_RETURN_MISMATCH"
    | "REFUND_INVALID_STATE"
    | "REFUND_RECONCILIATION_REQUIRED";
  message: string;
  remainingAmountMinor?: number;
};

export async function requestRefund(
  actor: StaffSession,
  input: RequestRefundInput,
): Promise<Result<RefundProjection, RefundError>> {
  if (!hasCapability(actor.role, "payments:refund")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to issue refunds." });
  }

  const normalized = normalizeRequest(input);
  if (!normalized.ok) return normalized;

  const replay = await findRefundReplay(normalized.value.paymentId, normalized.value.idempotencyKey);
  if (replay) return ok(toRefundProjection(replay));

  let command: Result<RefundRow, RefundError>;
  try {
    command = await prisma.$transaction(
      (tx) => createRefundCommand(tx, actor, normalized.value),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await findRefundReplay(normalized.value.paymentId, normalized.value.idempotencyKey);
    return raced
      ? ok(toRefundProjection(raced))
      : err({
          code: "REFUND_RECONCILIATION_REQUIRED",
          message: "This refund request is already being processed. Refresh its status before retrying.",
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
    return applyRefundProviderState({ refundId: command.value.id, provider, actorProfileId: actor.authUserId });
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

export async function retryRefund(
  actor: StaffSession,
  refundId: string,
): Promise<Result<RefundProjection, RefundError>> {
  if (!hasCapability(actor.role, "payments:refund")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to retry refunds." });
  }
  if (!uuidPattern.test(refundId)) {
    return err({ code: "REFUND_INVALID", message: "The refund identifier is invalid." });
  }

  const refund = await prisma.payment_refunds.findUnique({ where: { id: refundId }, include: refundInclude });
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
      return applyRefundProviderState({ refundId: refund.id, provider, actorProfileId: actor.authUserId });
    } catch {
      return err({
        code: "REFUND_RECONCILIATION_REQUIRED",
        message: "Paystack truth could not be resolved, so no second refund was submitted.",
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment_refunds.update({
      where: { id: refund.id },
      data: {
        status: "pending",
        retry_count: { increment: 1 },
        failure_reason: null,
        failed_at: null,
      },
    });
    await tx.audit_events.create({
      data: {
        actor_profile_id: actor.authUserId,
        action: "payments:refund:retry",
        target_table: "payment_refunds",
        target_id: refund.id,
        metadata: { payment_id: refund.payment_id, retry_count: refund.retry_count + 1 },
      },
    });
  });

  try {
    const provider = await createPaystackRefund({
      transaction: refund.payments.reference,
      amountMinor: decimalToMinor(refund.requested_amount),
      currency: "NGN",
      customerNote: refund.reason || undefined,
      merchantNote: `Laitstyles refund ${refund.id}`,
    });
    return applyRefundProviderState({ refundId: refund.id, provider, actorProfileId: actor.authUserId });
  } catch {
    const persisted = await prisma.payment_refunds.update({
      where: { id: refund.id },
      data: {
        status: "needs_attention",
        failure_reason: "The provider did not confirm the retry.",
        last_provider_sync_at: new Date(),
      },
      include: refundInclude,
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
): Promise<Result<{ items: RefundProjection[]; page: number; perPage: number; total: number }, RefundError>> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view refunds." });
  }

  const page = Number.isInteger(query.page) && (query.page ?? 0) > 0 ? query.page! : 1;
  const perPage =
    Number.isInteger(query.perPage) && (query.perPage ?? 0) > 0
      ? Math.min(query.perPage!, 100)
      : 25;
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
  const result = await prisma.$transaction(
    async (tx): Promise<Result<RefundRow, RefundError>> => {
      const refund = await tx.payment_refunds.findFirst({
        where: input.refundId
          ? { id: input.refundId }
          : { provider: "paystack", provider_reference: input.provider.id },
        include: refundInclude,
      });
      if (!refund) return err({ code: "REFUND_NOT_FOUND", message: "The refund could not be found." });

      const mappedStatus = mapProviderStatus(input.provider.status);
      const providerProcessedAmount = minorToDecimal(input.provider.amountMinor);
      const now = new Date();

      if (mappedStatus === "processed" && refund.status !== "processed") {
        const nextOrderRefunded = refund.payments.orders.refunded_amount.add(providerProcessedAmount);
        if (nextOrderRefunded.gt(refund.payments.orders.total)) {
          return err({
            code: "REFUND_LIMIT_EXCEEDED",
            message: "The provider refund exceeds the captured order total and needs reconciliation.",
            remainingAmountMinor: Math.max(
              0,
              decimalToMinor(refund.payments.orders.total.sub(refund.payments.orders.refunded_amount)),
            ),
          });
        }

        await applyLineRefunds(tx, refund, readLineAllocations(refund.metadata));
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
          provider_status: input.provider.providerStatus,
          status: mappedStatus,
          processed_amount: mappedStatus === "processed" ? providerProcessedAmount : refund.processed_amount,
          processed_at:
            mappedStatus === "processed"
              ? input.provider.refundedAt
                ? new Date(input.provider.refundedAt)
                : now
              : refund.processed_at,
          failed_at: mappedStatus === "failed" ? now : mappedStatus === "processed" ? null : refund.failed_at,
          failure_reason:
            mappedStatus === "failed"
              ? "Paystack marked the refund as failed."
              : mappedStatus === "processed"
                ? null
                : refund.failure_reason,
          last_provider_sync_at: now,
          metadata: mergeProviderMetadata(refund.metadata, input.provider),
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
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return result.ok ? ok(toRefundProjection(result.value)) : result;
}

async function createRefundCommand(
  tx: TransactionClient,
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
    return total.add(refund.status === "processed" ? refund.processed_amount : refund.requested_amount);
  }, new Prisma.Decimal(0));
  const remaining = payment.amount.sub(reserved);
  if (requested.gt(remaining)) {
    return err({
      code: "REFUND_LIMIT_EXCEEDED",
      message: "The requested refund exceeds the remaining captured amount.",
      remainingAmountMinor: Math.max(0, decimalToMinor(remaining)),
    });
  }

  let linkedReturn: { id: string; return_lines: { order_line_id: string }[] } | null = null;
  if (input.returnId) {
    linkedReturn = await tx.returns.findFirst({
      where: { id: input.returnId, order_id: payment.order_id },
      include: { return_lines: { select: { order_line_id: true } } },
    });
    if (!linkedReturn) {
      return err({
        code: "REFUND_RETURN_MISMATCH",
        message: "The selected return does not belong to this payment's order.",
      });
    }
  }

  const allocationsResult = buildLineAllocations({
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

type NormalizedRefundRequest = RequestRefundInput & { reason: string };

function normalizeRequest(input: RequestRefundInput): Result<NormalizedRefundRequest, RefundError> {
  const reason = input.reason?.trim().replace(/\s+/g, " ") ?? "";
  const key = input.idempotencyKey?.trim();
  if (
    !uuidPattern.test(input.paymentId) ||
    (input.returnId !== undefined && !uuidPattern.test(input.returnId)) ||
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor <= 0 ||
    input.currency !== "NGN" ||
    !key ||
    key.length > 200 ||
    reason.length > 500
  ) {
    return err({ code: "REFUND_INVALID", message: "Provide a valid refund amount and request identity." });
  }
  return ok({ ...input, idempotencyKey: key, reason });
}

function buildLineAllocations(input: {
  amountMinor: number;
  requested?: RefundLineAllocation[];
  orderLines: Array<{
    id: string;
    quantity: number;
    unit_price: Prisma.Decimal;
    refunded_amount: Prisma.Decimal;
  }>;
  allowedLineIds: Set<string> | null;
}): Result<RefundLineAllocation[], RefundError> {
  const lines = input.orderLines.filter(
    (line) => !input.allowedLineIds || input.allowedLineIds.has(line.id),
  );
  const availableByLine = new Map(
    lines.map((line) => [
      line.id,
      Math.max(0, decimalToMinor(line.unit_price.mul(line.quantity).sub(line.refunded_amount))),
    ]),
  );

  if (input.requested?.length) {
    const seen = new Set<string>();
    let total = 0;
    for (const allocation of input.requested) {
      const available = availableByLine.get(allocation.orderLineId);
      if (
        seen.has(allocation.orderLineId) ||
        available === undefined ||
        !Number.isSafeInteger(allocation.amountMinor) ||
        allocation.amountMinor <= 0 ||
        allocation.amountMinor > available
      ) {
        return err({
          code: "REFUND_INVALID",
          message: "One or more refund line allocations are invalid for this order.",
        });
      }
      seen.add(allocation.orderLineId);
      total += allocation.amountMinor;
    }
    if (total > input.amountMinor) {
      return err({
        code: "REFUND_INVALID",
        message: "Refund line allocations cannot exceed the requested refund amount.",
      });
    }
    return ok(input.requested);
  }

  let remaining = input.amountMinor;
  const allocations: RefundLineAllocation[] = [];
  for (const line of lines) {
    const available = availableByLine.get(line.id) ?? 0;
    const amountMinor = Math.min(available, remaining);
    if (amountMinor > 0) allocations.push({ orderLineId: line.id, amountMinor });
    remaining -= amountMinor;
    if (remaining === 0) break;
  }
  return ok(allocations);
}

async function applyLineRefunds(
  tx: TransactionClient,
  refund: RefundRow,
  allocations: RefundLineAllocation[],
) {
  const orderLines = new Map(refund.payments.orders.order_lines.map((line) => [line.id, line]));
  for (const allocation of allocations) {
    const line = orderLines.get(allocation.orderLineId);
    if (!line) continue;
    const amount = minorToDecimal(allocation.amountMinor);
    const next = line.refunded_amount.add(amount);
    const lineTotal = line.unit_price.mul(line.quantity);
    await tx.order_lines.update({
      where: { id: line.id },
      data: {
        refunded_amount: next,
        refund_status: next.gte(lineTotal) ? "refunded" : "partially_refunded",
        refunded_at: new Date(),
      },
    });
  }
}

function mapProviderStatus(status: PaystackRefund["status"]): RefundProjection["status"] {
  if (status === "needs-attention" || status === "unknown") return "needs_attention";
  return status;
}

function readLineAllocations(metadata: Prisma.JsonValue): RefundLineAllocation[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const value = (metadata as Record<string, unknown>).lineAllocations;
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    return typeof row.orderLineId === "string" && Number.isSafeInteger(row.amountMinor)
      ? [{ orderLineId: row.orderLineId, amountMinor: row.amountMinor as number }]
      : [];
  });
}

function mergeProviderMetadata(
  metadata: Prisma.JsonValue,
  provider: PaystackRefund,
): Prisma.InputJsonValue {
  const current =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, Prisma.JsonValue>)
      : {};
  return {
    ...current,
    provider: {
      expectedAt: provider.expectedAt,
      refundedAt: provider.refundedAt,
      updatedAt: provider.updatedAt,
    },
  } as Prisma.InputJsonValue;
}

function toRefundProjection(row: RefundRow): RefundProjection {
  return {
    id: row.id,
    paymentId: row.payment_id,
    orderId: row.payments.order_id,
    orderNumber: row.payments.orders.order_number,
    returnId: row.return_id,
    providerReference: row.provider_reference,
    providerStatus: row.provider_status,
    idempotencyKey: row.idempotency_key,
    requestedAmountMinor: decimalToMinor(row.requested_amount),
    processedAmountMinor: decimalToMinor(row.processed_amount),
    currency: row.currency,
    status: row.status,
    reason: row.reason,
    failureReason: row.failure_reason,
    retryCount: row.retry_count,
    requestedBy: row.profiles?.display_name ?? row.profiles?.email ?? null,
    requestedAt: row.requested_at.toISOString(),
    processedAt: row.processed_at?.toISOString() ?? null,
    failedAt: row.failed_at?.toISOString() ?? null,
    lastProviderSyncAt: row.last_provider_sync_at?.toISOString() ?? null,
    lineAllocations: readLineAllocations(row.metadata),
  };
}

async function findRefundReplay(paymentId: string, idempotencyKey: string) {
  return prisma.payment_refunds.findFirst({
    where: { payment_id: paymentId, idempotency_key: idempotencyKey },
    include: refundInclude,
  });
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function minorToDecimal(amountMinor: number) {
  return new Prisma.Decimal(amountMinor).div(100);
}

function decimalToMinor(amount: Prisma.Decimal) {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}

export const REFUND_TERMINAL_STATUSES = terminalRefundStatuses;

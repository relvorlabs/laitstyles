import "server-only";

import type { Prisma } from "@/lib/prisma";
import { Prisma as PrismaRuntime } from "@/lib/prisma";
import type { PaystackRefund } from "@/modules/payments/server/paystack";

export const refundInclude = {
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

export type RefundRow = Prisma.payment_refundsGetPayload<{ include: typeof refundInclude }>;

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

export type ListRefundsQuery = {
  page?: number;
  perPage?: number;
  paymentId?: string;
  returnId?: string;
  status?: RefundProjection["status"];
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

export function toRefundProjection(row: RefundRow): RefundProjection {
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

export function readLineAllocations(metadata: Prisma.JsonValue): RefundLineAllocation[] {
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

export function mergeRefundProviderMetadata(
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

export function mapProviderRefundStatus(
  status: PaystackRefund["status"],
): RefundProjection["status"] {
  if (status === "needs-attention" || status === "unknown") return "needs_attention";
  return status;
}

export function minorToDecimal(amountMinor: number) {
  return new PrismaRuntime.Decimal(amountMinor).div(100);
}

export function decimalToMinor(amount: Prisma.Decimal) {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}

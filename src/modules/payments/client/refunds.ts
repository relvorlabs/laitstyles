"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/http/client";

const REFUNDS_URL = "/api/v1/admin/refunds";
const PAYMENTS_URL = "/api/v1/admin/payments";

export type RefundStatus = "pending" | "processing" | "needs_attention" | "processed" | "failed";

export type RefundRecord = {
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
  status: RefundStatus;
  reason: string | null;
  failureReason: string | null;
  retryCount: number;
  requestedBy: string | null;
  requestedAt: string;
  processedAt: string | null;
  failedAt: string | null;
  lastProviderSyncAt: string | null;
  lineAllocations: Array<{ orderLineId: string; amountMinor: number }>;
};

export type AdminPaymentRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  provider: string;
  reference: string;
  providerTransactionId: string | null;
  amountMinor: number;
  refundableAmountMinor: number;
  currency: string;
  status: string;
  orderPaymentStatus: string;
  channel: string | null;
  gatewayResponse: string | null;
  verifiedAt: string | null;
  failureCode: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  refunds: RefundRecord[];
  disputes: Array<{
    id: string;
    providerDisputeId: string;
    providerStatus: string | null;
    status: string;
    category: string | null;
    amountMinor: number;
    currency: string;
    evidenceDueAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
  }>;
};

export type CreateRefundInput = {
  paymentId: string;
  amountMinor: number;
  currency: "NGN";
  reason?: string;
  returnId?: string;
  lineAllocations?: Array<{ orderLineId: string; amountMinor: number }>;
  idempotencyKey: string;
};

export type RefundListFilters = {
  page?: number;
  perPage?: number;
  paymentId?: string;
  returnId?: string;
  status?: RefundStatus;
};

export const refundKeys = {
  all: ["admin", "refunds"] as const,
  list: (filters: RefundListFilters = {}) => [...refundKeys.all, "list", filters] as const,
  detail: (refundId: string) => [...refundKeys.all, "detail", refundId] as const,
};

export const adminPaymentKeys = {
  all: ["admin", "payments"] as const,
  list: (filters: Record<string, string | number | undefined> = {}) =>
    [...adminPaymentKeys.all, "list", filters] as const,
  detail: (paymentId: string) => [...adminPaymentKeys.all, "detail", paymentId] as const,
  timeline: (paymentId: string) => [...adminPaymentKeys.all, "timeline", paymentId] as const,
};

export function refundsQueryOptions(filters: RefundListFilters = {}) {
  return queryOptions({
    queryKey: refundKeys.list(filters),
    queryFn: async ({ signal }) =>
      (await apiRequest<RefundRecord[]>(withQuery(REFUNDS_URL, filters), { cache: "no-store", signal }))
        .data,
    staleTime: 5_000,
  });
}

export function refundQueryOptions(refundId: string) {
  return queryOptions({
    queryKey: refundKeys.detail(refundId),
    queryFn: async ({ signal }) =>
      (
        await apiRequest<RefundRecord>(`${REFUNDS_URL}/${encodeURIComponent(refundId)}`, {
          cache: "no-store",
          signal,
        })
      ).data,
    enabled: Boolean(refundId.trim()),
    staleTime: 3_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 3_000 : false;
    },
  });
}

export function adminPaymentQueryOptions(paymentId: string) {
  return queryOptions({
    queryKey: adminPaymentKeys.detail(paymentId),
    queryFn: async ({ signal }) =>
      (
        await apiRequest<AdminPaymentRecord>(`${PAYMENTS_URL}/${encodeURIComponent(paymentId)}`, {
          cache: "no-store",
          signal,
        })
      ).data,
    enabled: Boolean(paymentId.trim()),
    staleTime: 5_000,
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRefundInput) => {
      const { idempotencyKey, ...body } = input;
      return (
        await apiRequest<RefundRecord>(REFUNDS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(body),
        })
      ).data;
    },
    onSuccess: (refund) => {
      queryClient.setQueryData(refundKeys.detail(refund.id), refund);
      queryClient.invalidateQueries({ queryKey: refundKeys.all });
      queryClient.invalidateQueries({ queryKey: adminPaymentKeys.detail(refund.paymentId) });
      queryClient.invalidateQueries({ queryKey: adminPaymentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      if (refund.returnId) queryClient.invalidateQueries({ queryKey: ["admin", "returns", refund.returnId] });
    },
  });
}

export function useRetryRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { refundId: string; idempotencyKey: string }) =>
      (
        await apiRequest<RefundRecord>(
          `${REFUNDS_URL}/${encodeURIComponent(input.refundId)}/retry`,
          { method: "POST", headers: { "Idempotency-Key": input.idempotencyKey } },
        )
      ).data,
    onSuccess: (refund) => {
      queryClient.setQueryData(refundKeys.detail(refund.id), refund);
      queryClient.invalidateQueries({ queryKey: refundKeys.all });
      queryClient.invalidateQueries({ queryKey: adminPaymentKeys.detail(refund.paymentId) });
    },
  });
}

function withQuery(path: string, values: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

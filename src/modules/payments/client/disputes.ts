"use client";

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/http/client";

const DISPUTES_URL = "/api/v1/admin/disputes";

export type DisputeStatus = "awaiting_evidence" | "pending" | "resolved" | "declined";

export type DisputeRecord = {
  id: string;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  providerDisputeId: string;
  providerStatus: string | null;
  status: DisputeStatus;
  category: string | null;
  amountMinor: number;
  currency: string;
  reason: string | null;
  evidence: unknown[];
  evidenceDueAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  lastProviderSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DisputeListFilters = {
  page?: number;
  perPage?: number;
  status?: DisputeStatus;
  paymentId?: string;
  dueBefore?: string;
};

export type DisputeDecisionInput = {
  disputeId: string;
  idempotencyKey: string;
  message: string;
  refundAmountMinor: number;
  uploadedFilename?: string;
  evidenceId?: string;
};

export type DisputeEvidenceInput = {
  disputeId: string;
  idempotencyKey: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  serviceDetails: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  uploadedFilename?: string;
  file?: File;
};

export const disputeKeys = {
  all: ["admin", "disputes"] as const,
  list: (filters: DisputeListFilters = {}) => [...disputeKeys.all, "list", filters] as const,
  detail: (disputeId: string) => [...disputeKeys.all, "detail", disputeId] as const,
};

export function disputesQueryOptions(filters: DisputeListFilters = {}) {
  return queryOptions({
    queryKey: disputeKeys.list(filters),
    queryFn: async ({ signal }) =>
      (
        await apiRequest<DisputeRecord[]>(withQuery(DISPUTES_URL, filters), {
          cache: "no-store",
          signal,
        })
      ).data,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
}

export function disputeQueryOptions(disputeId: string) {
  return queryOptions({
    queryKey: disputeKeys.detail(disputeId),
    queryFn: async ({ signal }) =>
      (
        await apiRequest<DisputeRecord>(`${DISPUTES_URL}/${encodeURIComponent(disputeId)}`, {
          cache: "no-store",
          signal,
        })
      ).data,
    enabled: Boolean(disputeId.trim()),
    staleTime: 3_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "awaiting_evidence" || status === "pending" ? 5_000 : false;
    },
  });
}

export function useUpdateDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      disputeId: string;
      idempotencyKey: string;
      refundAmountMinor: number;
      uploadedFilename?: string;
    }) => {
      const { disputeId, idempotencyKey, ...body } = input;
      return (
        await apiRequest<DisputeRecord>(`${DISPUTES_URL}/${encodeURIComponent(disputeId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(body),
        })
      ).data;
    },
    onSuccess: applyDisputeMutation,
  });

  function applyDisputeMutation(dispute: DisputeRecord) {
    queryClient.setQueryData(disputeKeys.detail(dispute.id), dispute);
    invalidateDisputeDependants(queryClient, dispute);
  }
}

export function useSubmitDisputeEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DisputeEvidenceInput) => {
      const form = new FormData();
      form.set("customerEmail", input.customerEmail);
      form.set("customerName", input.customerName);
      form.set("customerPhone", input.customerPhone);
      form.set("serviceDetails", input.serviceDetails);
      if (input.deliveryAddress) form.set("deliveryAddress", input.deliveryAddress);
      if (input.deliveryDate) form.set("deliveryDate", input.deliveryDate);
      if (input.uploadedFilename) form.set("uploadedFilename", input.uploadedFilename);
      if (input.file) form.set("file", input.file);
      return (
        await apiRequest<DisputeRecord>(
          `${DISPUTES_URL}/${encodeURIComponent(input.disputeId)}/evidence`,
          {
            method: "POST",
            headers: { "Idempotency-Key": input.idempotencyKey },
            body: form,
          },
        )
      ).data;
    },
    onSuccess: (dispute) => {
      queryClient.setQueryData(disputeKeys.detail(dispute.id), dispute);
      invalidateDisputeDependants(queryClient, dispute);
    },
  });
}

export function useAcceptDispute() {
  return useDisputeDecision("accept");
}

export function useDeclineDispute() {
  return useDisputeDecision("decline");
}

function useDisputeDecision(decision: "accept" | "decline") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DisputeDecisionInput) => {
      const { disputeId, idempotencyKey, ...body } = input;
      return (
        await apiRequest<DisputeRecord>(
          `${DISPUTES_URL}/${encodeURIComponent(disputeId)}/${decision}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify(body),
          },
        )
      ).data;
    },
    onSuccess: (dispute) => {
      queryClient.setQueryData(disputeKeys.detail(dispute.id), dispute);
      invalidateDisputeDependants(queryClient, dispute);
    },
  });
}

function invalidateDisputeDependants(
  queryClient: ReturnType<typeof useQueryClient>,
  dispute: DisputeRecord,
) {
  queryClient.invalidateQueries({ queryKey: disputeKeys.all });
  queryClient.invalidateQueries({ queryKey: ["admin", "payments", "detail", dispute.paymentId] });
  queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
  queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
  queryClient.invalidateQueries({ queryKey: ["admin", "orders", dispute.orderId] });
}

function withQuery(path: string, values: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

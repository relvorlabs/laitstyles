"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/http/client";
import type {
  FinanceLedgerRecord,
  FinanceOverviewRecord,
  FinanceTransactionDetailRecord,
  PageMeta,
  PayoutBankRecord,
  PayoutRecipientRecord,
  PayoutTransferRecord,
  ReconciliationRecord,
  SettlementRecord,
  SettlementTransactionRecord,
} from "@/modules/payments/finance-contract";

const FINANCE_URL = "/api/v1/admin/finance";

type ListFilters = {
  page?: number;
  perPage?: number;
  from?: string;
  to?: string;
};

type RecipientFilters = { page?: number; perPage?: number; active?: boolean };
type TransferFilters = {
  page?: number;
  perPage?: number;
  recipientId?: string;
  status?: PayoutTransferRecord["status"];
};

export const financeKeys = {
  all: ["admin", "finance"] as const,
  overview: () => [...financeKeys.all, "overview"] as const,
  ledger: (filters: ListFilters = {}) => [...financeKeys.all, "ledger", filters] as const,
  transaction: (identifier: string | null) =>
    [...financeKeys.all, "transaction", identifier] as const,
  settlements: (filters: ListFilters = {}) => [...financeKeys.all, "settlements", filters] as const,
  settlementTransactions: (settlementId: string | null) =>
    [...financeKeys.all, "settlement-transactions", settlementId] as const,
  recipients: (filters: RecipientFilters = {}) =>
    [...financeKeys.all, "recipients", filters] as const,
  transfers: (filters: TransferFilters = {}) => [...financeKeys.all, "transfers", filters] as const,
  banks: () => [...financeKeys.all, "banks"] as const,
};

export function financeOverviewQueryOptions() {
  return queryOptions({
    queryKey: financeKeys.overview(),
    queryFn: async ({ signal }) =>
      (
        await apiRequest<FinanceOverviewRecord>(`${FINANCE_URL}/balance`, {
          cache: "no-store",
          signal,
        })
      ).data,
    staleTime: 5_000,
  });
}

export function financeLedgerQueryOptions(filters: ListFilters = {}) {
  return queryOptions({
    queryKey: financeKeys.ledger(filters),
    queryFn: async ({ signal }) => {
      const response = await apiRequest<FinanceLedgerRecord[], PageMeta>(
        withQuery(`${FINANCE_URL}/ledger`, filters),
        { cache: "no-store", signal },
      );
      return { items: response.data, meta: response.meta };
    },
    staleTime: 5_000,
  });
}

export function financeTransactionQueryOptions(identifier: string | null) {
  return queryOptions({
    queryKey: financeKeys.transaction(identifier),
    queryFn: async ({ signal }) => {
      if (!identifier) throw new TypeError("A finance transaction identifier is required.");
      return (
        await apiRequest<FinanceTransactionDetailRecord>(
          `${FINANCE_URL}/ledger/${encodeURIComponent(identifier)}`,
          { cache: "no-store", signal },
        )
      ).data;
    },
    enabled: Boolean(identifier),
    staleTime: 5_000,
  });
}

export function financeSettlementsQueryOptions(filters: ListFilters = {}) {
  return queryOptions({
    queryKey: financeKeys.settlements(filters),
    queryFn: async ({ signal }) => {
      const response = await apiRequest<SettlementRecord[], PageMeta>(
        withQuery(`${FINANCE_URL}/settlements`, filters),
        { cache: "no-store", signal },
      );
      return { items: response.data, meta: response.meta };
    },
    staleTime: 5_000,
  });
}

export function financeSettlementTransactionsQueryOptions(settlementId: string | null) {
  return queryOptions({
    queryKey: financeKeys.settlementTransactions(settlementId),
    queryFn: async ({ signal }) => {
      if (!settlementId) throw new TypeError("A settlement identifier is required.");
      const response = await apiRequest<SettlementTransactionRecord[], PageMeta>(
        `${FINANCE_URL}/settlements/${encodeURIComponent(settlementId)}/transactions?perPage=50`,
        { cache: "no-store", signal },
      );
      return { items: response.data, meta: response.meta };
    },
    enabled: Boolean(settlementId),
    staleTime: 5_000,
  });
}

export function payoutRecipientsQueryOptions(filters: RecipientFilters = {}) {
  return queryOptions({
    queryKey: financeKeys.recipients(filters),
    queryFn: async ({ signal }) => {
      const response = await apiRequest<PayoutRecipientRecord[], PageMeta>(
        withQuery(`${FINANCE_URL}/recipients`, filters),
        { cache: "no-store", signal },
      );
      return { items: response.data, meta: response.meta };
    },
    staleTime: 5_000,
  });
}

export function payoutTransfersQueryOptions(filters: TransferFilters = {}) {
  return queryOptions({
    queryKey: financeKeys.transfers(filters),
    queryFn: async ({ signal }) => {
      const response = await apiRequest<PayoutTransferRecord[], PageMeta>(
        withQuery(`${FINANCE_URL}/transfers`, filters),
        { cache: "no-store", signal },
      );
      return { items: response.data, meta: response.meta };
    },
    staleTime: 3_000,
    refetchInterval: (query) =>
      query.state.data?.items.some((transfer) =>
        ["needs_reconciliation", "otp_required", "pending", "processing"].includes(transfer.status),
      )
        ? 5_000
        : false,
  });
}

export function payoutBanksQueryOptions() {
  return queryOptions({
    queryKey: financeKeys.banks(),
    queryFn: async ({ signal }) =>
      (
        await apiRequest<PayoutBankRecord[]>(
          `${FINANCE_URL}/banks?country=nigeria&currency=NGN&perPage=100`,
          { cache: "no-store", signal },
        )
      ).data,
    staleTime: 60 * 60 * 1_000,
  });
}

export function useResolvePayoutAccount() {
  return useMutation({
    mutationFn: async (input: { accountNumber: string; bankCode: string }) =>
      (
        await apiRequest<{
          accountName: string;
          bankCode: string;
          maskedAccountNumber: string;
        }>(`${FINANCE_URL}/banks/resolve`, jsonRequest(input))
      ).data,
  });
}

export function useCreatePayoutRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      accountNumber: string;
      bankCode: string;
      currency: "NGN";
      type?: "nuban";
      description?: string;
    }) =>
      (
        await apiRequest<PayoutRecipientRecord>(
          `${FINANCE_URL}/recipients`,
          jsonRequest({ type: "nuban", ...input }),
        )
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
}

export function useDeletePayoutRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipientId: string) =>
      (
        await apiRequest<{ id: string; inactive: true }>(
          `${FINANCE_URL}/recipients/${encodeURIComponent(recipientId)}`,
          { method: "DELETE" },
        )
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
}

export function useInitiatePayoutTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      recipientId: string;
      amountMinor: number;
      currency: "NGN";
      reason: string;
      idempotencyKey: string;
    }) => {
      const { idempotencyKey, ...body } = input;
      return (
        await apiRequest<PayoutTransferRecord>(`${FINANCE_URL}/transfers`, {
          ...jsonRequest(body),
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
        })
      ).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
}

export function useFinalizePayoutTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { transferId: string; otp: string; idempotencyKey: string }) =>
      (
        await apiRequest<PayoutTransferRecord>(
          `${FINANCE_URL}/transfers/${encodeURIComponent(input.transferId)}/finalize`,
          {
            ...jsonRequest({ otp: input.otp }),
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": input.idempotencyKey,
            },
          },
        )
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
}

export function useResendPayoutTransferOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { transferId: string; idempotencyKey: string }) =>
      (
        await apiRequest<PayoutTransferRecord>(
          `${FINANCE_URL}/transfers/${encodeURIComponent(input.transferId)}/resend-otp`,
          { method: "POST", headers: { "Idempotency-Key": input.idempotencyKey } },
        )
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
}

export function useReconcileFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      scope: "all" | "settlements" | "transactions" | "transfers";
      transferId?: string;
      settlementId?: string;
      idempotencyKey: string;
    }) => {
      const { idempotencyKey, ...body } = input;
      return (
        await apiRequest<{
          transactions?: { items: ReconciliationRecord[] };
          settlements?: SettlementRecord[];
          transfers?: PayoutTransferRecord[];
        }>(`${FINANCE_URL}/reconcile`, {
          ...jsonRequest(body),
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
        })
      ).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  });
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function withQuery(path: string, values: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/http/client";
import { customerKeys } from "@/modules/customers/client/keys";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import { orderKeys } from "@/modules/orders/client/keys";
import type { OfflineSalePaymentState } from "@/modules/orders/offline-sale-contract";
import { overviewKeys } from "@/modules/overview/client/keys";

const offlineSalePaymentKeys = {
  all: [...orderKeys.all, "offline-sale-payment"] as const,
  detail: (orderId: string) => [...offlineSalePaymentKeys.all, orderId.trim()] as const,
};

export function offlineSalePaymentQueryOptions(orderId: string) {
  return queryOptions({
    queryKey: offlineSalePaymentKeys.detail(orderId),
    queryFn: ({ signal }) => getOfflineSalePaymentRequest(orderId, signal),
    enabled: Boolean(orderId.trim()),
    staleTime: 1_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "initializing" || status === "initialized" || status === "pending"
        ? 2_000
        : false;
    },
  });
}

export function useVerifyOfflineSalePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyOfflineSalePaymentRequest,
    onSuccess: (payment) => {
      queryClient.setQueryData(offlineSalePaymentKeys.detail(payment.order.id), payment);
      queryClient.setQueryData(orderKeys.detail(payment.order.id), payment.order);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
    },
  });
}

async function getOfflineSalePaymentRequest(
  orderId: string,
  signal?: AbortSignal,
): Promise<OfflineSalePaymentState> {
  const response = await apiRequest<OfflineSalePaymentState>(
    `/api/v1/admin/orders/offline-sales/${encodeURIComponent(orderId)}`,
    { cache: "no-store", signal },
  );
  return response.data;
}

async function verifyOfflineSalePaymentRequest(
  orderId: string,
): Promise<OfflineSalePaymentState> {
  const response = await apiRequest<OfflineSalePaymentState>(
    `/api/v1/admin/orders/offline-sales/${encodeURIComponent(orderId)}/verify`,
    { method: "POST" },
  );
  return response.data;
}

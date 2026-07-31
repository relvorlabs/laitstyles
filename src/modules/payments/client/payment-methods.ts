"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/http/client";
import type { CreatePaymentMethodSetupInput, PaymentMethod, PaymentMethodSetup } from "@/modules/payments/types";

const URL = "/api/v1/account/payment-methods";
export const paymentMethodKeys = {
  all: ["account", "payment-methods"] as const,
  list: () => [...paymentMethodKeys.all, "list"] as const,
  setup: (attemptId: string) => [...paymentMethodKeys.all, "setup", attemptId.trim()] as const,
};

export function paymentMethodsQueryOptions() {
  return queryOptions({
    queryKey: paymentMethodKeys.list(),
    queryFn: async ({ signal }) => (await apiRequest<PaymentMethod[]>(URL, { cache: "no-store", signal })).data,
    staleTime: 15_000,
  });
}

export function paymentMethodSetupQueryOptions(attemptId: string) {
  return queryOptions({
    queryKey: paymentMethodKeys.setup(attemptId),
    queryFn: async ({ signal }) => (await apiRequest<PaymentMethodSetup>(`${URL}/setup/${encodeURIComponent(attemptId)}`, { cache: "no-store", signal })).data,
    enabled: Boolean(attemptId.trim()),
    staleTime: 2_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const refund = query.state.data?.refundStatus;
      return status === "initialized" || status === "pending" || refund === "pending" || refund === "processing" ? 2_000 : false;
    },
  });
}

export function useCreatePaymentMethodSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePaymentMethodSetupInput) => (await apiRequest<PaymentMethodSetup>(URL, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    })).data,
    onSuccess: (setup) => queryClient.setQueryData(paymentMethodKeys.setup(setup.attemptId), setup),
  });
}

export function useVerifyPaymentMethodSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attemptId: string) => (await apiRequest<PaymentMethodSetup>(`${URL}/setup/${encodeURIComponent(attemptId)}/verify`, { method: "POST" })).data,
    onSuccess: (setup) => {
      queryClient.setQueryData(paymentMethodKeys.setup(setup.attemptId), setup);
      queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list() });
    },
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (methodId: string) => (await apiRequest<PaymentMethod>(`${URL}/${encodeURIComponent(methodId)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDefault: true }),
    })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list() }),
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (methodId: string) => (await apiRequest<{ id: string; inactive: true }>(`${URL}/${encodeURIComponent(methodId)}`, { method: "DELETE" })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all }),
  });
}

"use client";

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addCustomerNoteRequest,
  getAdminCustomerRequest,
  listAdminCustomersRequest,
} from "@/modules/customers/client/api";
import { customerKeys } from "@/modules/customers/client/keys";
import type { CustomerListInput } from "@/modules/customers/types";
import { overviewKeys } from "@/modules/overview/client/keys";

export function adminCustomersQueryOptions(input: CustomerListInput) {
  return queryOptions({
    queryKey: customerKeys.list(input),
    queryFn: ({ signal }) => listAdminCustomersRequest(input, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function adminCustomerQueryOptions(customerId: string) {
  return queryOptions({
    queryKey: customerKeys.detail(customerId),
    queryFn: ({ signal }) => getAdminCustomerRequest(customerId, signal),
    enabled: Boolean(customerId.trim()),
    staleTime: 15_000,
  });
}

export function useAddCustomerNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addCustomerNoteRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(result.value.customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
    },
  });
}

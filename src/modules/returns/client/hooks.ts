"use client";

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerKeys } from "@/modules/customers/client/keys";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import { orderKeys } from "@/modules/orders/client/keys";
import { overviewKeys } from "@/modules/overview/client/keys";
import {
  createReturnRequest,
  getAdminReturnRequest,
  listAdminReturnsRequest,
  listEligibleReturnOrdersRequest,
  transitionReturnRequest,
} from "@/modules/returns/client/api";
import { returnKeys } from "@/modules/returns/client/keys";
import type { ReturnListInput } from "@/modules/returns/types";

export function adminReturnsQueryOptions(input: ReturnListInput) {
  return queryOptions({
    queryKey: returnKeys.list(input),
    queryFn: ({ signal }) => listAdminReturnsRequest(input, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function adminReturnQueryOptions(returnId: string) {
  return queryOptions({
    queryKey: returnKeys.detail(returnId),
    queryFn: ({ signal }) => getAdminReturnRequest(returnId, signal),
    enabled: Boolean(returnId.trim()),
    staleTime: 15_000,
  });
}

export function eligibleReturnOrdersQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: returnKeys.eligibleOrders(),
    queryFn: ({ signal }) => listEligibleReturnOrdersRequest(signal),
    enabled,
    staleTime: 15_000,
  });
}

export function useCreateReturn() {
  return useReturnMutation(createReturnRequest, true);
}

export function useTransitionReturn() {
  return useReturnMutation(transitionReturnRequest, false);
}

function useReturnMutation<TVariables>(
  mutationFn: (variables: TVariables) => ReturnType<typeof createReturnRequest>,
  changesEligibility: boolean,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData(
        returnKeys.detail(result.value.returnRecord.id),
        result.value.returnRecord,
      );
      queryClient.invalidateQueries({ queryKey: returnKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
      if (changesEligibility) {
        queryClient.invalidateQueries({ queryKey: returnKeys.eligibleOrders() });
      }
    },
  });
}

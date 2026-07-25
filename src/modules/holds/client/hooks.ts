"use client";

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { customerKeys } from "@/features/admin/customers/data/customer-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import {
  convertHoldRequest,
  extendHoldRequest,
  getAdminHoldRequest,
  listAdminHoldsRequest,
  releaseHoldRequest,
} from "@/modules/holds/client/api";
import { holdKeys } from "@/modules/holds/client/keys";
import type { HoldListInput } from "@/modules/holds/types";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import { orderKeys } from "@/modules/orders/client/keys";

export function adminHoldsQueryOptions(input: HoldListInput) {
  return queryOptions({
    queryKey: holdKeys.list(input),
    queryFn: ({ signal }) => listAdminHoldsRequest(input, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function adminHoldQueryOptions(holdId: string) {
  return queryOptions({
    queryKey: holdKeys.detail(holdId),
    queryFn: ({ signal }) => getAdminHoldRequest(holdId, signal),
    enabled: Boolean(holdId.trim()),
    staleTime: 15_000,
  });
}

export function useExtendHold() {
  return useHoldMutation(extendHoldRequest);
}

export function useReleaseHold() {
  return useHoldMutation(releaseHoldRequest);
}

export function useConvertHold() {
  return useHoldMutation(convertHoldRequest, true);
}

function useHoldMutation<TVariables>(
  mutationFn: (variables: TVariables) => ReturnType<typeof extendHoldRequest>,
  createsOrder = false,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData(holdKeys.detail(result.value.hold.id), result.value.hold);
      queryClient.invalidateQueries({ queryKey: holdKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
      if (createsOrder) {
        queryClient.invalidateQueries({ queryKey: orderKeys.all });
        queryClient.invalidateQueries({ queryKey: customerKeys.all });
      }
    },
  });
}

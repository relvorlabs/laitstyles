"use client";

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { customerKeys } from "@/features/admin/customers/data/customer-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import {
  getAdminOrderRequest,
  listAdminOrdersRequest,
  recordOfflineSaleRequest,
  transitionOrderRequest,
} from "@/modules/orders/client/api";
import { orderKeys } from "@/modules/orders/client/keys";
import type { ControlRoomOrder, OrderListInput } from "@/modules/orders/types";

export function adminOrdersQueryOptions(input: OrderListInput) {
  return queryOptions({
    queryKey: orderKeys.list(input),
    queryFn: ({ signal }) => listAdminOrdersRequest(input, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function adminOrderQueryOptions(orderId: string) {
  return queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: ({ signal }) => getAdminOrderRequest(orderId, signal),
    enabled: Boolean(orderId.trim()),
    staleTime: 15_000,
  });
}

export function useTransitionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transitionOrderRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      const order = result.value.order;
      queryClient.setQueryData<ControlRoomOrder>(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
    },
  });
}

export function useRecordOfflineSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordOfflineSaleRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData(orderKeys.detail(result.value.order.id), result.value.order);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
    },
  });
}

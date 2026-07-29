"use client";

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerKeys } from "@/modules/customers/client/keys";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import {
  getAccountOrderRequest,
  getAdminOrderRequest,
  listAccountOrdersRequest,
  listAdminOrdersRequest,
  listSaleCustomersRequest,
  recordOfflineSaleRequest,
  requestAccountOrderCancellation,
  transitionOrderRequest,
} from "@/modules/orders/client/api";
import { accountOrderKeys, orderKeys } from "@/modules/orders/client/keys";
import type { AccountOrderDetail } from "@/modules/orders/storefront/account-order-contract";
import type { ControlRoomOrder, OrderListInput } from "@/modules/orders/types";
import { overviewKeys } from "@/modules/overview/client/keys";

export function accountOrdersQueryOptions() {
  return queryOptions({
    queryKey: accountOrderKeys.list(),
    queryFn: ({ signal }) => listAccountOrdersRequest(signal),
    staleTime: 15_000,
  });
}

export function accountOrderQueryOptions(orderNumber: string) {
  return queryOptions({
    queryKey: accountOrderKeys.detail(orderNumber),
    queryFn: ({ signal }) => getAccountOrderRequest(orderNumber, signal),
    enabled: Boolean(orderNumber.trim()),
    staleTime: 15_000,
  });
}

export function useRequestAccountOrderCancellation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestAccountOrderCancellation,
    onSuccess: ({ orderNumber }) => {
      queryClient.setQueryData<AccountOrderDetail | null>(
        accountOrderKeys.detail(orderNumber),
        (order) =>
          order
            ? {
                ...order,
                paymentStatus: { code: "cancelled", label: "Cancelled" },
                fulfilmentStatus: { code: "cancelled", label: "Cancelled" },
              }
            : order,
      );
      queryClient.invalidateQueries({ queryKey: accountOrderKeys.all });
    },
  });
}

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

export function saleCustomersQueryOptions() {
  return queryOptions({
    queryKey: orderKeys.saleCustomers(),
    queryFn: ({ signal }) => listSaleCustomersRequest(signal),
    staleTime: 30_000,
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

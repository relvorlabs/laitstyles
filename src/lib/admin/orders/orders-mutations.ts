"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { customersKeys } from "@/lib/admin/customers/customers-query-keys";
import { inventoryKeys } from "@/lib/admin/inventory/inventory-query-keys";
import { ordersKeys } from "@/lib/admin/orders/orders-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type { ControlRoomOrder, OfflineSaleInput, OrderStatus } from "@/lib/admin/shared/types";

function replaceOrderInCache(previous: ControlRoomOrder[] | undefined, order: ControlRoomOrder) {
  return previous?.map((entry) => (entry.id === order.id ? order : entry));
}

export function useTransitionOrder() {
  const { transitionOrder } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, nextStatus }: { orderId: string; nextStatus: OrderStatus }) =>
      Promise.resolve(transitionOrder(orderId, nextStatus)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(ordersKeys.list(), (previous?: ControlRoomOrder[]) =>
          replaceOrderInCache(previous, result.value.order),
        );
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useRecordOfflineSale() {
  const { recordOfflineSale } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OfflineSaleInput) => Promise.resolve(recordOfflineSale(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(ordersKeys.list(), (previous?: ControlRoomOrder[]) => [
          result.value.order,
          ...(previous?.filter((entry) => entry.id !== result.value.order.id) ?? []),
        ]);
        // OfflineSaleSuccess returns only { order, customerId, message } -- no
        // updated products/customers list, even though stock was sold and a
        // walk-in customer may have been created -- invalidate both.
        queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
        queryClient.invalidateQueries({ queryKey: customersKeys.list() });
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

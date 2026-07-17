"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { ordersKeys } from "@/lib/admin/orders/orders-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type { ControlRoomOrder, OrderStatus } from "@/lib/admin/shared/types";

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

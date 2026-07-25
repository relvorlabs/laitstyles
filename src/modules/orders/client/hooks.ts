"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customerKeys } from "@/features/admin/customers/data/customer-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import { recordOfflineSaleRequest } from "@/modules/orders/client/api";
import { orderKeys } from "@/modules/orders/client/keys";

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

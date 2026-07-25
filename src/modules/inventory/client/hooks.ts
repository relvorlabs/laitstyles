"use client";

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import {
  adjustInventoryStockRequest,
  listInventoryProductPage,
  listStockMovements,
} from "@/modules/inventory/client/api";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import type { InventoryProductListInput } from "@/modules/inventory/types";
import { productKeys } from "@/modules/products/client/keys";

export function inventoryProductPageQueryOptions(input: InventoryProductListInput) {
  return queryOptions({
    queryKey: inventoryKeys.products(input),
    queryFn: ({ signal }) => listInventoryProductPage(input, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function stockMovementsQueryOptions(productId?: string) {
  return queryOptions({
    queryKey: inventoryKeys.stockMovements(productId),
    queryFn: ({ signal }) => listStockMovements(productId, signal),
    staleTime: 30_000,
  });
}

export function useAdjustInventoryStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adjustInventoryStockRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.list() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(result.value.movement.productId) });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

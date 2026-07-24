"use client";

import { queryOptions } from "@tanstack/react-query";
import { listStockMovements } from "@/modules/inventory/client/api";
import { inventoryKeys } from "@/modules/inventory/client/keys";

export function stockMovementsQueryOptions(productId?: string) {
  return queryOptions({
    queryKey: inventoryKeys.stockMovements(productId),
    queryFn: ({ signal }) => listStockMovements(productId, signal),
    staleTime: 30_000,
  });
}

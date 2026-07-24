"use client";

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  listInventoryProductPage,
  listStockMovements,
} from "@/modules/inventory/client/api";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import type { InventoryProductListInput } from "@/modules/inventory/types";

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

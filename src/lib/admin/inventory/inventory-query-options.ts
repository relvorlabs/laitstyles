import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { inventoryKeys } from "@/lib/admin/inventory/inventory-query-keys";

export function inventoryProductsQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: inventoryKeys.products(),
    queryFn: () => repositories.inventory.listProducts(),
  });
}

export function inventoryProductQueryOptions(repositories: AdminRepositories, productId: string) {
  return queryOptions({
    queryKey: inventoryKeys.product(productId),
    queryFn: () => repositories.inventory.getProduct(productId),
  });
}

export function inventoryTaxonomyQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: inventoryKeys.taxonomy(),
    queryFn: () => repositories.inventory.listTaxonomy(),
  });
}

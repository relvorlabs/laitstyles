import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { stockMovementsQueryOptions } from "@/modules/inventory/client/hooks";
import {
  adminProductQueryOptions,
  adminProductsQueryOptions,
  productTaxonomyQueryOptions,
} from "@/modules/products/client/hooks";

/** @deprecated Phase 4 consumers should import from the owning domain module. */
export function inventoryProductsQueryOptions(_repositories?: AdminRepositories) {
  return adminProductsQueryOptions();
}

/** @deprecated Phase 4 consumers should import from the owning domain module. */
export function inventoryProductQueryOptions(
  _repositories: AdminRepositories | undefined,
  productId: string,
) {
  return adminProductQueryOptions(productId);
}

/** @deprecated Phase 4 consumers should import from the owning domain module. */
export function inventoryTaxonomyQueryOptions(_repositories?: AdminRepositories) {
  return productTaxonomyQueryOptions();
}

/** @deprecated Phase 4 consumers should import from the owning domain module. */
export function inventoryStockMovementsQueryOptions(
  _repositories?: AdminRepositories,
  productId?: string,
) {
  return stockMovementsQueryOptions(productId);
}

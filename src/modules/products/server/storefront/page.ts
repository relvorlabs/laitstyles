import "server-only";

import { queryStorefrontCataloguePageFromDatabase } from "@/modules/products/server/storefront/page-repository";
import type {
  StorefrontCataloguePage,
  StorefrontCataloguePageQuery,
} from "@/modules/products/server/storefront/page-selection";

export type {
  StorefrontCataloguePage,
  StorefrontCataloguePageQuery,
} from "@/modules/products/server/storefront/page-selection";

export async function queryStorefrontCataloguePage(
  query: StorefrontCataloguePageQuery,
): Promise<StorefrontCataloguePage> {
  return queryStorefrontCataloguePageFromDatabase(query);
}

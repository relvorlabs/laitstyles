import "server-only";

import { queryStorefrontCataloguePageFromDatabase } from "@/server/commerce/catalogue/storefront-page-repository";
import type {
  StorefrontCataloguePage,
  StorefrontCataloguePageQuery,
} from "@/server/commerce/catalogue/storefront-page-selection";

export type {
  StorefrontCataloguePage,
  StorefrontCataloguePageQuery,
} from "@/server/commerce/catalogue/storefront-page-selection";

export async function queryStorefrontCataloguePage(
  query: StorefrontCataloguePageQuery,
): Promise<StorefrontCataloguePage> {
  return queryStorefrontCataloguePageFromDatabase(query);
}

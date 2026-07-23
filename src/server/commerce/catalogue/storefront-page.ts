import "server-only";

import { MAX_STOREFRONT_CATALOGUE_DETAILS } from "@/server/commerce/catalogue/catalogue-limits";
import { listPublishedProducts } from "@/server/commerce/catalogue/catalog-repository";
import {
  selectStorefrontCataloguePage,
  type StorefrontCataloguePage,
  type StorefrontCataloguePageQuery,
} from "@/server/commerce/catalogue/storefront-page-selection";

export type {
  StorefrontCataloguePage,
  StorefrontCataloguePageQuery,
} from "@/server/commerce/catalogue/storefront-page-selection";

export async function queryStorefrontCataloguePage(
  query: StorefrontCataloguePageQuery,
): Promise<StorefrontCataloguePage> {
  const products = await listPublishedProducts({
    colours: query.colours.length ? [...query.colours] : undefined,
    sizes: query.sizes.length ? [...query.sizes] : undefined,
    limit: MAX_STOREFRONT_CATALOGUE_DETAILS,
  });
  return selectStorefrontCataloguePage(products, query);
}

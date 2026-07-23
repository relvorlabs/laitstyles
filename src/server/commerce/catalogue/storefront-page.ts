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
  const hasVariantFacetFilter = query.colours.length > 0 || query.sizes.length > 0;
  const [products, facetMatches] = await Promise.all([
    listPublishedProducts({ limit: MAX_STOREFRONT_CATALOGUE_DETAILS }),
    hasVariantFacetFilter
      ? listPublishedProducts({
          colours: query.colours.length ? [...query.colours] : undefined,
          sizes: query.sizes.length ? [...query.sizes] : undefined,
          limit: MAX_STOREFRONT_CATALOGUE_DETAILS,
        })
      : Promise.resolve(null),
  ]);
  const eligibleProductIds = facetMatches
    ? new Set(facetMatches.map((product) => product.id))
    : undefined;
  return selectStorefrontCataloguePage(products, query, eligibleProductIds);
}

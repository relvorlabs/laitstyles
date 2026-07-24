import "server-only";

import { cache } from "react";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import {
  buildStorefrontCatalog,
  buildStorefrontShellCatalog,
  projectLegacyProduct,
} from "@/features/storefront/shared/catalog-adapter";
import type {
  StorefrontCatalogPayload,
  StorefrontProductPageData,
  StorefrontShellCatalogPayload,
} from "@/features/storefront/shared/catalog-types";
import {
  getPublishedProductBySlug,
  listPublishedProductDetails,
  listPublishedProductSlugs,
  listStorefrontCategories,
} from "@/server/commerce/catalogue/catalog-repository";

export {
  buildStorefrontCatalog,
  buildStorefrontShellCatalog,
  measurementsCmFor,
  projectLegacyProduct,
  projectLegacyProductSummary,
  projectShellProduct,
} from "@/features/storefront/shared/catalog-adapter";

// react.cache keeps one repository round-trip per request. Repository reads use
// explicit catalogue cache tags; the pure adapter only preserves the approved
// client-facing product contract and is not an independent data source.
const getCatalog = cache(async () => {
  const [details, categories] = await Promise.all([
    listPublishedProductDetails(),
    listStorefrontCategories(),
  ]);
  return { details, payload: buildStorefrontCatalog(details, categories) };
});

const getProductDetail = cache((slug: string) => getPublishedProductBySlug(slug));
const getProductSlugs = cache(() => listPublishedProductSlugs());

export async function loadStorefrontCatalog(): Promise<StorefrontCatalogPayload> {
  return (await getCatalog()).payload;
}

export async function loadStorefrontShellCatalog(): Promise<StorefrontShellCatalogPayload> {
  return buildStorefrontShellCatalog((await getCatalog()).payload);
}

export async function loadStorefrontProductSlugs(): Promise<string[]> {
  return getProductSlugs();
}

export async function loadStorefrontProductBySlug(slug: string): Promise<Product | null> {
  return (await loadStorefrontProductPageBySlug(slug))?.product ?? null;
}

export async function loadStorefrontProductPageBySlug(
  slug: string,
): Promise<StorefrontProductPageData | null> {
  const [detail, slugs] = await Promise.all([getProductDetail(slug), getProductSlugs()]);
  if (!detail) return null;

  const publishedIndex = slugs.indexOf(slug);
  const legacyIndex = publishedIndex >= 0 ? publishedIndex : Math.max(20, slugs.length);
  return { product: projectLegacyProduct(detail, legacyIndex), detail };
}

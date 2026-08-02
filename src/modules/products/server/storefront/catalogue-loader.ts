import "server-only";

import { cache } from "react";
import { reportPrerenderSafeServerError } from "@/lib/server-diagnostics";
import {
  buildStorefrontCatalogue,
  projectStorefrontProduct,
} from "@/modules/products/server/storefront/catalogue-projection";
import {
  getPublishedProductBySlug,
  listPublishedProductDetails,
  listPublishedProductSlugs,
  listStorefrontCategories,
} from "@/modules/products/server/storefront/queries";
import { getStorefrontShellCatalogue } from "@/modules/products/server/storefront/shell-query";
import type {
  StorefrontCataloguePayload,
  StorefrontCatalogueProduct,
  StorefrontProductPageData,
  StorefrontShellCataloguePayload,
} from "@/modules/products/storefront/catalogue-contract";

export {
  buildStorefrontCatalogue,
  buildStorefrontShellCatalogue,
  measurementsCmFor,
  projectShellProduct,
  projectStorefrontProduct,
  projectStorefrontProductSummary,
} from "@/modules/products/server/storefront/catalogue-projection";

const unavailableShellCatalogue: StorefrontShellCataloguePayload = {
  availability: "temporarily-unavailable",
  products: [],
  categories: [],
  measurementsCm: {},
  variantOptionsByProductId: {},
};

const getCatalogue = cache(async () => {
  const [details, categories] = await Promise.all([
    listPublishedProductDetails(),
    listStorefrontCategories(),
  ]);
  return { details, payload: buildStorefrontCatalogue(details, categories) };
});

const getProductDetail = cache((slug: string) => getPublishedProductBySlug(slug));
const getProductSlugs = cache(() => listPublishedProductSlugs());

export async function loadStorefrontCatalogue(): Promise<StorefrontCataloguePayload> {
  return (await getCatalogue()).payload;
}

export async function loadStorefrontShellCatalogue(): Promise<StorefrontShellCataloguePayload> {
  try {
    return await getStorefrontShellCatalogue();
  } catch (error: unknown) {
    reportPrerenderSafeServerError("Storefront shell catalogue load failed", {
      scope: "storefront-shell-catalogue",
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return unavailableShellCatalogue;
  }
}

export async function loadStorefrontProductSlugs(): Promise<string[]> {
  return getProductSlugs();
}

export async function loadStorefrontProductBySlug(
  slug: string,
): Promise<StorefrontCatalogueProduct | null> {
  return (await loadStorefrontProductPageBySlug(slug))?.product ?? null;
}

export async function loadStorefrontProductPageBySlug(
  slug: string,
): Promise<StorefrontProductPageData | null> {
  const [detail, slugs] = await Promise.all([getProductDetail(slug), getProductSlugs()]);
  if (!detail) return null;

  const publishedIndex = slugs.indexOf(slug);
  const storefrontIndex = publishedIndex >= 0 ? publishedIndex : Math.max(20, slugs.length);
  return { product: projectStorefrontProduct(detail, storefrontIndex), detail };
}

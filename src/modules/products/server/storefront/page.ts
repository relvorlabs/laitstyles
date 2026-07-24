import "server-only";

import { unstable_cache } from "next/cache";
import type { StorefrontPageData } from "@/lib/storefront/page-data";
import type { StorefrontProduct } from "@/lib/storefront/types";
import {
  buildStorefrontPageData,
  resolveCategoryProducts,
  resolveCollectionProducts,
  resolveRelatedProducts,
} from "@/modules/products/server/storefront/page-query";
import { createStorefrontPageSource } from "@/modules/products/server/storefront/page-repository";

export const storefrontPageSource = createStorefrontPageSource();

const getCachedStorefrontPageData = unstable_cache(
  async () => buildStorefrontPageData(storefrontPageSource),
  ["storefront-page-data-v1"],
  { tags: ["catalogue"], revalidate: 300 },
);

export async function getStorefrontPageData(): Promise<StorefrontPageData> {
  return getCachedStorefrontPageData();
}

export async function getStorefrontCategoryPageData(
  slug: string,
): Promise<{
  category: Awaited<ReturnType<typeof storefrontPageSource.getCategory>>;
  products: StorefrontProduct[];
} | null> {
  return resolveCategoryProducts(storefrontPageSource, slug);
}

export async function getStorefrontCollectionPageData(
  slug: string,
): Promise<{
  collection: Awaited<ReturnType<typeof storefrontPageSource.getCollection>>;
  products: StorefrontProduct[];
} | null> {
  return resolveCollectionProducts(storefrontPageSource, slug);
}

export async function getRelatedStorefrontProducts(
  productId: string,
  category: string,
  limit?: number,
) {
  return resolveRelatedProducts(productId, category, limit);
}

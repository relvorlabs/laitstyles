import "server-only";

import type { StorefrontCategory, StorefrontHomeConfig } from "@/lib/storefront/home-config";
import type { StorefrontProduct } from "@/lib/storefront/types";
import {
  FEATURED_COLLECTION_PRODUCT_LIMIT,
  NEW_ARRIVALS_PRODUCT_LIMIT,
  PUBLIC_COLLECTION_PRODUCT_LIMIT,
  STORE_PRODUCT_LIMIT,
} from "@/modules/products/server/storefront/catalogue-limits";
import {
  getPublishedProductCards,
  getPublishedProductCardsByCategorySlug,
  getPublishedProductCardsByCollectionSlug,
  getPublishedProductCardsByIds,
  getStorefrontCategoryBySlug,
  getStorefrontCollectionBySlug,
  listStorefrontCategoryFacets,
} from "@/modules/products/server/storefront/queries";

export type StorefrontPageSource = {
  getConfig(): Promise<StorefrontHomeConfig>;
  listCategories(): Promise<StorefrontCategory[]>;
  listConfiguredProducts(): Promise<StorefrontProduct[]>;
  listFeaturedCollectionProducts(): Promise<StorefrontProduct[]>;
  listNewArrivalProducts(): Promise<StorefrontProduct[]>;
  getCategory(slug: string): Promise<StorefrontCategory | null>;
  listCategoryProducts(slug: string): Promise<StorefrontProduct[]>;
  getCollection(slug: string): Promise<{ name: string; slug: string } | null>;
  listCollectionProducts(slug: string): Promise<StorefrontProduct[]>;
};

export function createStorefrontPageSource(): StorefrontPageSource {
  return {
    async getConfig() {
      return loadHomeConfig();
    },
    async listCategories() {
      const [configured, facets] = await Promise.all([
        loadHomeCategories(),
        listStorefrontCategoryFacets(),
      ]);
      const facetSlugs = new Set(facets.map((item) => item.slug));
      const configuredBySlug = new Map(configured.map((item) => [item.slug, item]));
      const visibleConfigured = configured.filter((item) => facetSlugs.has(item.slug));
      const uncovered = facets
        .filter((item) => !configuredBySlug.has(item.slug))
        .map((item) => ({
          name: item.name,
          slug: item.slug,
          image: "/product-placeholder.svg",
        }));
      return [...visibleConfigured, ...uncovered];
    },
    async listConfiguredProducts() {
      const config = await loadHomeConfig();
      if (config.showAllProducts) {
        return getPublishedProductCards({ sort: "newest" }, { limit: STORE_PRODUCT_LIMIT });
      }
      return getPublishedProductCardsByIds(config.selectedProductIds, {
        limit: STORE_PRODUCT_LIMIT,
      });
    },
    async listFeaturedCollectionProducts() {
      const config = await loadHomeConfig();
      if (!config.featuredCollectionSlug) return [];
      return getPublishedProductCardsByCollectionSlug(config.featuredCollectionSlug, {
        limit: FEATURED_COLLECTION_PRODUCT_LIMIT,
      });
    },
    async listNewArrivalProducts() {
      return getPublishedProductCards(
        { sort: "newest" },
        { limit: NEW_ARRIVALS_PRODUCT_LIMIT },
      );
    },
    async getCategory(slug) {
      const category = await getStorefrontCategoryBySlug(slug);
      if (!category) return null;
      const configured = (await loadHomeCategories()).find((item) => item.slug === slug);
      return configured ?? { name: category.name, slug: category.slug };
    },
    async listCategoryProducts(slug) {
      return getPublishedProductCardsByCategorySlug(slug, {
        limit: PUBLIC_COLLECTION_PRODUCT_LIMIT,
      });
    },
    async getCollection(slug) {
      return getStorefrontCollectionBySlug(slug);
    },
    async listCollectionProducts(slug) {
      return getPublishedProductCardsByCollectionSlug(slug, {
        limit: PUBLIC_COLLECTION_PRODUCT_LIMIT,
      });
    },
  };
}

async function loadHomeConfig() {
  const module = await import("@/lib/storefront/home-config");
  return module.storefrontHomeConfig;
}

async function loadHomeCategories() {
  const module = await import("@/lib/storefront/home-config");
  return module.storefrontCategories;
}

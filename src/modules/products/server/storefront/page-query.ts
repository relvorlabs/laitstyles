import type { StorefrontPageData } from "@/lib/storefront/page-data";
import type { StorefrontProduct } from "@/lib/storefront/types";
import {
  FEATURED_COLLECTION_PRODUCT_LIMIT,
  NEW_ARRIVALS_PRODUCT_LIMIT,
  STORE_PRODUCT_LIMIT,
} from "@/modules/products/server/storefront/catalogue-limits";
import {
  getPublishedProductCards,
  getPublishedProductCardsByCategory,
  getPublishedProductCardsByIds,
  getStorefrontCategoryBySlug,
  getStorefrontCollectionBySlug,
} from "@/modules/products/server/storefront/queries";
import { selectHomepageCategories } from "@/modules/products/server/storefront/page-selection";
import type { StorefrontPageSource } from "@/modules/products/server/storefront/page-repository";

export async function buildStorefrontPageData(
  source: StorefrontPageSource,
): Promise<StorefrontPageData> {
  const config = await source.getConfig();
  const allCategories = await source.listCategoryTiles();
  const categories = selectHomepageCategories(allCategories, config);

  const featuredProduct = await resolveConfiguredProduct(
    config.featuredProductId,
    source.getProductById,
  );
  const configuredFeaturedCollection = config.featuredCollectionSlug
    ? await getStorefrontCollectionBySlug(config.featuredCollectionSlug)
    : null;
  const featuredCollectionProducts = configuredFeaturedCollection
    ? await source.listProductsByCollection(
        configuredFeaturedCollection.slug,
        FEATURED_COLLECTION_PRODUCT_LIMIT,
      )
    : [];

  const fallbackFeaturedProduct =
    featuredProduct ??
    featuredCollectionProducts[0] ??
    (await source.listProducts(STORE_PRODUCT_LIMIT))[0] ??
    null;
  const featuredCollection = configuredFeaturedCollection
    ? {
        name: configuredFeaturedCollection.name,
        description: `A focused edit of ${configuredFeaturedCollection.name.toLocaleLowerCase("en-NG")}.`,
        products: featuredCollectionProducts,
      }
    : fallbackFeaturedProduct
      ? await resolveFallbackFeaturedCollection(fallbackFeaturedProduct)
      : null;

  const productSelection = config.showAllProducts
    ? await source.listProducts(STORE_PRODUCT_LIMIT)
    : await source.listProductsByIds(config.selectedProductIds, STORE_PRODUCT_LIMIT);
  const products = fallbackFeaturedProduct
    ? dedupeProducts([fallbackFeaturedProduct, ...productSelection]).slice(0, STORE_PRODUCT_LIMIT)
    : productSelection;
  const newArrivals = await source.listProducts(NEW_ARRIVALS_PRODUCT_LIMIT);

  return {
    hero: config.hero,
    promo: config.promo,
    trustItems: config.trustItems,
    products,
    categories,
    featuredCollection,
    newArrivals,
  };
}

async function resolveConfiguredProduct(
  productId: string | null,
  getProductById: (id: string) => Promise<StorefrontProduct | null>,
) {
  return productId ? getProductById(productId) : Promise.resolve(null);
}

async function resolveFallbackFeaturedCollection(product: StorefrontProduct) {
  const category = await getStorefrontCategoryBySlug(slugify(product.category));
  const categoryName = category?.name ?? product.category;
  const products = await getPublishedProductCardsByCategory(categoryName, {
    limit: FEATURED_COLLECTION_PRODUCT_LIMIT,
  });
  return {
    name: `${categoryName} Edit`,
    description: `A focused edit of ${categoryName.toLocaleLowerCase("en-NG")}.`,
    products,
  };
}

export function createDefaultStorefrontPageSource(): StorefrontPageSource {
  return {
    getConfig: async () => {
      const { getStorefrontHomeConfig } = await import("@/lib/storefront/home-config");
      return getStorefrontHomeConfig();
    },
    listCategoryTiles: async () => {
      const { getStorefrontCategories } = await import("@/lib/storefront/home-config");
      return getStorefrontCategories();
    },
    listProducts: (limit) => getPublishedProductCards({ sort: "newest" }, { limit }),
    listProductsByIds: (ids, limit) => getPublishedProductCardsByIds(ids, { limit }),
    listProductsByCollection: async (collectionSlug, limit) => {
      const { getPublishedProductCardsByCollectionSlug } = await import(
        "@/modules/products/server/storefront/queries"
      );
      return getPublishedProductCardsByCollectionSlug(collectionSlug, { limit });
    },
    getProductById: async (id) => {
      const [product] = await getPublishedProductCardsByIds([id], { limit: 1 });
      return product ?? null;
    },
  };
}

function dedupeProducts(products: StorefrontProduct[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-NG")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

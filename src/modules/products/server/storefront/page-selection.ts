import type { StorefrontCategory, StorefrontHomeConfig } from "@/lib/storefront/home-config";
import type { StorefrontProduct } from "@/lib/storefront/types";

export function selectHomepageProducts(
  products: StorefrontProduct[],
  config: StorefrontHomeConfig,
): StorefrontProduct[] {
  if (config.showAllProducts) return products;
  const selected = new Set(config.selectedProductIds);
  return products.filter((product) => selected.has(product.id));
}

export function selectHomepageCategories(
  categories: StorefrontCategory[],
  config: StorefrontHomeConfig,
): StorefrontCategory[] {
  if (config.showAllCategories) return categories;
  const selected = new Set(config.selectedCategorySlugs);
  return categories.filter((category) => selected.has(category.slug));
}

export function resolveFeaturedProduct(
  products: StorefrontProduct[],
  config: StorefrontHomeConfig,
): StorefrontProduct | null {
  if (config.featuredProductId) {
    const configured = products.find((product) => product.id === config.featuredProductId);
    if (configured) return configured;
  }
  return products[0] ?? null;
}

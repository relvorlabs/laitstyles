import type { Product } from "@/features/storefront/shared/catalogue-data";
import type { ProductDetail, ProductVariantOption } from "@/lib/storefront/types";

// Client-safe payload types for the storefront catalogue. The server-only
// loader (catalog-loader.ts) builds these; client components import only the
// types from here, never the loader.

export interface StorefrontCategory {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  productCount: number;
}

export interface StorefrontCatalogPayload {
  products: Product[];
  categories: StorefrontCategory[];
  measurementsCm: Record<string, number>;
  variantOptionsByProductId: Readonly<Record<string, readonly ProductVariantOption[]>>;
}

/**
 * Global shell projection. It keeps card/search/cart compatibility while the
 * server withholds product-detail-only media and copy from the client boundary.
 */
export type StorefrontShellCatalogPayload = StorefrontCatalogPayload;

export interface StorefrontProductPageData {
  product: Product;
  detail: ProductDetail;
}

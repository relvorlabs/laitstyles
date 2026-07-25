import type { ProductDetail, ProductVariantOption } from "@/lib/storefront/types";

export type StorefrontCondition = "A+" | "A" | "B+";
export type StorefrontInventory = "one-of-one" | "variant" | "matching-stock";
export type StorefrontStatus = "available" | "reserved" | "sold";

export interface StorefrontCatalogueProduct {
  id: string;
  databaseId: string;
  slug: string;
  name: string;
  brand: string;
  brandStatus: string;
  category: string;
  type: string;
  style: string;
  price: number;
  referencePrice: number | null;
  condition: StorefrontCondition;
  size: string;
  fit: string;
  colour: string;
  inventory: StorefrontInventory;
  stock: number;
  status: StorefrontStatus;
  new: boolean;
  saved: number;
  flaw: string;
  material: string;
  careInstructions: string;
  images: string[];
  variants?: string[];
}

export interface StorefrontCatalogueCategory {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  productCount: number;
}

export interface StorefrontCataloguePayload {
  products: StorefrontCatalogueProduct[];
  categories: StorefrontCatalogueCategory[];
  measurementsCm: Record<string, number>;
  variantOptionsByProductId: Readonly<Record<string, readonly ProductVariantOption[]>>;
}

/**
 * Global shell projection. It keeps card, search and cart compatibility while
 * withholding product-detail-only media and copy from the client boundary.
 */
export type StorefrontShellCataloguePayload = StorefrontCataloguePayload;

export interface StorefrontProductPageData {
  product: StorefrontCatalogueProduct;
  detail: ProductDetail;
}

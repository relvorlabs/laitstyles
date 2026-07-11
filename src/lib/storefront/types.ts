// Storefront domain model — plain, serializable DTO types shaped for the
// consumer experience and mapped 1:1 from the DB (see docs/storefront-v2/03).
// These are the ONLY product/commerce shapes that cross into client components;
// never a Prisma model, never a row containing cost / internal notes / audit.
//
// Money is integer kobo (see @/lib/money). Enum string unions mirror the DB
// enums (product_inventory_mode, cloudinary_asset_kind, …) using consumer-safe
// values — lifecycle/publication/channel never appear here.

import type { Kobo } from "@/lib/money";

export type InventoryMode = "unique" | "stocked" | "variant";

export type AvailabilityState =
  | "available"
  | "low"
  | "reserved_by_me"
  | "reserved_by_others"
  | "sold_out";

/** Server-computed from stock_levels + live holds — never a client timer. */
export interface Availability {
  state: AvailabilityState;
  /** Units available to buy now. For unique pieces this is 0 or 1. */
  available: number;
  isOneOfOne: boolean;
}

export type ProductImageKind = "cover" | "detail" | "defect";

export interface ProductImage {
  id: string;
  /** Cloudinary secure URL (delivery via next/image + Cloudinary transforms). */
  url: string;
  alt: string;
  kind: ProductImageKind;
  position: number;
  width: number | null;
  height: number | null;
}

export interface Measurement {
  label: string;
  value: string;
  position: number;
}

export interface TaxonomyRef {
  id: string;
  slug: string;
  name: string;
}

export interface ReviewSummary {
  average: number; // 0–5
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ProductVariantOption {
  id: string;
  label: string;
  sku: string | null;
  size: string | null;
  colour: string | null;
  /** null → inherits the product price. */
  price: Kobo | null;
  availability: Availability;
}

/** Fields shared by every product mode. */
interface ProductCommon {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: Kobo;
  /** compare-at / "original" — only present when strictly greater than price. */
  referencePrice: Kobo | null;
  archiveNumber: string | null;
  condition: string | null;
  category: TaxonomyRef | null;
  collection: TaxonomyRef | null;
  cover: ProductImage | null;
}

/** Compact shape for cards, listings, search results, rails, wishlist. */
export type ProductSummary = ProductCommon & {
  mode: InventoryMode;
  sizeLabel: string | null;
  colour: string | null;
  availability: Availability;
};

/** Full shape for the product detail page. */
export type ProductDetail = ProductCommon & {
  description: string;
  media: ProductImage[];
  measurements: Measurement[];
  reviewSummary: ReviewSummary;
} & (
    | {
        mode: "unique";
        sizeLabel: string | null;
        colour: string | null;
        availability: Availability;
      }
    | {
        mode: "stocked";
        sizeLabel: string | null;
        colour: string | null;
        availability: Availability;
      }
    | { mode: "variant"; variants: ProductVariantOption[]; availability: Availability }
  );

export interface TaxonomyWithCount extends TaxonomyRef {
  /** Count of storefront-visible products — never fabricated. */
  productCount: number;
}

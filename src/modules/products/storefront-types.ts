import type { Kobo } from "@/lib/money";

export type StorefrontInventoryMode = "unique" | "stocked" | "variant";
export type CatalogueSort = "newest" | "price_asc" | "price_desc";

export type AvailabilityState =
  | "available"
  | "low"
  | "reserved_by_me"
  | "reserved_by_others"
  | "sold_out";

export interface Availability {
  state: AvailabilityState;
  available: number;
  isOneOfOne: boolean;
}

export type ProductImageKind = "cover" | "detail" | "defect";

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  kind: ProductImageKind;
  position: number;
  width: number | null;
  height: number | null;
  variantId: string | null;
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
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ProductVariantOption {
  id: string;
  label: string;
  sku: string | null;
  size: string | null;
  colour: string | null;
  colourHex: string | null;
  price: Kobo | null;
  availability: Availability;
}

interface ProductCommon {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: Kobo;
  referencePrice: Kobo | null;
  archiveNumber: string | null;
  condition: string | null;
  material: string | null;
  fit: string | null;
  style: string | null;
  category: TaxonomyRef | null;
  collection: TaxonomyRef | null;
  cover: ProductImage | null;
}

export type ProductSummary = ProductCommon & {
  mode: StorefrontInventoryMode;
  sizeLabel: string | null;
  colour: string | null;
  availability: Availability;
};

export type ProductDetail = ProductCommon & {
  description: string;
  media: ProductImage[];
  measurements: Measurement[];
  reviewSummary: ReviewSummary;
  careInstructions: string | null;
  flawNotes: string | null;
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
    | {
        mode: "variant";
        variants: ProductVariantOption[];
        variantMeasurements?: Record<string, Measurement[]>;
        availability: Availability;
      }
  );

export interface TaxonomyWithCount extends TaxonomyRef {
  productCount: number;
}

export interface CategoryWithImage extends TaxonomyWithCount {
  imageUrl: string | null;
}

export type ConditionGrade = "Excellent" | "Good" | "Fair";

export function conditionDisplay(grade: string | null): { label: string; score: number } {
  switch (grade) {
    case "Excellent":
      return { label: "Like new", score: 10 };
    case "Good":
      return { label: "Good", score: 7 };
    case "Fair":
      return { label: "Fair", score: 5 };
    default:
      return { label: grade ?? "Unrated", score: 6 };
  }
}

export interface StorefrontFacetOptions {
  brands: string[];
  conditions: string[];
  colours: string[];
  sizes: string[];
}

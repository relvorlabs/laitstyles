import type { catalog_product_status } from "@prisma/client";
import type { Prisma } from "@/lib/prisma";
import { normalizeVariantMeasurements } from "@/modules/products/server/storefront/variant-measurements";

export const STOREFRONT_CHANNEL = "storefront" as const;
export const PHYSICAL_STORE_CHANNEL = "physical_store" as const;

export const publishedProductWhere = {
  publication: "published",
  lifecycle: "active",
  published_at: { not: null },
  product_channels: { some: { channel: STOREFRONT_CHANNEL } },
} satisfies Prisma.productsWhereInput;

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  reference_price: true,
  brand: true,
  lifecycle: true,
  inventory_mode: true,
  condition: true,
  flaw_notes: true,
  published_at: true,
  updated_at: true,
  catalogue_categories: { select: { name: true } },
  product_variants: {
    select: {
      id: true,
      label: true,
      size: true,
      colour: true,
      price: true,
      status: true,
      bust: true,
      waist: true,
      hips: true,
      length: true,
      stock_levels: {
        select: { available: true },
      },
    },
  },
  stock_levels: {
    where: { variant_id: null },
    select: { available: true },
  },
  product_media: {
    where: { variant_id: null },
    orderBy: { position: "asc" },
    select: {
      kind: true,
      cloudinary_assets: {
        select: {
          alt: true,
          secure_url: true,
          delivery_url: true,
        },
      },
    },
  },
} satisfies Prisma.productsSelect;

export type ProductCardRow = Prisma.productsGetPayload<{
  select: typeof productCardSelect;
}>;

export function getAvailableProductCardVariants(row: ProductCardRow) {
  return row.product_variants
    .map((variant) => ({
      ...variant,
      measurements: normalizeVariantMeasurements({
        bust: variant.bust ?? undefined,
        waist: variant.waist ?? undefined,
        hips: variant.hips ?? undefined,
        length: variant.length ?? undefined,
      }),
      available: variant.stock_levels.reduce((sum, stock) => sum + stock.available, 0),
    }))
    .filter((variant) => variant.status === "available" && variant.available > 0);
}

export function getProductCardAvailability(row: ProductCardRow): number {
  if (row.inventory_mode === "variant") {
    return getAvailableProductCardVariants(row).reduce(
      (sum, variant) => sum + variant.available,
      0,
    );
  }

  return row.stock_levels.reduce((sum, stock) => sum + stock.available, 0);
}

export function isStorefrontEligibleProductCard(row: ProductCardRow): boolean {
  return getProductCardAvailability(row) > 0;
}

export const publishedProductDetailSelect = {
  ...productCardSelect,
  collection_id: true,
  material: true,
  style: true,
  fit: true,
  care_instructions: true,
  packaging_notes: true,
  delivery_restrictions: true,
  catalogue_collections: { select: { name: true } },
  product_variants: {
    select: {
      id: true,
      label: true,
      size: true,
      colour: true,
      price: true,
      status: true,
      bust: true,
      waist: true,
      hips: true,
      length: true,
      product_media: {
        orderBy: { position: "asc" },
        select: {
          cloudinary_assets: {
            select: {
              alt: true,
              secure_url: true,
              delivery_url: true,
            },
          },
        },
      },
      stock_levels: {
        select: { available: true },
      },
    },
  },
  product_measurements: {
    orderBy: { position: "asc" },
    select: {
      label: true,
      value: true,
    },
  },
  reviews: {
    where: { status: "published", verified_purchase: true },
    orderBy: { created_at: "desc" },
    select: {
      rating: true,
      title: true,
      body: true,
      created_at: true,
      profiles: { select: { display_name: true } },
      review_media: {
        orderBy: { position: "asc" },
        select: {
          cloudinary_assets: {
            select: {
              alt: true,
              secure_url: true,
              delivery_url: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.productsSelect;

export type PublishedProductDetailRow = Prisma.productsGetPayload<{
  select: typeof publishedProductDetailSelect;
}>;

export function hasAvailableProductDetailStock(row: PublishedProductDetailRow): boolean {
  if (row.inventory_mode === "variant") {
    return row.product_variants.some(
      (variant) =>
        variant.status === ("available" satisfies catalog_product_status) &&
        variant.stock_levels.some((stock) => stock.available > 0),
    );
  }

  return row.stock_levels.some((stock) => stock.available > 0);
}

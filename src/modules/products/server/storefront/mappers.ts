import "server-only";

import type { Prisma } from "@/lib/prisma";
import type {
  Availability,
  InventoryMode,
  Measurement,
  ProductDetail,
  ProductImage,
  ProductImageKind,
  ProductSummary,
  ProductVariantOption,
  ReviewSummary,
  TaxonomyRef,
} from "@/lib/storefront/types";

export const productSummaryInclude = {
  catalogue_categories: { select: { id: true, slug: true, name: true } },
  catalogue_collections: { select: { id: true, slug: true, name: true } },
  product_media: {
    where: { kind: "product_cover" },
    orderBy: { position: "asc" },
    take: 1,
    include: { cloudinary_assets: true },
  },
  stock_levels: true,
  product_variants: { include: { stock_levels: true } },
} satisfies Prisma.productsInclude;

export const productDetailInclude = {
  catalogue_categories: { select: { id: true, slug: true, name: true } },
  catalogue_collections: { select: { id: true, slug: true, name: true } },
  product_media: { orderBy: { position: "asc" }, include: { cloudinary_assets: true } },
  product_measurements: { orderBy: { position: "asc" } },
  stock_levels: true,
  product_variants: { orderBy: { position: "asc" }, include: { stock_levels: true } },
} satisfies Prisma.productsInclude;

type ProductSummaryRow = Prisma.productsGetPayload<{ include: typeof productSummaryInclude }>;
type ProductDetailRow = Prisma.productsGetPayload<{ include: typeof productDetailInclude }>;
type MediaRow = ProductDetailRow["product_media"][number];
type StockRow = ProductSummaryRow["stock_levels"][number];
type VariantRow = ProductSummaryRow["product_variants"][number];

function decimalToKobo(value: Prisma.Decimal): number {
  return Math.round(value.toNumber() * 100);
}

function referencePriceKobo(
  price: Prisma.Decimal,
  reference: Prisma.Decimal | null,
): number | null {
  if (!reference || reference.lessThanOrEqualTo(price)) return null;
  return decimalToKobo(reference);
}

const imageKindMap: Record<string, ProductImageKind | undefined> = {
  product_cover: "cover",
  product_detail: "detail",
  product_defect: "defect",
};

function mapImage(media: MediaRow): ProductImage | null {
  const kind = imageKindMap[media.kind];
  if (!kind) return null;
  const asset = media.cloudinary_assets;
  return {
    id: media.id,
    url: asset.delivery_url ?? asset.secure_url,
    alt: asset.alt,
    kind,
    position: media.position,
    width: asset.width,
    height: asset.height,
    variantId: media.variant_id,
  };
}

function mapTaxonomy(row: { id: string; slug: string; name: string } | null): TaxonomyRef | null {
  return row ? { id: row.id, slug: row.slug, name: row.name } : null;
}

function deriveAvailability(
  mode: InventoryMode,
  available: number,
  reserved: number,
  lowStockThreshold: number,
): Availability {
  const isOneOfOne = mode === "unique";
  if (available <= 0) {
    return { state: reserved > 0 ? "reserved_by_others" : "sold_out", available: 0, isOneOfOne };
  }
  if (mode !== "unique" && available <= lowStockThreshold) {
    return { state: "low", available, isOneOfOne };
  }
  return { state: "available", available, isOneOfOne };
}

function productStockRow(stockLevels: StockRow[]): StockRow | undefined {
  return stockLevels.find((row) => row.variant_id === null);
}

function productAvailability(
  mode: InventoryMode,
  stockLevels: StockRow[],
  variants: VariantRow[],
  lowStockThreshold: number,
): Availability {
  if (mode === "variant") {
    const available = variants.reduce(
      (sum, variant) => sum + variant.stock_levels.reduce((stockSum, stock) => stockSum + stock.available, 0),
      0,
    );
    const reserved = variants.reduce(
      (sum, variant) => sum + variant.stock_levels.reduce((stockSum, stock) => stockSum + stock.reserved, 0),
      0,
    );
    return deriveAvailability("variant", available, reserved, lowStockThreshold);
  }
  const stock = productStockRow(stockLevels);
  return deriveAvailability(mode, stock?.available ?? 0, stock?.reserved ?? 0, lowStockThreshold);
}

function mapVariant(variant: VariantRow, lowStockThreshold: number): ProductVariantOption {
  const available = variant.stock_levels.reduce((sum, stock) => sum + stock.available, 0);
  const reserved = variant.stock_levels.reduce((sum, stock) => sum + stock.reserved, 0);
  return {
    id: variant.id,
    label: variant.label,
    sku: variant.sku,
    size: variant.size,
    colour: variant.colour,
    colourHex: null,
    price: variant.price ? decimalToKobo(variant.price) : null,
    availability: deriveAvailability("stocked", available, reserved, lowStockThreshold),
  };
}

function mapReviewSummary(reviews: { rating: number }[]): ReviewSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const { rating } of reviews) {
    const normalizedRating = Math.min(5, Math.max(1, rating)) as 1 | 2 | 3 | 4 | 5;
    distribution[normalizedRating] += 1;
    total += normalizedRating;
  }
  const count = reviews.length;
  return { average: count ? total / count : 0, count, distribution };
}

export function mapProductSummary(row: ProductSummaryRow): ProductSummary {
  const mode = row.inventory_mode as InventoryMode;
  const cover = row.product_media[0] ? mapImage(row.product_media[0]) : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    price: decimalToKobo(row.price),
    referencePrice: referencePriceKobo(row.price, row.reference_price),
    archiveNumber: row.archive_number,
    condition: row.condition,
    material: row.material,
    fit: row.fit,
    style: row.style,
    category: mapTaxonomy(row.catalogue_categories),
    collection: mapTaxonomy(row.catalogue_collections),
    cover,
    mode,
    sizeLabel: row.size_label,
    colour: row.colour,
    availability: productAvailability(
      mode,
      row.stock_levels,
      row.product_variants,
      row.low_stock_threshold,
    ),
  };
}

export function mapProductDetail(row: ProductDetailRow): ProductDetail {
  const mode = row.inventory_mode as InventoryMode;
  const media = row.product_media
    .map(mapImage)
    .filter((image): image is ProductImage => image !== null);
  const measurements: Measurement[] = row.product_measurements.map((measurement) => ({
    label: measurement.label,
    value: measurement.value,
    position: measurement.position,
  }));
  const common = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    price: decimalToKobo(row.price),
    referencePrice: referencePriceKobo(row.price, row.reference_price),
    archiveNumber: row.archive_number,
    condition: row.condition,
    material: row.material,
    fit: row.fit,
    style: row.style,
    category: mapTaxonomy(row.catalogue_categories),
    collection: mapTaxonomy(row.catalogue_collections),
    cover: media.find((image) => image.kind === "cover") ?? null,
    description: row.description,
    media,
    measurements,
    reviewSummary: mapReviewSummary([]),
    careInstructions: row.care_instructions,
    flawNotes: row.flaw_notes,
  };
  const availability = productAvailability(
    mode,
    row.stock_levels,
    row.product_variants,
    row.low_stock_threshold,
  );

  if (mode === "variant") {
    return {
      ...common,
      mode: "variant",
      availability,
      variants: row.product_variants.map((variant) => mapVariant(variant, row.low_stock_threshold)),
    };
  }
  return {
    ...common,
    mode,
    availability,
    sizeLabel: row.size_label,
    colour: row.colour,
  };
}

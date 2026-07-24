import type { ProductVariant } from "@/lib/catalog/types";
import type {
  PublishedProductDetailRow,
  ProductCardRow,
} from "@/modules/products/server/storefront/visibility";
import {
  getAvailableProductCardVariants,
  getProductCardAvailability,
} from "@/modules/products/server/storefront/visibility";
import { getProductConditionLabel, getProductStateLabel } from "@/lib/storefront/product-labels";
import type { StorefrontProduct } from "@/lib/storefront/types";

export function mapProductCardRow(row: ProductCardRow): StorefrontProduct {
  const availableVariants = getAvailableProductCardVariants(row);
  const stock = getProductCardAvailability(row);
  const condition = getProductConditionLabel(row.condition);
  const state = getProductStateLabel(row.lifecycle);
  const coverAsset = row.product_media.find((media) => media.kind === "product_cover")
    ?.cloudinary_assets;
  const fallbackAsset = row.product_media[0]?.cloudinary_assets;
  const imageAsset = coverAsset ?? fallbackAsset;
  const fallbackPrice = row.price.toNumber();
  const variantPrices = availableVariants
    .map((variant) => variant.price?.toNumber() ?? fallbackPrice)
    .filter(Number.isFinite);
  const price = variantPrices.length ? Math.min(...variantPrices) : fallbackPrice;
  const sizeLabels = uniqueSorted(availableVariants.map((variant) => variant.size));
  const colorLabels = uniqueSorted(availableVariants.map((variant) => variant.colour));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.catalogue_categories?.name ?? "Uncategorised",
    brand: row.brand ?? "Unlabelled",
    image: imageAsset?.delivery_url ?? imageAsset?.secure_url ?? "/product-placeholder.svg",
    price,
    referencePrice: row.reference_price?.toNumber() ?? null,
    condition,
    state,
    stock,
    available: stock > 0,
    inventoryMode: row.inventory_mode,
    sizeOptions: sizeLabels,
    colourOptions: colorLabels,
    hasVariantPriceRange:
      variantPrices.length > 1 && Math.min(...variantPrices) !== Math.max(...variantPrices),
    publishedAt: row.published_at?.toISOString() ?? row.updated_at.toISOString(),
  };
}

export function mapPublishedProductDetailRow(row: PublishedProductDetailRow): StorefrontProduct {
  const base = mapProductCardRow(row);
  const media = row.product_media.map((entry, index) => ({
    id: `${row.id}-media-${index + 1}`,
    url:
      entry.cloudinary_assets.delivery_url ??
      entry.cloudinary_assets.secure_url ??
      "/product-placeholder.svg",
    alt: entry.cloudinary_assets.alt || row.name,
    kind: entry.kind === "product_defect" ? ("defect" as const) : ("detail" as const),
  }));
  const variants: ProductVariant[] = row.product_variants
    .map((variant) => {
      const available = variant.stock_levels.reduce((sum, stock) => sum + stock.available, 0);
      const image = variant.product_media[0]?.cloudinary_assets;
      return {
        id: variant.id,
        label: variant.label,
        size: variant.size ?? "One size",
        colour: variant.colour ?? "Default",
        price: variant.price?.toNumber() ?? row.price.toNumber(),
        image: image?.delivery_url ?? image?.secure_url ?? null,
        available: variant.status === "available" && available > 0,
        measurements: {
          bust: variant.bust ?? undefined,
          waist: variant.waist ?? undefined,
          hips: variant.hips ?? undefined,
          length: variant.length ?? undefined,
        },
      } satisfies ProductVariant;
    })
    .filter((variant) => variant.available);

  return {
    ...base,
    collection: row.catalogue_collections?.name ?? null,
    material: row.material,
    style: row.style,
    fit: row.fit,
    careInstructions: row.care_instructions,
    packagingNotes: row.packaging_notes,
    deliveryRestrictions: row.delivery_restrictions,
    flawNotes: row.flaw_notes,
    media,
    variants,
    measurements: row.product_measurements.map((measurement) => ({
      label: measurement.label,
      value: measurement.value,
    })),
    reviews: row.reviews.map((review) => ({
      rating: review.rating,
      title: review.title,
      body: review.body,
      author: review.profiles?.display_name ?? "Verified buyer",
      createdAt: review.created_at.toISOString(),
      media: review.review_media.map((entry) => ({
        url:
          entry.cloudinary_assets.delivery_url ??
          entry.cloudinary_assets.secure_url ??
          "/product-placeholder.svg",
        alt: entry.cloudinary_assets.alt || `${row.name} review image`,
      })),
    })),
  };
}

function uniqueSorted(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].toSorted((a, b) =>
    a.localeCompare(b, "en-NG"),
  );
}

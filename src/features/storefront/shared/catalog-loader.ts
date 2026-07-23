import "server-only";

import { cache } from "react";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import { koboToNaira } from "@/lib/money";
import type { CategoryWithImage, ProductDetail, ProductSummary } from "@/lib/storefront/types";
import {
  getPublishedProductBySlug,
  listPublishedProductDetails,
  listPublishedProductSlugs,
  listStorefrontCategories,
} from "@/server/commerce/catalogue/catalog-repository";
import type {
  StorefrontCatalogPayload,
  StorefrontCategory,
  StorefrontProductPageData,
} from "./catalog-types";

// The one storefront catalogue loader: everything the storefront renders comes
// from the Prisma repository (cacheTag "catalogue"). The compatibility Product
// projection preserves the approved UI contract while Phase 4 later simplifies
// client state; it is a pure adapter and is never an independent data source.

function detailVariants(detail: ProductDetail) {
  return detail.mode === "variant" ? detail.variants : [];
}

/** Compatibility condition letter: persisted vocabulary remains authoritative. */
function legacyCondition(value: string | null): Product["condition"] {
  return value === "Excellent" ? "A+" : value === "Fair" ? "B+" : "A";
}

function legacyInventory(mode: ProductSummary["mode"]): Product["inventory"] {
  return mode === "unique" ? "one-of-one" : mode === "stocked" ? "matching-stock" : "variant";
}

function legacyStatus(summary: ProductSummary): Product["status"] {
  return summary.availability.state === "sold_out"
    ? "sold"
    : summary.availability.state === "reserved_by_others"
      ? "reserved"
      : "available";
}

/**
 * Pure compatibility projection for catalogue filtering. Cards ultimately use
 * the full detail-backed product from StorefrontProvider, so this summary shape
 * never invents extra media or variant detail for presentation.
 */
export function projectLegacyProductSummary(summary: ProductSummary, index: number): Product {
  return {
    id: summary.id,
    databaseId: summary.id,
    slug: summary.slug,
    name: summary.name,
    brand: summary.brand ?? "Unbranded",
    brandStatus: summary.brand ? "Branded" : "Unbranded",
    category: summary.collection?.name ?? "Unisex",
    type: summary.category?.name ?? "Pieces",
    style: summary.style ?? "Essentials",
    price: koboToNaira(summary.price),
    referencePrice: summary.referencePrice === null ? null : koboToNaira(summary.referencePrice),
    condition: legacyCondition(summary.condition),
    size: summary.sizeLabel ?? "One size",
    fit: summary.fit ?? summary.sizeLabel ?? "One size",
    colour: summary.colour ?? "",
    inventory: legacyInventory(summary.mode),
    stock: summary.availability.available,
    status: legacyStatus(summary),
    new: index < 20,
    saved: 0,
    flaw: "None",
    material: summary.material ?? "Material not specified",
    careInstructions: "Follow the garment care label.",
    images: summary.cover ? [summary.cover.url] : [],
  };
}

export function projectLegacyProduct(detail: ProductDetail, index: number): Product {
  const variants = detailVariants(detail);
  const sizeLabel = detail.mode === "variant" ? null : detail.sizeLabel;
  const colour = detail.mode === "variant" ? null : detail.colour;
  const summary: ProductSummary = {
    id: detail.id,
    slug: detail.slug,
    name: detail.name,
    brand: detail.brand,
    price: detail.price,
    referencePrice: detail.referencePrice,
    archiveNumber: detail.archiveNumber,
    condition: detail.condition,
    material: detail.material,
    fit: detail.fit,
    style: detail.style,
    category: detail.category,
    collection: detail.collection,
    cover: detail.cover,
    mode: detail.mode,
    sizeLabel,
    colour,
    availability: detail.availability,
  };

  return {
    ...projectLegacyProductSummary(summary, index),
    size:
      sizeLabel ??
      variants
        .map((variant) => variant.size)
        .filter(Boolean)
        .join("–"),
    fit: detail.fit ?? sizeLabel ?? "One size",
    colour: colour ?? variants[0]?.colour ?? "",
    flaw: detail.flawNotes ?? "None",
    material: detail.material ?? "Material not specified",
    careInstructions: detail.careInstructions ?? "Follow the garment care label.",
    images: detail.media.map((image) => image.url),
    ...(detail.mode === "variant"
      ? { variants: variants.map((variant) => variant.size ?? variant.label) }
      : {}),
  };
}

/** First product's cm measurements, parsed from "34 cm"-style values. */
export function measurementsCmFor(detail: ProductDetail | undefined): Record<string, number> {
  if (!detail) return {};
  const entries: [string, number][] = [];
  for (const measurement of detail.measurements) {
    const match = /^([\d.]+)\s*cm$/i.exec(measurement.value.trim());
    if (match) entries.push([measurement.label, Number(match[1])]);
  }
  return Object.fromEntries(entries);
}

export function buildStorefrontCatalog(
  details: readonly ProductDetail[],
  categories: readonly CategoryWithImage[],
): StorefrontCatalogPayload {
  const storefrontCategories: StorefrontCategory[] = categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    imageUrl: category.imageUrl,
    productCount: category.productCount,
  }));
  return {
    products: details.map(projectLegacyProduct),
    categories: storefrontCategories,
    measurementsCm: measurementsCmFor(details[0]),
    variantOptionsByProductId: Object.fromEntries(
      details.map((detail) => [detail.id, detailVariants(detail)]),
    ),
  };
}

// react.cache → one repository round-trip per request; the repository itself is
// cached with cacheTag("catalogue") + cacheLife("minutes"), so writes surface
// after revalidateTag("catalogue") or TTL expiry.
const getCatalog = cache(async () => {
  const [details, categories] = await Promise.all([
    listPublishedProductDetails(),
    listStorefrontCategories(),
  ]);
  return { details, payload: buildStorefrontCatalog(details, categories) };
});

const getProductDetail = cache((slug: string) => getPublishedProductBySlug(slug));
const getProductSlugs = cache(() => listPublishedProductSlugs());

export async function loadStorefrontCatalog(): Promise<StorefrontCatalogPayload> {
  return (await getCatalog()).payload;
}

export async function loadStorefrontProductSlugs(): Promise<string[]> {
  return getProductSlugs();
}

export async function loadStorefrontProductBySlug(slug: string): Promise<Product | null> {
  return (await loadStorefrontProductPageBySlug(slug))?.product ?? null;
}

export async function loadStorefrontProductPageBySlug(
  slug: string,
): Promise<StorefrontProductPageData | null> {
  const [detail, slugs] = await Promise.all([getProductDetail(slug), getProductSlugs()]);
  if (!detail) return null;

  const publishedIndex = slugs.indexOf(slug);
  const legacyIndex = publishedIndex >= 0 ? publishedIndex : Math.max(20, slugs.length);
  return { product: projectLegacyProduct(detail, legacyIndex), detail };
}

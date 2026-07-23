import "server-only";

import { cache } from "react";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import { koboToNaira } from "@/lib/money";
import type { CategoryWithImage, ProductDetail } from "@/lib/storefront/types";
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
// from the Prisma repository (cacheTag "catalogue"). The legacy Product
// projection below exists only for the Generation-1 client providers and dies
// with them in migration Phase 4.

function detailVariants(detail: ProductDetail) {
  return detail.mode === "variant" ? detail.variants : [];
}

/** Legacy condition letter: persisted vocabulary is Excellent/Good/Fair. */
function legacyCondition(value: string | null): Product["condition"] {
  return value === "Excellent" ? "A+" : value === "Fair" ? "B+" : "A";
}

export function projectLegacyProduct(detail: ProductDetail, index: number): Product {
  const variants = detailVariants(detail);
  const sizeLabel = detail.mode === "variant" ? null : detail.sizeLabel;
  const colour = detail.mode === "variant" ? null : detail.colour;
  return {
    id: detail.id,
    databaseId: detail.id,
    slug: detail.slug,
    name: detail.name,
    brand: detail.brand ?? "Unbranded",
    brandStatus: detail.brand ? "Branded" : "Unbranded",
    category: detail.collection?.name ?? "Unisex",
    type: detail.category?.name ?? "Pieces",
    style: detail.style ?? "Essentials",
    price: koboToNaira(detail.price),
    referencePrice: detail.referencePrice === null ? null : koboToNaira(detail.referencePrice),
    condition: legacyCondition(detail.condition),
    size:
      sizeLabel ??
      variants
        .map((variant) => variant.size)
        .filter(Boolean)
        .join("–"),
    fit: detail.fit ?? sizeLabel ?? "One size",
    colour: colour ?? variants[0]?.colour ?? "",
    inventory:
      detail.mode === "unique"
        ? "one-of-one"
        : detail.mode === "stocked"
          ? "matching-stock"
          : "variant",
    stock: detail.availability.available,
    status:
      detail.availability.state === "sold_out"
        ? "sold"
        : detail.availability.state === "reserved_by_others"
          ? "reserved"
          : "available",
    new: index < 20,
    saved: 0,
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

// React cache deduplicates metadata/page reads during one render pass; the
// repository's use-cache entries provide the cross-request minutes TTL.
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
  // A detail and slug entry normally share the same catalogue cache lifetime.
  // If independently refreshed entries briefly disagree, avoid falsely
  // labelling the product "new" in the Phase-4 legacy projection.
  const legacyIndex = publishedIndex >= 0 ? publishedIndex : Math.max(20, slugs.length);
  return { product: projectLegacyProduct(detail, legacyIndex), detail };
}

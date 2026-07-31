import { koboToNaira } from "@/lib/money";
import type {
  StorefrontCatalogueCategory,
  StorefrontCataloguePayload,
  StorefrontCatalogueProduct,
  StorefrontShellCataloguePayload,
} from "@/modules/products/storefront/catalogue-contract";
import type {
  CategoryWithImage,
  ProductDetail,
  ProductSummary,
} from "@/modules/products/storefront-types";

function detailVariants(detail: ProductDetail) {
  return detail.mode === "variant" ? detail.variants : [];
}

function storefrontCondition(value: string | null): StorefrontCatalogueProduct["condition"] {
  if (value === "Excellent") return "A+";
  if (value === "Fair") return "B+";
  return "A";
}

function storefrontInventory(
  mode: ProductSummary["mode"],
): StorefrontCatalogueProduct["inventory"] {
  if (mode === "unique") return "one-of-one";
  if (mode === "stocked") return "matching-stock";
  return "variant";
}

function storefrontStatus(summary: ProductSummary): StorefrontCatalogueProduct["status"] {
  if (summary.availability.state === "sold_out") return "sold";
  if (summary.availability.state === "reserved_by_others") return "reserved";
  return "available";
}

function orderedMediaUrls(detail: ProductDetail): string[] {
  const cover = detail.cover?.url ?? null;
  const urls = detail.media.map((image) => image.url);
  return cover ? [cover, ...urls.filter((url) => url !== cover)] : urls;
}

export function projectStorefrontProductSummary(
  summary: ProductSummary,
  index: number,
): StorefrontCatalogueProduct {
  const defaultImage = summary.cover?.url ?? null;
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
    condition: storefrontCondition(summary.condition),
    size: summary.sizeLabel ?? "One size",
    fit: summary.fit ?? summary.sizeLabel ?? "One size",
    colour: summary.colour ?? "",
    inventory: storefrontInventory(summary.mode),
    stock: summary.availability.available,
    status: storefrontStatus(summary),
    new: index < 20,
    saved: 0,
    flaw: "None",
    material: summary.material ?? "Material not specified",
    careInstructions: "Follow the garment care label.",
    defaultImage,
    images: defaultImage ? [defaultImage] : [],
  };
}

export function projectStorefrontProduct(
  detail: ProductDetail,
  index: number,
): StorefrontCatalogueProduct {
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
    ...projectStorefrontProductSummary(summary, index),
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
    defaultImage: detail.cover?.url ?? null,
    images: orderedMediaUrls(detail),
    ...(detail.mode === "variant"
      ? { variants: variants.map((variant) => variant.size ?? variant.label) }
      : {}),
  };
}

export function projectShellProduct(
  product: StorefrontCatalogueProduct,
): StorefrontCatalogueProduct {
  return {
    ...product,
    images: product.defaultImage ? [product.defaultImage] : [],
    flaw: "",
    careInstructions: "",
    fit: product.size,
    variants: undefined,
  };
}

export function buildStorefrontShellCatalogue(
  payload: StorefrontCataloguePayload,
): StorefrontShellCataloguePayload {
  return {
    products: payload.products.map(projectShellProduct),
    categories: payload.categories,
    measurementsCm: payload.measurementsCm,
    variantOptionsByProductId: payload.variantOptionsByProductId,
  };
}

export function measurementsCmFor(detail: ProductDetail | undefined): Record<string, number> {
  if (!detail) return {};
  const entries: [string, number][] = [];
  for (const measurement of detail.measurements) {
    const match = /^([\d.]+)\s*cm$/i.exec(measurement.value.trim());
    if (match) entries.push([measurement.label, Number(match[1])]);
  }
  return Object.fromEntries(entries);
}

export function buildStorefrontCatalogue(
  details: readonly ProductDetail[],
  categories: readonly CategoryWithImage[],
): StorefrontCataloguePayload {
  const storefrontCategories: StorefrontCatalogueCategory[] = categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    imageUrl: category.imageUrl,
    productCount: category.productCount,
  }));
  return {
    products: details.map(projectStorefrontProduct),
    categories: storefrontCategories,
    measurementsCm: measurementsCmFor(details[0]),
    variantOptionsByProductId: Object.fromEntries(
      details.map((detail) => [detail.id, detailVariants(detail)]),
    ),
  };
}

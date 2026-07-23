import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { type Prisma, prisma } from "@/lib/prisma";
import type {
  CatalogueSort,
  CategoryWithImage,
  InventoryMode,
  ProductDetail,
  ProductSummary,
  StorefrontFacetOptions,
  TaxonomyRef,
} from "@/lib/storefront/types";
import {
  MAX_STOREFRONT_CATALOGUE_DETAILS,
  normalizePublishedProductDetailLimit,
} from "@/server/commerce/catalogue/catalogue-limits";
import {
  mapProductDetail,
  mapProductSummary,
  productDetailInclude,
  productSummaryInclude,
} from "@/server/commerce/catalogue/mappers";
import { groupVariantMeasurements } from "@/server/commerce/catalogue/variant-measurements";
import { publishedProductWhere } from "@/server/commerce/catalogue/visibility";

export interface CatalogueFilters {
  search?: string;
  categoryId?: string;
  collectionId?: string;
  brands?: string[];
  conditions?: string[];
  colours?: string[];
  sizes?: string[];
  modes?: InventoryMode[];
  priceMinNaira?: number;
  priceMaxNaira?: number;
}

export interface CatalogueQuery extends CatalogueFilters {
  sort?: CatalogueSort;
  limit?: number;
  offset?: number;
}

const useStyleSmokeCatalogue = process.env.STOREFRONT_STYLE_SMOKE === "1";
const styleSmokeCategory: TaxonomyRef = {
  id: "019f65c1-74fe-7bd3-8100-000000000001",
  slug: "jeans-denim",
  name: "Jeans & Denim",
};
const styleSmokeCollection: TaxonomyRef = {
  id: "019f65c1-74fe-7bd3-8200-000000000001",
  slug: "vintage-edit",
  name: "The Vintage Edit",
};
const styleSmokeDetail: ProductDetail = {
  id: "019f65c1-74fe-7bd3-8400-000000000001",
  slug: "style-smoke-denim-jacket",
  name: "Style Smoke Denim Jacket",
  brand: "Laitstyles",
  price: 2_850_000,
  referencePrice: 3_200_000,
  archiveNumber: "LST-SMOKE-001",
  condition: "Excellent",
  material: "Cotton denim",
  fit: "Relaxed",
  style: "Vintage",
  category: styleSmokeCategory,
  collection: styleSmokeCollection,
  cover: {
    id: "019f65c1-74fe-7bd3-8500-000000000001",
    url: "/brand/laitstyle-symbol.svg",
    alt: "Laitstyles monogram",
    kind: "cover",
    position: 0,
    width: 136,
    height: 209,
    variantId: null,
  },
  mode: "unique",
  sizeLabel: "M",
  colour: "Indigo",
  availability: { state: "available", available: 1, isOneOfOne: true },
  description: "A deterministic product used only by browser and build verification.",
  media: [
    {
      id: "019f65c1-74fe-7bd3-8500-000000000001",
      url: "/brand/laitstyle-symbol.svg",
      alt: "Laitstyles monogram",
      kind: "cover",
      position: 0,
      width: 136,
      height: 209,
      variantId: null,
    },
  ],
  measurements: [
    { label: "Chest", value: "54 cm", position: 0 },
    { label: "Length", value: "68 cm", position: 1 },
  ],
  reviewSummary: {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  },
  careInstructions: "Follow the garment care label.",
  flawNotes: null,
};
const styleSmokeSummary: ProductSummary = {
  id: styleSmokeDetail.id,
  slug: styleSmokeDetail.slug,
  name: styleSmokeDetail.name,
  brand: styleSmokeDetail.brand,
  price: styleSmokeDetail.price,
  referencePrice: styleSmokeDetail.referencePrice,
  archiveNumber: styleSmokeDetail.archiveNumber,
  condition: styleSmokeDetail.condition,
  material: styleSmokeDetail.material,
  fit: styleSmokeDetail.fit,
  style: styleSmokeDetail.style,
  category: styleSmokeDetail.category,
  collection: styleSmokeDetail.collection,
  cover: styleSmokeDetail.cover,
  mode: styleSmokeDetail.mode,
  sizeLabel: styleSmokeDetail.sizeLabel,
  colour: styleSmokeDetail.colour,
  availability: styleSmokeDetail.availability,
};

function catalogueWhere(filters: CatalogueFilters): Prisma.productsWhereInput {
  const and: Prisma.productsWhereInput[] = [publishedProductWhere()];
  const term = filters.search?.trim();
  if (term) {
    and.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { brand: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ],
    });
  }
  if (filters.categoryId) and.push({ category_id: filters.categoryId });
  if (filters.collectionId) and.push({ collection_id: filters.collectionId });
  if (filters.brands?.length) and.push({ brand: { in: filters.brands } });
  if (filters.conditions?.length) and.push({ condition: { in: filters.conditions } });
  if (filters.colours?.length) {
    and.push({
      OR: [
        { colour: { in: filters.colours } },
        { product_variants: { some: { colour: { in: filters.colours } } } },
      ],
    });
  }
  if (filters.sizes?.length) {
    and.push({
      OR: [
        { size_label: { in: filters.sizes } },
        { product_variants: { some: { size: { in: filters.sizes } } } },
      ],
    });
  }
  if (filters.modes?.length) and.push({ inventory_mode: { in: filters.modes } });
  if (filters.priceMinNaira !== undefined || filters.priceMaxNaira !== undefined) {
    and.push({
      price: {
        ...(filters.priceMinNaira !== undefined ? { gte: filters.priceMinNaira } : {}),
        ...(filters.priceMaxNaira !== undefined ? { lte: filters.priceMaxNaira } : {}),
      },
    });
  }
  return and.length === 1 ? and[0] : { AND: and };
}

function catalogueOrderBy(sort?: CatalogueSort): Prisma.productsOrderByWithRelationInput {
  if (sort === "price_asc") return { price: "asc" };
  if (sort === "price_desc") return { price: "desc" };
  return { created_at: "desc" };
}

function styleSmokeMatches(filters: CatalogueFilters) {
  const term = filters.search?.trim().toLowerCase();
  if (
    term &&
    ![
      styleSmokeSummary.name,
      styleSmokeSummary.brand,
      styleSmokeDetail.description,
      styleSmokeDetail.material,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term)
  ) {
    return false;
  }
  if (filters.categoryId && filters.categoryId !== styleSmokeCategory.id) return false;
  if (filters.collectionId && filters.collectionId !== styleSmokeCollection.id) return false;
  if (filters.brands?.length && !filters.brands.includes(styleSmokeSummary.brand ?? "")) return false;
  if (filters.conditions?.length && !filters.conditions.includes(styleSmokeSummary.condition ?? "")) return false;
  if (filters.colours?.length && !filters.colours.includes(styleSmokeSummary.colour ?? "")) return false;
  if (filters.sizes?.length && !filters.sizes.includes(styleSmokeSummary.sizeLabel ?? "")) return false;
  if (filters.modes?.length && !filters.modes.includes(styleSmokeSummary.mode)) return false;
  const priceNaira = styleSmokeSummary.price / 100;
  if (filters.priceMinNaira !== undefined && priceNaira < filters.priceMinNaira) return false;
  if (filters.priceMaxNaira !== undefined && priceNaira > filters.priceMaxNaira) return false;
  return true;
}

export async function listPublishedProducts(query: CatalogueQuery = {}): Promise<ProductSummary[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  if (useStyleSmokeCatalogue) {
    if (!styleSmokeMatches(query)) return [];
    const offset = Math.max(0, query.offset ?? 0);
    const limit = Math.max(0, query.limit ?? 24);
    return [styleSmokeSummary].slice(offset, offset + limit);
  }
  const rows = await prisma.products.findMany({
    where: catalogueWhere(query),
    include: productSummaryInclude,
    orderBy: catalogueOrderBy(query.sort),
    take: query.limit ?? 24,
    skip: query.offset ?? 0,
  });
  return rows.map(mapProductSummary);
}

export async function countPublishedProducts(filters: CatalogueFilters = {}): Promise<number> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  if (useStyleSmokeCatalogue) return styleSmokeMatches(filters) ? 1 : 0;
  return prisma.products.count({ where: catalogueWhere(filters) });
}

async function attachVariantMeasurements(details: ProductDetail[]): Promise<ProductDetail[]> {
  const variantProducts = details.filter(
    (detail): detail is Extract<ProductDetail, { mode: "variant" }> => detail.mode === "variant",
  );
  const variantIds = variantProducts.flatMap((detail) =>
    detail.variants.map((variant) => variant.id),
  );
  if (variantIds.length === 0 || useStyleSmokeCatalogue) return details;

  const rows = await prisma.product_variant_measurements.findMany({
    where: { variant_id: { in: variantIds } },
    orderBy: [{ variant_id: "asc" }, { position: "asc" }],
  });
  const byVariant = groupVariantMeasurements(rows);
  return details.map((detail) => {
    if (detail.mode !== "variant") return detail;
    const variantMeasurements = Object.fromEntries(
      detail.variants.flatMap((variant) =>
        byVariant[variant.id] ? [[variant.id, byVariant[variant.id]]] : [],
      ),
    );
    return { ...detail, variantMeasurements };
  });
}

export async function listPublishedProductDetails(
  limit: number = MAX_STOREFRONT_CATALOGUE_DETAILS,
): Promise<ProductDetail[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  if (useStyleSmokeCatalogue) return limit > 0 ? [styleSmokeDetail] : [];
  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    include: productDetailInclude,
    orderBy: { created_at: "desc" },
    take: normalizePublishedProductDetailLimit(limit),
  });
  return attachVariantMeasurements(rows.map(mapProductDetail));
}

export async function listPublishedProductSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  if (useStyleSmokeCatalogue) return [styleSmokeDetail.slug];
  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    select: { slug: true },
    orderBy: { created_at: "desc" },
    take: MAX_STOREFRONT_CATALOGUE_DETAILS,
  });
  return rows.map((row) => row.slug);
}

export async function getPublishedProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag("catalogue", `product-${slug}`);
  cacheLife("minutes");
  if (useStyleSmokeCatalogue) return slug === styleSmokeDetail.slug ? styleSmokeDetail : null;
  const row = await prisma.products.findFirst({
    where: { ...publishedProductWhere(), slug },
    include: productDetailInclude,
  });
  if (!row) return null;
  return (await attachVariantMeasurements([mapProductDetail(row)]))[0] ?? null;
}

export async function listStorefrontCategories(): Promise<CategoryWithImage[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  if (useStyleSmokeCatalogue) {
    return [{ ...styleSmokeCategory, imageUrl: null, productCount: 1 }];
  }
  const categories = await prisma.catalogue_categories.findMany({
    orderBy: { position: "asc" },
    select: { id: true, slug: true, name: true, image_url: true },
  });
  const withCounts = await Promise.all(
    categories.map(async (category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      imageUrl: category.image_url,
      productCount: await prisma.products.count({
        where: { AND: [publishedProductWhere(), { category_id: category.id }] },
      }),
    })),
  );
  return withCounts.filter((category) => category.productCount > 0);
}

export async function getStorefrontCategoryBySlug(slug: string): Promise<TaxonomyRef | null> {
  if (useStyleSmokeCatalogue) return slug === styleSmokeCategory.slug ? styleSmokeCategory : null;
  return prisma.catalogue_categories.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
}

export async function getStorefrontCollectionBySlug(slug: string): Promise<TaxonomyRef | null> {
  if (useStyleSmokeCatalogue) {
    return slug === styleSmokeCollection.slug ? styleSmokeCollection : null;
  }
  return prisma.catalogue_collections.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
}

export async function getStorefrontFacets(): Promise<StorefrontFacetOptions> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  if (useStyleSmokeCatalogue) {
    return {
      brands: [styleSmokeSummary.brand ?? "Laitstyles"],
      conditions: [styleSmokeSummary.condition ?? "Excellent"],
      colours: [styleSmokeSummary.colour ?? "Indigo"],
      sizes: [styleSmokeSummary.sizeLabel ?? "M"],
    };
  }
  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    select: {
      brand: true,
      condition: true,
      colour: true,
      size_label: true,
      product_variants: { select: { colour: true, size: true } },
    },
  });
  const brands = new Set<string>();
  const conditions = new Set<string>();
  const colours = new Set<string>();
  const sizes = new Set<string>();
  for (const row of rows) {
    if (row.brand) brands.add(row.brand);
    if (row.condition) conditions.add(row.condition);
    if (row.colour) colours.add(row.colour);
    if (row.size_label) sizes.add(row.size_label);
    for (const variant of row.product_variants) {
      if (variant.colour) colours.add(variant.colour);
      if (variant.size) sizes.add(variant.size);
    }
  }
  return {
    brands: [...brands].sort(),
    conditions: [...conditions].sort(),
    colours: [...colours].sort(),
    sizes: [...sizes].sort(),
  };
}

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { type Prisma, prisma } from "@/lib/prisma";
import type {
  CategoryWithImage,
  ProductDetail,
  ProductSummary,
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
import { publishedProductWhere } from "@/server/commerce/catalogue/visibility";

export type CatalogueSort = "newest" | "price_asc" | "price_desc";

export interface CatalogueFilters {
  search?: string;
  categoryId?: string;
  collectionId?: string;
  brands?: string[];
  conditions?: string[];
  colours?: string[];
  sizes?: string[];
  /** Naira (matching the DB numeric units), inclusive bounds. */
  priceMinNaira?: number;
  priceMaxNaira?: number;
}

export interface CatalogueQuery extends CatalogueFilters {
  sort?: CatalogueSort;
  limit?: number;
  offset?: number;
}

// The dedicated browser smoke test validates route/layout styling, not persistence.
// This explicit CI-only mode keeps those route shells deterministic without attempting
// to recreate Supabase's managed auth schema in a disposable PostgreSQL container.
// Production and normal development always use the real repository below.
const useStyleSmokeCatalogue = process.env.STOREFRONT_STYLE_SMOKE === "1";
const styleSmokeCategory: TaxonomyRef = {
  id: "style-smoke-category",
  slug: "jeans-denim",
  name: "Jeans & Denim",
};
const styleSmokeCollection: TaxonomyRef = {
  id: "style-smoke-collection",
  slug: "vintage-edit",
  name: "The Vintage Edit",
};

// Compose the public-visibility predicate with optional filters using AND, so a
// filter's OR (search) never clobbers the visibility OR. Facet filters use IN /
// range. Basic contains-search for now; Postgres FTS + pg_trgm is a documented
// later refinement (04 §8). Size/colour facets are product-level; variant-level
// facet filtering is a later refinement.
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
  if (filters.colours?.length) and.push({ colour: { in: filters.colours } });
  if (filters.sizes?.length) and.push({ size_label: { in: filters.sizes } });
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

// Public catalogue reads — always scoped by the single publishedProductWhere.
// There is no unscoped variant (docs/storefront-v2/04 §4.1 #5).
export async function listPublishedProducts(query: CatalogueQuery = {}): Promise<ProductSummary[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) return [];

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

  if (useStyleSmokeCatalogue) return 0;

  return prisma.products.count({ where: catalogueWhere(filters) });
}

// The Generation-1 storefront still filters the full catalogue in the browser.
// Keep that bridge bounded until Phase 4 replaces it with paginated server reads.
export async function listPublishedProductDetails(
  limit: number = MAX_STOREFRONT_CATALOGUE_DETAILS,
): Promise<ProductDetail[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) return [];

  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    include: productDetailInclude,
    orderBy: { created_at: "desc" },
    take: normalizePublishedProductDetailLimit(limit),
  });
  return rows.map(mapProductDetail);
}

export async function listPublishedProductSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) return [];

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

  if (useStyleSmokeCatalogue) return null;

  const row = await prisma.products.findFirst({
    where: { ...publishedProductWhere(), slug },
    include: productDetailInclude,
  });
  return row ? mapProductDetail(row) : null;
}

// Categories that contain at least one storefront-visible product, with a real
// (never fabricated) count. Small catalogue → per-category count is fine.
export async function listStorefrontCategories(): Promise<CategoryWithImage[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) return [{ ...styleSmokeCategory, imageUrl: null, productCount: 0 }];

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
  if (useStyleSmokeCatalogue) {
    return slug === styleSmokeCategory.slug ? styleSmokeCategory : null;
  }

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

export interface StorefrontFacetOptions {
  brands: string[];
  conditions: string[];
  colours: string[];
  sizes: string[];
}

// Available facet values among storefront-visible products (product-level).
// Small catalogue → derive distinct values in one query.
export async function getStorefrontFacets(): Promise<StorefrontFacetOptions> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) {
    return { brands: [], conditions: [], colours: [], sizes: [] };
  }

  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    select: { brand: true, condition: true, colour: true, size_label: true },
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
  }
  return {
    brands: [...brands].sort(),
    conditions: [...conditions].sort(),
    colours: [...colours].sort(),
    sizes: [...sizes].sort(),
  };
}

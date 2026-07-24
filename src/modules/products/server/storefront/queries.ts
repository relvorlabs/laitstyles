import "server-only";

import type { CatalogProductSort } from "@/lib/catalog/types";
import { prisma, type Prisma } from "@/lib/prisma";
import type { StorefrontProduct } from "@/lib/storefront/types";
import { mapProductCardRow, mapPublishedProductDetailRow } from "@/modules/products/server/storefront/mappers";
import { STOREFRONT_PRODUCT_LIST_LIMIT } from "@/modules/products/server/storefront/catalogue-limits";
import {
  hasAvailableProductDetailStock,
  isStorefrontEligibleProductCard,
  productCardSelect,
  publishedProductDetailSelect,
  publishedProductWhere,
} from "@/modules/products/server/storefront/visibility";

export type ProductCardPageResult = {
  products: StorefrontProduct[];
  total: number;
};

export type ProductCardQueryOptions = {
  limit?: number;
};

export async function getStorefrontProducts(): Promise<StorefrontProduct[]> {
  return getPublishedProductCards({ sort: "newest" });
}

export async function getStorefrontProductBySlug(
  slug: string,
): Promise<StorefrontProduct | null> {
  const row = await prisma.products.findFirst({
    where: { ...publishedProductWhere, slug },
    select: publishedProductDetailSelect,
  });

  if (!row || !hasAvailableProductDetailStock(row)) return null;
  return mapPublishedProductDetailRow(row);
}

export async function getPublishedProductCards(
  query: { sort?: CatalogProductSort } = {},
  options: ProductCardQueryOptions = {},
): Promise<StorefrontProduct[]> {
  const rows = await prisma.products.findMany({
    where: publishedProductWhere,
    select: productCardSelect,
    orderBy: orderByFor(query.sort ?? "newest"),
    take: normalizeProductLimit(options.limit),
  });

  return rows.filter(isStorefrontEligibleProductCard).map(mapProductCardRow);
}

export async function getPublishedProductCardsPage(
  query: {
    sort?: CatalogProductSort;
    page: number;
    pageSize: number;
  },
): Promise<ProductCardPageResult> {
  const pageSize = Math.max(1, Math.min(query.pageSize, STOREFRONT_PRODUCT_LIST_LIMIT));
  const page = Math.max(1, query.page);
  const orderBy = orderByFor(query.sort ?? "newest");
  const targetStart = (page - 1) * pageSize;
  const targetEnd = targetStart + pageSize;
  const batchSize = Math.min(Math.max(pageSize * 4, 60), STOREFRONT_PRODUCT_LIST_LIMIT);
  const collected: StorefrontProduct[] = [];
  let cursor: { id: string } | undefined;

  while (true) {
    const rows = await prisma.products.findMany({
      where: publishedProductWhere,
      select: productCardSelect,
      orderBy,
      take: batchSize,
      ...(cursor ? { cursor, skip: 1 } : {}),
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      if (isStorefrontEligibleProductCard(row)) {
        collected.push(mapProductCardRow(row));
      }
    }

    cursor = { id: rows.at(-1)?.id ?? "" };
    if (!cursor.id || rows.length < batchSize) break;
  }

  return {
    products: collected.slice(targetStart, targetEnd),
    total: collected.length,
  };
}

export async function getPublishedProductCardsByIds(
  ids: string[],
  options: ProductCardQueryOptions = {},
): Promise<StorefrontProduct[]> {
  if (!ids.length) return [];

  const rows = await prisma.products.findMany({
    where: { ...publishedProductWhere, id: { in: ids } },
    select: productCardSelect,
    take: normalizeProductLimit(options.limit),
  });
  const productsById = new Map(
    rows.filter(isStorefrontEligibleProductCard).map((row) => [row.id, mapProductCardRow(row)]),
  );
  return ids
    .map((id) => productsById.get(id))
    .filter((product): product is StorefrontProduct => Boolean(product));
}

export async function getPublishedProductCardsByCategory(
  category: string,
  options: ProductCardQueryOptions = {},
): Promise<StorefrontProduct[]> {
  const rows = await prisma.products.findMany({
    where: {
      ...publishedProductWhere,
      catalogue_categories: { name: { equals: category, mode: "insensitive" } },
    },
    select: productCardSelect,
    orderBy: [{ published_at: "desc" }, { id: "desc" }],
    take: normalizeProductLimit(options.limit),
  });
  return rows.filter(isStorefrontEligibleProductCard).map(mapProductCardRow);
}

export async function getPublishedProductCardsByCategorySlug(
  categorySlug: string,
  options: ProductCardQueryOptions = {},
): Promise<StorefrontProduct[]> {
  const rows = await prisma.products.findMany({
    where: {
      ...publishedProductWhere,
      catalogue_categories: { slug: categorySlug },
    },
    select: productCardSelect,
    orderBy: [{ published_at: "desc" }, { id: "desc" }],
    take: normalizeProductLimit(options.limit),
  });
  return rows.filter(isStorefrontEligibleProductCard).map(mapProductCardRow);
}

export async function getPublishedProductCardsByCollectionSlug(
  collectionSlug: string,
  options: ProductCardQueryOptions = {},
): Promise<StorefrontProduct[]> {
  const rows = await prisma.products.findMany({
    where: {
      ...publishedProductWhere,
      catalogue_collections: { slug: collectionSlug },
    },
    select: productCardSelect,
    orderBy: [{ published_at: "desc" }, { id: "desc" }],
    take: normalizeProductLimit(options.limit),
  });
  return rows.filter(isStorefrontEligibleProductCard).map(mapProductCardRow);
}

export async function getPublishedProductCardsByProductCollection(
  productId: string,
  options: ProductCardQueryOptions = {},
): Promise<StorefrontProduct[]> {
  const current = await prisma.products.findUnique({
    where: { id: productId },
    select: { collection_id: true },
  });
  if (!current?.collection_id) return [];

  const rows = await prisma.products.findMany({
    where: {
      ...publishedProductWhere,
      collection_id: current.collection_id,
      id: { not: productId },
    },
    select: productCardSelect,
    orderBy: [{ published_at: "desc" }, { id: "desc" }],
    take: normalizeProductLimit(options.limit),
  });
  return rows.filter(isStorefrontEligibleProductCard).map(mapProductCardRow);
}

export async function getPublishedProductCardsByProductCategory(
  productId: string,
  options: ProductCardQueryOptions = {},
): Promise<StorefrontProduct[]> {
  const current = await prisma.products.findUnique({
    where: { id: productId },
    select: { category_id: true },
  });
  if (!current?.category_id) return [];

  const rows = await prisma.products.findMany({
    where: {
      ...publishedProductWhere,
      category_id: current.category_id,
      id: { not: productId },
    },
    select: productCardSelect,
    orderBy: [{ published_at: "desc" }, { id: "desc" }],
    take: normalizeProductLimit(options.limit),
  });
  return rows.filter(isStorefrontEligibleProductCard).map(mapProductCardRow);
}

export async function getPublishedProductCardBySlug(
  slug: string,
): Promise<StorefrontProduct | null> {
  const row = await prisma.products.findFirst({
    where: { ...publishedProductWhere, slug },
    select: productCardSelect,
  });

  if (!row || !isStorefrontEligibleProductCard(row)) return null;
  return mapProductCardRow(row);
}

export async function getPublishedProductSlugs(): Promise<string[]> {
  const rows = await prisma.products.findMany({
    where: publishedProductWhere,
    select: productCardSelect,
    orderBy: [{ published_at: "desc" }, { id: "desc" }],
    take: STOREFRONT_PRODUCT_LIST_LIMIT,
  });

  return rows.filter(isStorefrontEligibleProductCard).map((row) => row.slug);
}

export async function listStorefrontCategoryFacets(): Promise<
  Array<{ name: string; slug: string }>
> {
  const rows = await prisma.catalogue_categories.findMany({
    where: { products: { some: publishedProductWhere } },
    select: {
      name: true,
      slug: true,
      products: {
        where: publishedProductWhere,
        select: productCardSelect,
        take: STOREFRONT_PRODUCT_LIST_LIMIT,
      },
    },
    orderBy: { name: "asc" },
  });

  return rows
    .filter((row) => row.products.some(isStorefrontEligibleProductCard))
    .map(({ name, slug }) => ({ name, slug }));
}

export async function getStorefrontCategoryBySlug(
  slug: string,
): Promise<{ name: string; slug: string } | null> {
  const row = await prisma.catalogue_categories.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });
  return row;
}

export async function getStorefrontCollectionBySlug(
  slug: string,
): Promise<{ name: string; slug: string } | null> {
  const row = await prisma.catalogue_collections.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });
  return row;
}

function normalizeProductLimit(limit: number | undefined): number {
  if (limit === undefined) return STOREFRONT_PRODUCT_LIST_LIMIT;
  return Math.max(1, Math.min(limit, STOREFRONT_PRODUCT_LIST_LIMIT));
}

function orderByFor(sort: CatalogProductSort): Prisma.productsOrderByWithRelationInput[] {
  if (sort === "price-low") return [{ price: "asc" }, { id: "asc" }];
  if (sort === "price-high") return [{ price: "desc" }, { id: "desc" }];
  if (sort === "name") return [{ name: "asc" }, { id: "asc" }];
  return [{ published_at: "desc" }, { id: "desc" }];
}

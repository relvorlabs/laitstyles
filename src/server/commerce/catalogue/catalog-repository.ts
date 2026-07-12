import "server-only";

import { type Prisma, prisma } from "@/lib/prisma";
import type { ProductDetail, ProductSummary } from "@/lib/storefront/types";
import {
  mapProductDetail,
  mapProductSummary,
  productDetailInclude,
  productSummaryInclude,
} from "@/server/commerce/catalogue/mappers";
import { publishedProductWhere } from "@/server/commerce/catalogue/visibility";
import { getActiveStore } from "@/server/commerce/store/active-store";

export type CatalogueSort = "newest" | "price_asc" | "price_desc";

export interface CatalogueQuery {
  search?: string;
  sort?: CatalogueSort;
  limit?: number;
  offset?: number;
}

// Compose the public-visibility predicate with an optional keyword filter using
// AND, so the search OR never clobbers the visibility OR. Basic contains-search
// for now; Postgres FTS + pg_trgm is a documented later refinement (04 §8).
function catalogueWhere(storeId: string, search?: string): Prisma.productsWhereInput {
  const base = publishedProductWhere(storeId);
  const term = search?.trim();
  if (!term) return base;
  return {
    AND: [
      base,
      {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { brand: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
      },
    ],
  };
}

function catalogueOrderBy(sort?: CatalogueSort): Prisma.productsOrderByWithRelationInput {
  if (sort === "price_asc") return { price: "asc" };
  if (sort === "price_desc") return { price: "desc" };
  return { created_at: "desc" };
}

// Public catalogue reads — always scoped by the active store + publishedProductWhere.
// There is no unscoped variant (docs/storefront-v2/04 §4.1 #5).
export async function listPublishedProducts(query: CatalogueQuery = {}): Promise<ProductSummary[]> {
  const store = await getActiveStore();
  const rows = await prisma.products.findMany({
    where: catalogueWhere(store.id, query.search),
    include: productSummaryInclude,
    orderBy: catalogueOrderBy(query.sort),
    take: query.limit ?? 24,
    skip: query.offset ?? 0,
  });
  return rows.map(mapProductSummary);
}

export async function countPublishedProducts(
  query: Pick<CatalogueQuery, "search"> = {},
): Promise<number> {
  const store = await getActiveStore();
  return prisma.products.count({ where: catalogueWhere(store.id, query.search) });
}

export async function getPublishedProductBySlug(slug: string): Promise<ProductDetail | null> {
  const store = await getActiveStore();
  const row = await prisma.products.findFirst({
    where: { ...publishedProductWhere(store.id), slug },
    include: productDetailInclude,
  });
  return row ? mapProductDetail(row) : null;
}

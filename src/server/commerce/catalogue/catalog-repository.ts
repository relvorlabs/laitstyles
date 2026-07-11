import "server-only";

import { prisma } from "@/lib/prisma";
import type { ProductDetail, ProductSummary } from "@/lib/storefront/types";
import {
  mapProductDetail,
  mapProductSummary,
  productDetailInclude,
  productSummaryInclude,
} from "@/server/commerce/catalogue/mappers";
import { publishedProductWhere } from "@/server/commerce/catalogue/visibility";
import { getActiveStore } from "@/server/commerce/store/active-store";

export interface ListPublishedProductsArgs {
  limit?: number;
  offset?: number;
}

// Public catalogue reads — always scoped by the active store + publishedProductWhere.
// There is no unscoped variant (docs/storefront-v2/04 §4.1 #5).
export async function listPublishedProducts(
  args: ListPublishedProductsArgs = {},
): Promise<ProductSummary[]> {
  const store = await getActiveStore();
  const rows = await prisma.products.findMany({
    where: publishedProductWhere(store.id),
    include: productSummaryInclude,
    orderBy: { created_at: "desc" },
    take: args.limit ?? 24,
    skip: args.offset ?? 0,
  });
  return rows.map(mapProductSummary);
}

export async function countPublishedProducts(): Promise<number> {
  const store = await getActiveStore();
  return prisma.products.count({ where: publishedProductWhere(store.id) });
}

export async function getPublishedProductBySlug(slug: string): Promise<ProductDetail | null> {
  const store = await getActiveStore();
  const row = await prisma.products.findFirst({
    where: { ...publishedProductWhere(store.id), slug },
    include: productDetailInclude,
  });
  return row ? mapProductDetail(row) : null;
}

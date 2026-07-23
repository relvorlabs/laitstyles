import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { type Prisma, prisma } from "@/lib/prisma";
import type { ProductSummary } from "@/lib/storefront/types";
import { MAX_STOREFRONT_CATALOGUE_DETAILS } from "@/server/commerce/catalogue/catalogue-limits";
import { listPublishedProducts } from "@/server/commerce/catalogue/catalog-repository";
import { mapProductSummary, productSummaryInclude } from "@/server/commerce/catalogue/mappers";
import {
  buildStorefrontCatalogueWhere,
  storefrontConditionBuckets,
  storefrontInventoryBuckets,
  storefrontStandardOrderBy,
} from "@/server/commerce/catalogue/storefront-page-query";
import {
  selectStorefrontCataloguePage,
  type StorefrontCataloguePage,
  type StorefrontCataloguePageQuery,
} from "@/server/commerce/catalogue/storefront-page-selection";
import { publishedProductWhere } from "@/server/commerce/catalogue/visibility";

const useStyleSmokeCatalogue = process.env.STOREFRONT_STYLE_SMOKE === "1";

async function newestProductIds(): Promise<string[]> {
  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    select: { id: true },
    orderBy: [{ created_at: "desc" }, { id: "asc" }],
    take: 20,
  });
  return rows.map((row) => row.id);
}

async function fetchRows(
  where: Prisma.productsWhereInput,
  skip: number,
  take: number,
  orderBy: Prisma.productsOrderByWithRelationInput[],
): Promise<ProductSummary[]> {
  if (take <= 0) return [];
  const rows = await prisma.products.findMany({
    where,
    include: productSummaryInclude,
    orderBy,
    skip,
    take,
  });
  return rows.map(mapProductSummary);
}

async function fetchAcrossBuckets(
  baseWhere: Prisma.productsWhereInput,
  buckets: readonly Prisma.productsWhereInput[],
  skip: number,
  take: number,
): Promise<ProductSummary[]> {
  const counts = await Promise.all(
    buckets.map((bucket) => prisma.products.count({ where: { AND: [baseWhere, bucket] } })),
  );
  const products: ProductSummary[] = [];
  let remainingSkip = skip;
  let remainingTake = take;

  for (let index = 0; index < buckets.length && remainingTake > 0; index += 1) {
    const count = counts[index];
    if (remainingSkip >= count) {
      remainingSkip -= count;
      continue;
    }
    const rows = await fetchRows(
      { AND: [baseWhere, buckets[index]] },
      remainingSkip,
      Math.min(remainingTake, count - remainingSkip),
      [{ created_at: "desc" }, { id: "asc" }],
    );
    products.push(...rows);
    remainingTake -= rows.length;
    remainingSkip = 0;
  }

  return products;
}

export async function queryStorefrontCataloguePageFromDatabase(
  query: StorefrontCataloguePageQuery,
): Promise<StorefrontCataloguePage> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) {
    const products = await listPublishedProducts({ limit: MAX_STOREFRONT_CATALOGUE_DETAILS });
    return selectStorefrontCataloguePage(products, query);
  }

  const newestIds = query.collection === "new" ? await newestProductIds() : [];
  const where = buildStorefrontCatalogueWhere(query, newestIds);
  const total = await prisma.products.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);
  const skip = (page - 1) * query.pageSize;

  let products: ProductSummary[];
  if (query.sort === "condition") {
    products = await fetchAcrossBuckets(
      where,
      storefrontConditionBuckets,
      skip,
      query.pageSize,
    );
  } else if (query.sort === "one") {
    products = await fetchAcrossBuckets(
      where,
      storefrontInventoryBuckets,
      skip,
      query.pageSize,
    );
  } else {
    products = await fetchRows(
      where,
      skip,
      query.pageSize,
      storefrontStandardOrderBy(query.sort),
    );
  }

  return {
    productIds: products.map((product) => product.id),
    total,
    page,
    pageCount,
  };
}

import "server-only";

import { type Prisma, prisma } from "@/lib/prisma";
import type { ProductSummary } from "@/lib/storefront/types";
import { MAX_STOREFRONT_CATALOGUE_DETAILS } from "@/server/commerce/catalogue/catalogue-limits";
import { listPublishedProducts } from "@/server/commerce/catalogue/catalog-repository";
import { mapProductSummary, productSummaryInclude } from "@/server/commerce/catalogue/mappers";
import {
  selectStorefrontCataloguePage,
  type StorefrontCataloguePage,
  type StorefrontCataloguePageQuery,
  type StorefrontConditionFilter,
  type StorefrontInventoryFilter,
} from "@/server/commerce/catalogue/storefront-page-selection";
import { publishedProductWhere } from "@/server/commerce/catalogue/visibility";

const useStyleSmokeCatalogue = process.env.STOREFRONT_STYLE_SMOKE === "1";

function databaseConditions(conditions: readonly StorefrontConditionFilter[]): Prisma.productsWhereInput[] {
  return conditions.map((condition) => {
    if (condition === "A+") return { condition: "Excellent" };
    if (condition === "B+") return { condition: "Fair" };
    return {
      OR: [{ condition: null }, { condition: { notIn: ["Excellent", "Fair"] } }],
    };
  });
}

function databaseModes(inventories: readonly StorefrontInventoryFilter[]) {
  return inventories.map((inventory) => {
    if (inventory === "one-of-one") return "unique" as const;
    if (inventory === "matching-stock") return "stocked" as const;
    return "variant" as const;
  });
}

function searchWhere(search: string): Prisma.productsWhereInput | null {
  const term = search.trim();
  if (!term) return null;
  const lower = term.toLowerCase();
  const semanticConditions: Prisma.productsWhereInput[] = [];
  if (lower === "a+") semanticConditions.push({ condition: "Excellent" });
  if (lower === "b+") semanticConditions.push({ condition: "Fair" });
  if (lower === "a") {
    semanticConditions.push({
      OR: [{ condition: null }, { condition: { notIn: ["Excellent", "Fair"] } }],
    });
  }
  if ("unbranded".includes(lower)) semanticConditions.push({ brand: null });
  if ("unisex".includes(lower)) semanticConditions.push({ collection_id: null });
  if ("pieces".includes(lower)) semanticConditions.push({ category_id: null });

  return {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { style: { contains: term, mode: "insensitive" } },
      { material: { contains: term, mode: "insensitive" } },
      { colour: { contains: term, mode: "insensitive" } },
      {
        catalogue_categories: {
          is: { name: { contains: term, mode: "insensitive" } },
        },
      },
      {
        catalogue_collections: {
          is: { name: { contains: term, mode: "insensitive" } },
        },
      },
      ...semanticConditions,
    ],
  };
}

async function newestProductIds(): Promise<string[]> {
  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    select: { id: true },
    orderBy: [{ created_at: "desc" }, { id: "asc" }],
    take: 20,
  });
  return rows.map((row) => row.id);
}

async function pageWhere(query: StorefrontCataloguePageQuery): Promise<Prisma.productsWhereInput> {
  const and: Prisma.productsWhereInput[] = [publishedProductWhere()];
  const search = searchWhere(query.search);
  if (search) and.push(search);

  if (query.category) {
    and.push({
      OR: [
        {
          catalogue_categories: {
            is: { name: { equals: query.category, mode: "insensitive" } },
          },
        },
        {
          catalogue_collections: {
            is: { name: { equals: query.category, mode: "insensitive" } },
          },
        },
      ],
    });
  }

  if (query.collection === "new") and.push({ id: { in: await newestProductIds() } });
  if (query.collection === "one-of-one") and.push({ inventory_mode: "unique" });
  if (query.collection === "under-25") and.push({ price: { lt: 25_000 } });
  if (query.collection === "grade-a-plus") and.push({ condition: "Excellent" });
  if (query.collection === "vintage") {
    and.push({ style: { equals: "Vintage", mode: "insensitive" } });
  }

  if (query.conditions.length) and.push({ OR: databaseConditions(query.conditions) });
  if (query.inventories.length) {
    and.push({ inventory_mode: { in: databaseModes(query.inventories) } });
  }
  if (query.inStock) and.push({ stock_levels: { some: { available: { gt: 0 } } } });
  if (query.maxPriceNaira !== undefined) and.push({ price: { lte: query.maxPriceNaira } });
  if (query.colours.length) {
    and.push({
      OR: [
        { colour: { in: [...query.colours] } },
        { product_variants: { some: { colour: { in: [...query.colours] } } } },
      ],
    });
  }
  if (query.sizes.length) {
    and.push({
      OR: [
        { size_label: { in: [...query.sizes] } },
        { product_variants: { some: { size: { in: [...query.sizes] } } } },
      ],
    });
  }

  return and.length === 1 ? and[0] : { AND: and };
}

function standardOrderBy(
  sort: StorefrontCataloguePageQuery["sort"],
): Prisma.productsOrderByWithRelationInput[] {
  if (sort === "price-low") return [{ price: "asc" }, { id: "asc" }];
  if (sort === "price-high") return [{ price: "desc" }, { id: "asc" }];
  return [{ created_at: "desc" }, { id: "asc" }];
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
  if (useStyleSmokeCatalogue) {
    const products = await listPublishedProducts({ limit: MAX_STOREFRONT_CATALOGUE_DETAILS });
    return selectStorefrontCataloguePage(products, query);
  }

  const where = await pageWhere(query);
  const total = await prisma.products.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);
  const skip = (page - 1) * query.pageSize;

  let products: ProductSummary[];
  if (query.sort === "condition") {
    products = await fetchAcrossBuckets(
      where,
      [
        { condition: "Excellent" },
        { OR: [{ condition: null }, { condition: { notIn: ["Excellent", "Fair"] } }] },
        { condition: "Fair" },
      ],
      skip,
      query.pageSize,
    );
  } else if (query.sort === "one") {
    products = await fetchAcrossBuckets(
      where,
      [{ inventory_mode: "unique" }, { inventory_mode: { not: "unique" } }],
      skip,
      query.pageSize,
    );
  } else {
    products = await fetchRows(where, skip, query.pageSize, standardOrderBy(query.sort));
  }

  return {
    productIds: products.map((product) => product.id),
    total,
    page,
    pageCount,
  };
}

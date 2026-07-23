import type { Prisma } from "@/lib/prisma";
import type {
  StorefrontCataloguePageQuery,
  StorefrontConditionFilter,
  StorefrontInventoryFilter,
} from "@/server/commerce/catalogue/storefront-page-selection";
import { publishedProductWhere } from "@/server/commerce/catalogue/visibility";

function databaseConditions(
  conditions: readonly StorefrontConditionFilter[],
): Prisma.productsWhereInput[] {
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

export function buildStorefrontCatalogueWhere(
  query: StorefrontCataloguePageQuery,
  newestIds: readonly string[] = [],
): Prisma.productsWhereInput {
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

  if (query.collection === "new") and.push({ id: { in: [...newestIds] } });
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
  if (query.inStock) {
    and.push({ stock_levels: { some: { available: { gt: 0 } } } });
  }
  if (query.maxPriceNaira !== undefined) {
    and.push({ price: { lte: query.maxPriceNaira } });
  }
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

export function storefrontStandardOrderBy(
  sort: StorefrontCataloguePageQuery["sort"],
): Prisma.productsOrderByWithRelationInput[] {
  if (sort === "price-low") return [{ price: "asc" }, { id: "asc" }];
  if (sort === "price-high") return [{ price: "desc" }, { id: "asc" }];
  return [{ created_at: "desc" }, { id: "asc" }];
}

export const storefrontConditionBuckets = [
  { condition: "Excellent" },
  { OR: [{ condition: null }, { condition: { notIn: ["Excellent", "Fair"] } }] },
  { condition: "Fair" },
] satisfies Prisma.productsWhereInput[];

export const storefrontInventoryBuckets = [
  { inventory_mode: "unique" },
  { inventory_mode: { not: "unique" } },
] satisfies Prisma.productsWhereInput[];

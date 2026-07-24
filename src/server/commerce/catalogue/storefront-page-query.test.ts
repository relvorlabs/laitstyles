import { describe, expect, it } from "vitest";
import {
  buildStorefrontCatalogueWhere,
  storefrontConditionBuckets,
  storefrontInventoryBuckets,
  storefrontStandardOrderBy,
} from "./storefront-page-query";
import type { StorefrontCataloguePageQuery } from "./storefront-page-selection";

function query(
  overrides: Partial<StorefrontCataloguePageQuery> = {},
): StorefrontCataloguePageQuery {
  return {
    page: 1,
    pageSize: 12,
    search: "",
    category: null,
    collection: null,
    conditions: [],
    inventories: [],
    inStock: false,
    maxPriceNaira: undefined,
    sort: "curated",
    colours: [],
    sizes: [],
    ...overrides,
  };
}

function clauses(where: unknown): unknown[] {
  return (where as { AND: unknown[] }).AND;
}

describe("buildStorefrontCatalogueWhere", () => {
  it("translates URL-owned filters into Prisma predicates", () => {
    const where = buildStorefrontCatalogueWhere(
      query({
        category: "Women",
        collection: "new",
        conditions: ["A+", "A"],
        inventories: ["one-of-one", "matching-stock"],
        inStock: true,
        maxPriceNaira: 25_000,
        colours: ["Black"],
        sizes: ["M"],
      }),
      ["new-product"],
    );

    expect(clauses(where)).toEqual(
      expect.arrayContaining([
        { id: { in: ["new-product"] } },
        {
          OR: [
            { condition: "Excellent" },
            {
              OR: [{ condition: null }, { condition: { notIn: ["Excellent", "Fair"] } }],
            },
          ],
        },
        { inventory_mode: { in: ["unique", "stocked"] } },
        { stock_levels: { some: { available: { gt: 0 } } } },
        { price: { lte: 25_000 } },
        {
          OR: [
            { colour: { in: ["Black"] } },
            { product_variants: { some: { colour: { in: ["Black"] } } } },
          ],
        },
        {
          OR: [
            { size_label: { in: ["M"] } },
            { product_variants: { some: { size: { in: ["M"] } } } },
          ],
        },
      ]),
    );
  });

  it("maps special collections and semantic legacy searches", () => {
    expect(
      clauses(buildStorefrontCatalogueWhere(query({ collection: "one-of-one" }))),
    ).toContainEqual({ inventory_mode: "unique" });
    expect(
      clauses(buildStorefrontCatalogueWhere(query({ collection: "under-25" }))),
    ).toContainEqual({ price: { lt: 25_000 } });
    expect(
      clauses(buildStorefrontCatalogueWhere(query({ collection: "grade-a-plus" }))),
    ).toContainEqual({ condition: "Excellent" });
    expect(clauses(buildStorefrontCatalogueWhere(query({ collection: "vintage" })))).toContainEqual(
      { style: { equals: "Vintage", mode: "insensitive" } },
    );

    const search = clauses(buildStorefrontCatalogueWhere(query({ search: "A+" })))[1];
    expect(search).toMatchObject({
      OR: expect.arrayContaining([{ condition: "Excellent" }]),
    });
  });
});

describe("storefront catalogue ordering", () => {
  it("uses stable database ordering and explicit legacy buckets", () => {
    expect(storefrontStandardOrderBy("price-low")).toEqual([{ price: "asc" }, { id: "asc" }]);
    expect(storefrontStandardOrderBy("price-high")).toEqual([{ price: "desc" }, { id: "asc" }]);
    expect(storefrontStandardOrderBy("newest")).toEqual([{ created_at: "desc" }, { id: "asc" }]);
    expect(storefrontConditionBuckets).toHaveLength(3);
    expect(storefrontInventoryBuckets).toEqual([
      { inventory_mode: "unique" },
      { inventory_mode: { not: "unique" } },
    ]);
  });
});

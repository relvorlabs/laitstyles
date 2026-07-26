import { describe, expect, it } from "vitest";
import type { ProductSummary } from "@/modules/products/storefront-types";
import {
  type StorefrontCataloguePageQuery,
  selectStorefrontCataloguePage,
} from "./page-selection";

function product(id: string, overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id,
    slug: id,
    name: `Product ${id}`,
    brand: "Laitstyles",
    price: 3_000_000,
    referencePrice: null,
    archiveNumber: null,
    condition: "Good",
    material: "Cotton",
    fit: "Regular",
    style: "Essentials",
    category: { id: `category-${id}`, slug: "jackets", name: "Jackets" },
    collection: { id: `collection-${id}`, slug: "women", name: "Women" },
    cover: null,
    mode: "stocked",
    sizeLabel: "M",
    colour: "Black",
    availability: { state: "available", available: 2, isOneOfOne: false },
    ...overrides,
  };
}

function query(
  overrides: Partial<StorefrontCataloguePageQuery> = {},
): StorefrontCataloguePageQuery {
  return {
    page: 1,
    pageSize: 2,
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

describe("selectStorefrontCataloguePage", () => {
  it("filters taxonomy, condition, inventory, stock and search before pagination", () => {
    const products = [
      product("match", {
        name: "Vintage Varsity",
        condition: "Excellent",
        style: "Vintage",
        mode: "unique",
        availability: { state: "available", available: 1, isOneOfOne: true },
      }),
      product("wrong-condition", { condition: "Fair", mode: "unique" }),
      product("sold", {
        condition: "Excellent",
        mode: "unique",
        availability: { state: "sold_out", available: 0, isOneOfOne: true },
      }),
      product("men", {
        condition: "Excellent",
        mode: "unique",
        collection: { id: "men", slug: "men", name: "Men" },
      }),
    ];

    expect(
      selectStorefrontCataloguePage(
        products,
        query({
          category: "Women",
          conditions: ["A+"],
          inventories: ["one-of-one"],
          inStock: true,
          search: "varsity",
        }),
      ),
    ).toMatchObject({ productIds: ["match"], total: 1, page: 1, pageCount: 1 });
  });

  it("preserves the special collection semantics", () => {
    const products = Array.from({ length: 22 }, (_, index) =>
      product(String(index), {
        price: index === 0 ? 2_499_900 : 3_000_000,
        condition: index === 1 ? "Excellent" : "Good",
        style: index === 2 ? "Vintage" : "Essentials",
        mode: index === 3 ? "unique" : "stocked",
      }),
    );

    expect(
      selectStorefrontCataloguePage(products, query({ collection: "new", pageSize: 30 })).total,
    ).toBe(20);
    expect(
      selectStorefrontCataloguePage(products, query({ collection: "under-25" })).productIds,
    ).toEqual(["0"]);
    expect(
      selectStorefrontCataloguePage(products, query({ collection: "grade-a-plus" })).productIds,
    ).toEqual(["1"]);
    expect(
      selectStorefrontCataloguePage(products, query({ collection: "vintage" })).productIds,
    ).toEqual(["2"]);
    expect(
      selectStorefrontCataloguePage(products, query({ collection: "one-of-one" })).productIds,
    ).toEqual(["3"]);
  });

  it("preserves global new-arrival positions when SQL facet matches are intersected", () => {
    const products = Array.from({ length: 25 }, (_, index) => product(String(index)));
    const eligible = new Set(["21"]);

    expect(
      selectStorefrontCataloguePage(products, query({ collection: "new", pageSize: 30 }), eligible),
    ).toEqual({ productIds: [], total: 0, page: 1, pageCount: 1 });
  });

  it("sorts and clamps pagination on the server", () => {
    const products = [
      product("high", { price: 4_000_000, condition: "Fair" }),
      product("low", { price: 1_000_000, condition: "Excellent", mode: "unique" }),
      product("middle", { price: 2_000_000, condition: "Good" }),
    ];

    expect(
      selectStorefrontCataloguePage(products, query({ sort: "price-low", page: 2, pageSize: 2 })),
    ).toEqual({ productIds: ["high"], total: 3, page: 2, pageCount: 2 });
    expect(
      selectStorefrontCataloguePage(products, query({ sort: "condition", pageSize: 3 })).productIds,
    ).toEqual(["low", "middle", "high"]);
    expect(
      selectStorefrontCataloguePage(products, query({ sort: "one", pageSize: 3 })).productIds[0],
    ).toBe("low");
  });
});

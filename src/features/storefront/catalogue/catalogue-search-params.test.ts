import { describe, expect, it } from "vitest";
import { catalogueHref, parseCatalogueSearchParams } from "./catalogue-search-params";

describe("parseCatalogueSearchParams", () => {
  it("normalizes the approved catalogue controls into bounded URL state", () => {
    expect(
      parseCatalogueSearchParams({
        page: "3",
        search: " denim ",
        condition: "A+,invalid",
        inventory: "one-of-one,matching-stock,invalid",
        stock: "1",
        max: "25000",
        sort: "price-high",
        colour: ["Navy", "Black,Stone"],
      }),
    ).toMatchObject({
      page: 3,
      search: "denim",
      conditions: ["A+"],
      inventories: ["one-of-one", "matching-stock"],
      inStock: true,
      maxPriceNaira: 25000,
      sort: "price-high",
      colours: ["Navy", "Black", "Stone"],
    });
  });

  it("accepts canonical inventory-mode query values without changing the UI vocabulary", () => {
    expect(parseCatalogueSearchParams({ mode: "unique,stocked,variant" }).inventories).toEqual([
      "one-of-one",
      "matching-stock",
      "variant",
    ]);
  });

  it("falls back safely for invalid pagination, prices and sort", () => {
    expect(parseCatalogueSearchParams({ page: "-2", max: "-1", sort: "random" })).toMatchObject({
      page: 1,
      maxPriceNaira: undefined,
      sort: "curated",
    });
  });
});

describe("catalogueHref", () => {
  it("produces a canonical shareable URL and omits defaults", () => {
    const current = parseCatalogueSearchParams({
      search: "coat",
      category: "Women",
      page: "4",
    });

    expect(catalogueHref(current, { page: 1, search: "" })).toBe("/products?category=Women");
  });
});

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
      maxPriceNaira: 25_000,
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

  it("parses every result-affecting canonical navigation value from one URL", () => {
    expect(
      parseCatalogueSearchParams({
        page: "3",
        search: "leather jacket",
        category: "Women",
        collection: "vintage",
        condition: ["A+", "A"],
        inventory: ["one-of-one", "variant"],
        stock: "1",
        max: "40000",
        sort: "price-low",
        colour: ["Black", "Brown"],
        size: ["M", "L"],
      }),
    ).toMatchObject({
      page: 3,
      search: "leather jacket",
      category: "Women",
      collection: "vintage",
      conditions: ["A+", "A"],
      inventories: ["one-of-one", "variant"],
      inStock: true,
      maxPriceNaira: 40_000,
      sort: "price-low",
      colours: ["Black", "Brown"],
      sizes: ["M", "L"],
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

  it("removes stale values instead of synchronizing them back from component state", () => {
    const current = parseCatalogueSearchParams({
      page: "4",
      category: "Men",
      collection: "new",
      condition: "A",
      sort: "newest",
    });

    expect(
      catalogueHref(current, {
        page: 1,
        category: null,
        collection: "one-of-one",
        conditions: [],
        sort: "curated",
        search: "",
      }),
    ).toBe("/products?collection=one-of-one");
  });

  it("keeps pagination, filters, search and sort in the generated URL", () => {
    const href = catalogueHref(parseCatalogueSearchParams({}), {
      page: 2,
      category: "Unisex",
      conditions: ["A+"],
      inventories: ["variant"],
      inStock: true,
      maxPriceNaira: 25_000,
      search: "denim",
      sort: "price-low",
    });

    expect(href).toContain("page=2");
    expect(href).toContain("search=denim");
    expect(href).toContain("category=Unisex");
    expect(href).toContain("condition=A%2B");
    expect(href).toContain("inventory=variant");
    expect(href).toContain("stock=1");
    expect(href).toContain("max=25000");
    expect(href).toContain("sort=price-low");
  });
});

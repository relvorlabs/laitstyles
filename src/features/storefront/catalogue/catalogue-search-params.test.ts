import { describe, expect, it } from "vitest";
import { catalogueHref, parseCatalogueSearchParams } from "./catalogue-search-params";

describe("parseCatalogueSearchParams", () => {
  it("normalizes URL values into bounded catalogue filters", () => {
    expect(
      parseCatalogueSearchParams({
        page: "3",
        search: " denim ",
        brand: ["Levi's", "Wrangler,Lee"],
        mode: "unique,invalid",
        min: "10000",
        max: "25000",
        sort: "price_desc",
      }),
    ).toMatchObject({
      page: 3,
      search: "denim",
      brands: ["Levi's", "Wrangler", "Lee"],
      modes: ["unique"],
      minPriceNaira: 10000,
      maxPriceNaira: 25000,
      sort: "price_desc",
    });
  });

  it("falls back safely for invalid pagination, prices and sort", () => {
    expect(
      parseCatalogueSearchParams({
        page: "-2",
        min: "not-a-number",
        max: "-1",
        sort: "random",
      }),
    ).toMatchObject({
      page: 1,
      minPriceNaira: undefined,
      maxPriceNaira: undefined,
      sort: "newest",
    });
  });
});

describe("catalogueHref", () => {
  it("produces a canonical shareable URL and omits defaults", () => {
    const current = parseCatalogueSearchParams({
      search: "coat",
      category: "outerwear",
      page: "4",
    });

    expect(catalogueHref(current, { page: 1, search: "" })).toBe(
      "/products?category=outerwear",
    );
  });
});

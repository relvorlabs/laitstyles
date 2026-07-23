import { describe, expect, it } from "vitest";
import { inventoryKeys, productKeys } from "@/features/admin/inventory/data/inventory-keys";
import type { InventoryQuery } from "@/lib/admin/shared/types";

const query: InventoryQuery = {
  search: "  denim  ",
  view: "all",
  mode: "all",
  stock: "all",
  category: "Jeans",
  collection: "all",
  channel: "all",
  sort: "updated-desc",
};

describe("Inventory query keys", () => {
  it("normalises equivalent list inputs into stable keys", () => {
    expect(inventoryKeys.list({ query, page: 1, pageSize: 10 })).toEqual(
      inventoryKeys.list({
        query: { ...query, search: "denim" },
        page: 1,
        pageSize: 10,
      }),
    );
  });

  it("separates filters and pagination that change list results", () => {
    const base = inventoryKeys.list({ query, page: 1, pageSize: 10 });
    const nextPage = inventoryKeys.list({ query, page: 2, pageSize: 10 });
    const category = inventoryKeys.list({
      query: { ...query, category: "Tops" },
      page: 1,
      pageSize: 10,
    });

    expect(nextPage).not.toEqual(base);
    expect(category).not.toEqual(base);
  });

  it("uses stable business IDs for product detail and media keys", () => {
    expect(productKeys.detail(" botanical-jeans ")).toEqual([
      "products",
      "detail",
      "botanical-jeans",
    ]);
    expect(productKeys.media("botanical-jeans")).toEqual([
      "products",
      "detail",
      "botanical-jeans",
      "media",
    ]);
  });
});

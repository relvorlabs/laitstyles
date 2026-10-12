import { describe, expect, it } from "vitest";
import {
  buildInventoryHref,
  defaultInventoryPageSize,
} from "@/modules/inventory/ui/admin/inventory-url";
import { defaultInventoryQuery } from "@/lib/admin/inventory/inventory-selectors";

describe("Inventory URL state", () => {
  it("omits every default value", () => {
    expect(
      buildInventoryHref("/admin/inventory", {
        query: defaultInventoryQuery,
        presentation: "grid",
        productId: null,
        page: 1,
        pageSize: defaultInventoryPageSize,
      }),
    ).toBe("/admin/inventory");
  });

  it("serializes filters, presentation, pagination and open product", () => {
    expect(
      buildInventoryHref("/admin/inventory", {
        query: {
          ...defaultInventoryQuery,
          search: "cream tank",
          view: "low-stock",
          mode: "variant",
          stock: "low-stock",
          category: "Tops",
          collection: "Daily Form",
          channel: "storefront",
          sort: "stock-asc",
        },
        presentation: "table",
        productId: "ribbed-studio-tank",
        page: 3,
        pageSize: 25,
      }),
    ).toBe(
      "/admin/inventory?view=low-stock&q=cream+tank&mode=variant&stock=low-stock&category=Tops&collection=Daily+Form&channel=storefront&sort=stock-asc&presentation=table&page=3&pageSize=25&product=ribbed-studio-tank",
    );
  });
});

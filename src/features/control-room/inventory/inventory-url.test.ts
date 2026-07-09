import { describe, expect, it } from "vitest";
import { buildInventoryHref } from "@/features/control-room/inventory/inventory-url";
import { defaultInventoryQuery } from "@/lib/control-room/inventory-selectors";

describe("Inventory URL state", () => {
  it("omits every default value", () => {
    expect(
      buildInventoryHref("/admin/inventory", {
        query: defaultInventoryQuery,
        presentation: "grid",
        productId: null,
      }),
    ).toBe("/admin/inventory");
  });

  it("serializes the complete shareable workspace state", () => {
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
      }),
    ).toBe(
      "/admin/inventory?view=low-stock&q=cream+tank&mode=variant&stock=low-stock&category=Tops&collection=Daily+Form&channel=storefront&sort=stock-asc&presentation=table&product=ribbed-studio-tank",
    );
  });
});

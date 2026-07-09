import { describe, expect, it } from "vitest";
import {
  defaultInventoryQuery,
  getInventorySummary,
  getProductStock,
  queryInventory,
  validateInventoryProduct,
} from "@/lib/control-room/inventory-selectors";
import { activeControlRoomSeed } from "@/lib/control-room/seed";
import type { UniqueProduct } from "@/lib/control-room/types";

const products = activeControlRoomSeed.products;

describe("Inventory invariants", () => {
  it("accepts every deterministic Inventory seed record", () => {
    for (const product of products) {
      expect(validateInventoryProduct(product)).toEqual({
        ok: true,
        value: product,
      });
    }
  });

  it("keeps Botanical Jeans at the approved quantity truth", () => {
    const product = products.find((item) => item.id === "botanical-jeans");
    expect(product).toBeDefined();
    expect(product && getProductStock(product)).toEqual({
      totalReceived: 50,
      available: 29,
      reserved: 3,
      sold: 18,
      returned: 0,
      damaged: 0,
    });
  });

  it("aggregates variant stock without flattening variant records", () => {
    const product = products.find((item) => item.id === "ribbed-studio-tank");
    expect(product?.inventoryMode).toBe("variant");
    expect(product && getProductStock(product)).toEqual({
      totalReceived: 24,
      available: 9,
      reserved: 2,
      sold: 13,
      returned: 0,
      damaged: 0,
    });
  });

  it("rejects a unique product that represents more than one unit", () => {
    const source = products.find(
      (item): item is UniqueProduct => item.id === "nature-utility-vest",
    );
    expect(source).toBeDefined();
    if (!source) return;

    const invalid: UniqueProduct = {
      ...source,
      stock: {
        totalReceived: 2,
        available: 2,
        reserved: 0,
        sold: 0,
        returned: 0,
        damaged: 0,
      },
    };

    const result = validateInventoryProduct(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((issue) => issue.code === "unique-quantity")).toBe(
        true,
      );
    }
  });
});

describe("Inventory query pipeline", () => {
  it("searches variant SKU and label text", () => {
    const result = queryInventory(products, {
      ...defaultInventoryQuery,
      search: "LS-RST-INK-L",
    });

    expect(result.map((item) => item.product.id)).toEqual([
      "ribbed-studio-tank",
    ]);
  });

  it("treats low stock as a multi-unit warning rather than flagging every unique piece", () => {
    const result = queryInventory(products, {
      ...defaultInventoryQuery,
      view: "low-stock",
    });

    expect(result.map((item) => item.product.id)).toEqual([
      "canvas-carry-tote",
    ]);
  });

  it("keeps sold unique pieces out of the stocked-product out-of-stock view", () => {
    const result = queryInventory(products, {
      ...defaultInventoryQuery,
      view: "out-of-stock",
    });

    expect(result.map((item) => item.product.id)).toEqual([
      "washed-denim-overshirt",
    ]);
  });

  it("derives the Inventory summary from the same product records", () => {
    expect(getInventorySummary(products)).toMatchObject({
      totalProducts: 13,
      availableUnits: 65,
      reservedUnits: 9,
      soldUnits: 65,
      lowStockProducts: 1,
      outOfStockProducts: 1,
      intakeProducts: 1,
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  defaultInventoryQuery,
  getInventoryAttention,
  getInventoryHealth,
  getInventorySummary,
  getProductStock,
  queryInventory,
  validateInventoryDataset,
  validateInventoryProduct,
} from "@/lib/admin/inventory-selectors";
import type { InventoryProduct, UniqueProduct, VariantProduct } from "@/lib/admin/inventory-types";
import { activeControlRoomSeed } from "@/lib/admin/seed";

function productById(id: string) {
  const product = activeControlRoomSeed.products.find((item) => item.id === id);
  if (!product) throw new Error(`Missing test product: ${id}`);
  return product;
}

function variantProductById(id: string): VariantProduct {
  const product = productById(id);
  if (product.inventoryMode !== "variant") {
    throw new Error(`${id} is not a variant product`);
  }
  return product;
}

function uniqueProductById(id: string): UniqueProduct {
  const product = productById(id);
  if (product.inventoryMode !== "unique") {
    throw new Error(`${id} is not a unique product`);
  }
  return product;
}

describe("inventory dataset", () => {
  it("keeps the connected Phase 2 seed internally valid", () => {
    const result = validateInventoryDataset({
      products: activeControlRoomSeed.products,
      stockMovements: activeControlRoomSeed.stockMovements,
      reviews: activeControlRoomSeed.reviews,
    });

    expect(result.ok).toBe(true);
  });

  it("represents Botanical Jeans as a real multi-unit product", () => {
    expect(getProductStock(productById("botanical-jeans"))).toEqual({
      totalReceived: 50,
      available: 29,
      reserved: 3,
      sold: 18,
      returned: 0,
      damaged: 0,
    });
  });

  it("aggregates variant stock without hiding variant-level low stock", () => {
    const product = variantProductById("ribbed-studio-tank");

    expect(getProductStock(product)).toEqual({
      totalReceived: 24,
      available: 9,
      reserved: 2,
      sold: 13,
      returned: 0,
      damaged: 0,
    });
    expect(getInventoryAttention(product)).toContain("low-stock");
    expect(getInventoryHealth(product)).toBe("low-stock");
  });

  it("rejects a unique piece that represents more than one physical unit", () => {
    const product = structuredClone(uniqueProductById("nature-utility-vest"));
    product.stock = {
      totalReceived: 2,
      available: 2,
      reserved: 0,
      sold: 0,
      returned: 0,
      damaged: 0,
    };

    const result = validateInventoryProduct(product);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.map((issue) => issue.code)).toContain("unique-quantity");
    }
  });

  it("reports duplicate references and orphan operational records", () => {
    const products = structuredClone(activeControlRoomSeed.products);
    const duplicate = products.find(
      (product): product is UniqueProduct =>
        product.id === "nature-utility-vest" && product.inventoryMode === "unique",
    );
    if (!duplicate) throw new Error("Missing duplicate-reference fixture");
    duplicate.archiveNumber = "LS-0042";

    const result = validateInventoryDataset({
      products,
      stockMovements: [
        ...activeControlRoomSeed.stockMovements,
        {
          id: "movement-orphan",
          productId: "missing-product",
          variantId: null,
          kind: "adjusted",
          quantity: 1,
          occurredAt: activeControlRoomSeed.asOf,
          actor: "Test",
          note: "Invalid fixture",
        },
      ],
      reviews: activeControlRoomSeed.reviews,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.error.map((issue) => issue.code);
      expect(codes).toContain("duplicate-reference");
      expect(codes).toContain("orphan-stock-movement");
    }
  });
});

describe("inventory query pipeline", () => {
  it("searches variant SKUs through the shared product result set", () => {
    const results = queryInventory(activeControlRoomSeed.products, {
      ...defaultInventoryQuery,
      search: "LS-RST-INK-L",
    });

    expect(results.map((item) => item.product.id)).toEqual(["ribbed-studio-tank"]);
  });

  it("keeps low-stock, sold and out-of-stock saved views distinct", () => {
    const lowStock = queryInventory(activeControlRoomSeed.products, {
      ...defaultInventoryQuery,
      view: "low-stock",
    });
    const sold = queryInventory(activeControlRoomSeed.products, {
      ...defaultInventoryQuery,
      view: "sold",
    });
    const outOfStock = queryInventory(activeControlRoomSeed.products, {
      ...defaultInventoryQuery,
      view: "out-of-stock",
    });

    expect(lowStock.map((item) => item.product.id)).toEqual([
      "ribbed-studio-tank",
      "canvas-carry-tote",
      "verdant-cargo-trousers",
    ]);
    expect(sold.map((item) => item.product.id)).toEqual(["bloom-belted-coat"]);
    expect(outOfStock.map((item) => item.product.id)).toEqual(["washed-denim-overshirt"]);
  });

  it("applies mode, category and price sorting to one ordered result", () => {
    const results = queryInventory(activeControlRoomSeed.products, {
      ...defaultInventoryQuery,
      mode: "stocked",
      category: "Denim",
      sort: "price-asc",
    });

    expect(results.map((item) => item.product.id)).toEqual([
      "washed-denim-overshirt",
      "botanical-jeans",
    ]);
  });

  it("derives the Inventory workspace summary from product truth", () => {
    expect(getInventorySummary(activeControlRoomSeed.products)).toEqual({
      totalProducts: 13,
      liveProducts: 5,
      availableUnits: 65,
      reservedUnits: 9,
      soldUnits: 65,
      lowStockProducts: 3,
      outOfStockProducts: 1,
      intakeProducts: 1,
    });
  });

  it("does not mutate source products while querying", () => {
    const products: InventoryProduct[] = structuredClone(activeControlRoomSeed.products);
    const before = JSON.stringify(products);

    queryInventory(products, {
      ...defaultInventoryQuery,
      sort: "stock-desc",
      search: "field",
    });

    expect(JSON.stringify(products)).toBe(before);
  });
});

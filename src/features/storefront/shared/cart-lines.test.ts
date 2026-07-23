import { describe, expect, it } from "vitest";

import {
  addCartLine,
  type CartProduct,
  type CartSelection,
  cartLineKey,
  cartSubtotal,
  changeCartLineQuantity,
} from "./cart-lines";

const variantProduct = {
  id: "shirt-1",
  price: 30_000,
  stock: 6,
  status: "available",
  inventory: "variant",
} satisfies CartProduct;

const blackMedium = {
  variantId: "black-m",
  variantLabel: "Black / M",
  colour: "Black",
  size: "M",
  unitPriceNaira: 32_500,
  maxQuantity: 5,
} satisfies CartSelection;

const stoneMedium = {
  ...blackMedium,
  variantId: "stone-m",
  variantLabel: "Stone / M",
  colour: "Stone",
} satisfies CartSelection;

describe("cartLineKey", () => {
  it("creates deterministic default and variant keys", () => {
    expect(cartLineKey("shirt-1", null)).toBe("shirt-1:default");
    expect(cartLineKey("shirt-1", "black-m")).toBe("shirt-1:black-m");
  });
});

describe("addCartLine", () => {
  it("increments the matching variant while preserving distinct variants", () => {
    const blackOnce = addCartLine([], variantProduct, blackMedium, 1);
    const withStone = addCartLine(blackOnce, variantProduct, stoneMedium, 1);
    const result = addCartLine(withStone, variantProduct, blackMedium, 2);

    expect(result).toEqual([
      expect.objectContaining({
        key: "shirt-1:black-m",
        qty: 3,
        unitPriceNaira: 32_500,
      }),
      expect.objectContaining({ key: "shirt-1:stone-m", qty: 1 }),
    ]);
    expect(result).not.toBe(withStone);
    expect(withStone[0]?.qty).toBe(1);
  });

  it("ignores unavailable products and variant products without an exact selection", () => {
    const existing = addCartLine([], variantProduct, blackMedium, 1);
    const unavailable = { ...variantProduct, status: "sold" } satisfies CartProduct;

    expect(addCartLine(existing, unavailable, blackMedium, 1)).toBe(existing);
    expect(addCartLine(existing, variantProduct, null, 1)).toBe(existing);
  });

  it("does not duplicate a unique item", () => {
    const uniqueProduct = {
      ...variantProduct,
      id: "unique-1",
      inventory: "one-of-one",
      stock: 1,
    } satisfies CartProduct;
    const once = addCartLine([], uniqueProduct, null, 1);

    expect(addCartLine(once, uniqueProduct, null, 1)).toBe(once);
    expect(once).toEqual([
      expect.objectContaining({ key: "unique-1:default", qty: 1, maxQuantity: 1 }),
    ]);
  });
});

describe("changeCartLineQuantity", () => {
  it("changes only the addressed line and clamps to its own maximum", () => {
    const black = addCartLine([], variantProduct, blackMedium, 1);
    const twoLines = addCartLine(black, variantProduct, stoneMedium, 1);
    const increased = changeCartLineQuantity(twoLines, "shirt-1:black-m", 20);
    const decreased = changeCartLineQuantity(increased, "shirt-1:black-m", -20);

    expect(increased.map(({ key, qty }) => ({ key, qty }))).toEqual([
      { key: "shirt-1:black-m", qty: 5 },
      { key: "shirt-1:stone-m", qty: 1 },
    ]);
    expect(decreased.map(({ key, qty }) => ({ key, qty }))).toEqual([
      { key: "shirt-1:black-m", qty: 1 },
      { key: "shirt-1:stone-m", qty: 1 },
    ]);
  });
});

describe("cartSubtotal", () => {
  it("uses each line's stored unit price", () => {
    const black = addCartLine([], variantProduct, blackMedium, 2);
    const lines = addCartLine(black, variantProduct, stoneMedium, 1);

    expect(cartSubtotal(lines)).toBe(97_500);
  });
});

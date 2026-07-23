import { describe, expect, it } from "vitest";

import type { ProductVariantOption } from "@/lib/storefront/types";
import type { Product } from "./catalogue-data";
import {
  CART_STORAGE_KEY,
  LEGACY_CART_STORAGE_KEY,
  LEGACY_LOCAL_CART_STORAGE_KEY,
  loadPersistedCart,
  normalizePersistedCart,
} from "./cart-persistence";

const variantProduct = {
  id: "shirt-1",
  databaseId: "database-shirt-1",
  slug: "shirt-1",
  name: "Shirt",
  brand: "Laitstyles",
  brandStatus: "Verified",
  category: "Shirts",
  type: "Shirt",
  style: "Resort",
  price: 30_000,
  referencePrice: null,
  condition: "A+",
  size: "M / L",
  fit: "Relaxed",
  colour: "Black / Stone",
  inventory: "variant",
  stock: 7,
  status: "available",
  new: true,
  saved: 0,
  flaw: "None",
  material: "Linen",
  careInstructions: "Cold wash",
  images: ["/shirt.jpg"],
  variants: ["M", "L"],
} satisfies Product;

const stockedProduct = {
  ...variantProduct,
  id: "stocked-1",
  databaseId: "database-stocked-1",
  slug: "stocked-1",
  inventory: "matching-stock",
  stock: 4,
  variants: undefined,
} satisfies Product;

const variants = [
  {
    id: "black-m",
    label: "Black / M",
    sku: "BLACK-M",
    size: "M",
    colour: "Black",
    colourHex: "#202020",
    price: 3_250_000,
    availability: { state: "available", available: 5, isOneOfOne: false },
  },
  {
    id: "stone-m",
    label: "Stone / M",
    sku: "STONE-M",
    size: "M",
    colour: "Stone",
    colourHex: "#8d8a83",
    price: null,
    availability: { state: "low", available: 2, isOneOfOne: false },
  },
  {
    id: "stone-l",
    label: "Stone / L",
    sku: "STONE-L",
    size: "L",
    colour: "Stone",
    colourHex: "#8d8a83",
    price: null,
    availability: { state: "sold_out", available: 0, isOneOfOne: false },
  },
] satisfies ProductVariantOption[];

const products = [variantProduct, stockedProduct];
const variantOptionsByProductId = { [variantProduct.id]: variants };

describe("normalizePersistedCart", () => {
  it("rebuilds valid v2 lines from canonical product and variant data", () => {
    const result = normalizePersistedCart(
      [
        {
          key: "tampered",
          productId: variantProduct.id,
          qty: 9,
          variantId: "black-m",
          variantLabel: "Tampered",
          colour: "Wrong",
          size: "Wrong",
          unitPriceNaira: 1,
          maxQuantity: 99,
        },
      ],
      products,
      variantOptionsByProductId,
    );

    expect(result).toEqual([
      {
        key: "shirt-1:black-m",
        productId: "shirt-1",
        qty: 5,
        variantId: "black-m",
        variantLabel: "Black / M",
        colour: "Black",
        size: "M",
        unitPriceNaira: 32_500,
        maxQuantity: 5,
      },
    ]);
  });

  it("migrates only uniquely resolvable legacy variants and safe default lines", () => {
    const result = normalizePersistedCart(
      [
        { id: "shirt-1", qty: 2, variant: "M" },
        { id: "shirt-1", qty: 2, variant: "Stone / M" },
        { id: "shirt-1", qty: 1, variant: "L" },
        { id: "stocked-1", qty: 3, variant: null },
      ],
      products,
      variantOptionsByProductId,
    );

    expect(result.map(({ key, qty }) => ({ key, qty }))).toEqual([
      { key: "shirt-1:stone-m", qty: 2 },
      { key: "stocked-1:default", qty: 3 },
    ]);
  });

  it("discards malformed, unknown, unavailable, and ambiguous records", () => {
    expect(
      normalizePersistedCart(
        [
          null,
          "bad",
          { productId: "unknown", qty: 1, variantId: null },
          { productId: "shirt-1", qty: 1, variantId: "stone-l" },
          { id: "shirt-1", qty: 1, variant: "M" },
          { id: "shirt-1", qty: 0, variant: "Black / M" },
        ],
        products,
        variantOptionsByProductId,
      ),
    ).toEqual([]);
    expect(normalizePersistedCart({ not: "an array" }, products, variantOptionsByProductId)).toEqual(
      [],
    );
  });
});

describe("loadPersistedCart", () => {
  it("prefers v2 storage and safely falls back through v1 session and legacy local storage", () => {
    const values = new Map<string, string>([
      [CART_STORAGE_KEY, JSON.stringify([{ productId: "stocked-1", qty: 2, variantId: null }])],
      [LEGACY_CART_STORAGE_KEY, JSON.stringify([{ id: "stocked-1", qty: 3, variant: null }])],
    ]);
    const session = { getItem: (key: string) => values.get(key) ?? null };
    const local = {
      getItem: (key: string) =>
        key === LEGACY_LOCAL_CART_STORAGE_KEY
          ? JSON.stringify([{ id: "stocked-1", qty: 4, variant: null }])
          : null,
    };

    expect(loadPersistedCart(session, local, products, variantOptionsByProductId)[0]?.qty).toBe(2);
    values.delete(CART_STORAGE_KEY);
    expect(loadPersistedCart(session, local, products, variantOptionsByProductId)[0]?.qty).toBe(3);
    values.delete(LEGACY_CART_STORAGE_KEY);
    expect(loadPersistedCart(session, local, products, variantOptionsByProductId)[0]?.qty).toBe(4);
  });

  it("returns an empty cart when stored JSON is malformed", () => {
    const storage = { getItem: () => "not-json" };

    expect(loadPersistedCart(storage, storage, products, variantOptionsByProductId)).toEqual([]);
  });
});

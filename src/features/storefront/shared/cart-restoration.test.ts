import { describe, expect, it } from "vitest";
import type { ProductVariantOption } from "@/lib/storefront/types";
import { restoreCartLines } from "./cart-restoration";
import type { Product } from "./catalogue-data";

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

describe("restoreCartLines", () => {
  it("rebuilds variant lines from canonical product and availability data", () => {
    expect(
      restoreCartLines(
        [{ productId: variantProduct.id, variantId: "black-m", quantity: 9 }],
        products,
        variantOptionsByProductId,
      ),
    ).toEqual([
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

  it("resolves a unique legacy label or size token but rejects ambiguity", () => {
    const result = restoreCartLines(
      [
        { productId: "shirt-1", variantId: "M", quantity: 2 },
        { productId: "shirt-1", variantId: "Stone / M", quantity: 2 },
        { productId: "shirt-1", variantId: "L", quantity: 1 },
        { productId: "stocked-1", variantId: null, quantity: 3 },
      ],
      products,
      variantOptionsByProductId,
    );

    expect(result.map(({ key, qty }) => ({ key, qty }))).toEqual([
      { key: "shirt-1:stone-m", qty: 2 },
      { key: "stocked-1:default", qty: 3 },
    ]);
  });

  it("discards unknown products, sold-out variants and invalid variant intent", () => {
    expect(
      restoreCartLines(
        [
          { productId: "unknown", variantId: null, quantity: 1 },
          { productId: "shirt-1", variantId: "stone-l", quantity: 1 },
          { productId: "shirt-1", variantId: null, quantity: 1 },
        ],
        products,
        variantOptionsByProductId,
      ),
    ).toEqual([]);
  });

  it("accepts canonical database identifiers for non-variant products", () => {
    expect(
      restoreCartLines(
        [{ productId: "database-stocked-1", variantId: null, quantity: 2 }],
        products,
        variantOptionsByProductId,
      ),
    ).toEqual([
      {
        key: "stocked-1:default",
        productId: "stocked-1",
        qty: 2,
        variantId: null,
        variantLabel: null,
        colour: null,
        size: null,
        unitPriceNaira: 30_000,
        maxQuantity: 4,
      },
    ]);
  });
});

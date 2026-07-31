import { describe, expect, it } from "vitest";
import { projectCartIntents } from "@/modules/cart/cart-projection";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import type { StorefrontCartIntent } from "@/modules/storefront-shell/client/storefront-client-state";

const intent: StorefrontCartIntent = {
  productId: "11111111-1111-4111-8111-111111111111",
  variantId: null,
  quantity: 1,
};

const product: Product = {
  id: intent.productId,
  databaseId: intent.productId,
  slug: "linen-shirt",
  name: "Linen shirt",
  brand: "Laitstyles",
  brandStatus: "Branded",
  category: "The Edit",
  type: "Shirts",
  style: "Minimal",
  price: 25_000,
  referencePrice: null,
  condition: "A+",
  size: "M",
  fit: "Regular",
  colour: "Cream",
  inventory: "one-of-one",
  stock: 1,
  status: "available",
  new: false,
  saved: 0,
  flaw: "None",
  material: "Linen",
  careInstructions: "Hand wash",
  defaultImage: null,
  images: [],
};

describe("projectCartIntents", () => {
  it("preserves an intent when its product cannot be projected", () => {
    expect(projectCartIntents([intent], [], {})).toEqual({
      lines: [],
      unresolved: [intent],
    });
  });

  it("projects a matching product without unresolved intent", () => {
    expect(projectCartIntents([intent], [product], {})).toEqual({
      lines: [
        expect.objectContaining({
          productId: product.id,
          qty: 1,
          unitPriceNaira: product.price,
        }),
      ],
      unresolved: [],
    });
  });

  it("preserves a variant intent until its selected variant is available", () => {
    const variantProduct: Product = {
      ...product,
      inventory: "variant",
      stock: 2,
      variants: ["M"],
    };
    const variantIntent = { ...intent, variantId: "variant-m" };

    expect(projectCartIntents([variantIntent], [variantProduct], {})).toEqual({
      lines: [],
      unresolved: [variantIntent],
    });
  });
});

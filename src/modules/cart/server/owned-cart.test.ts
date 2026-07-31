import { describe, expect, it } from "vitest";
import { mergeCartIntents } from "@/modules/cart/server/owned-cart";

describe("mergeCartIntents", () => {
  it("keeps the largest quantity for the same product selection", () => {
    expect(
      mergeCartIntents(
        [{ productId: "product-a", variantId: null, quantity: 1 }],
        [{ productId: "product-a", variantId: null, quantity: 3 }],
      ),
    ).toEqual([{ productId: "product-a", variantId: null, quantity: 3 }]);
  });

  it("keeps different variants as separate lines", () => {
    expect(
      mergeCartIntents(
        [{ productId: "product-a", variantId: "variant-a", quantity: 1 }],
        [{ productId: "product-a", variantId: "variant-b", quantity: 2 }],
      ),
    ).toEqual([
      { productId: "product-a", variantId: "variant-a", quantity: 1 },
      { productId: "product-a", variantId: "variant-b", quantity: 2 },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import {
  cartMaximumForOwner,
  mergeCartIntents,
} from "@/modules/cart/server/owned-cart";

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

describe("cartMaximumForOwner", () => {
  it("retains a unique item reserved by the current customer", () => {
    expect(cartMaximumForOwner("unique", 0, 1)).toBe(1);
  });

  it("combines available and customer-owned reserved stock for stocked selections", () => {
    expect(cartMaximumForOwner("stocked", 2, 3)).toBe(5);
    expect(cartMaximumForOwner("variant", 1, 2)).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import type { StorefrontCartIntent } from "@/modules/storefront-shell/client/storefront-client-state";
import { decideCartHydration } from "@/providers/storefront-cart-hydration";

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

describe("decideCartHydration", () => {
  it("waits without erasing intent while the catalogue is unavailable", () => {
    expect(decideCartHydration("temporarily-unavailable", [intent], [], {})).toEqual({
      kind: "wait",
      reason: "catalogue-unavailable",
      unresolved: [intent],
    });
  });

  it("waits while a ready catalogue cannot resolve all intent", () => {
    expect(decideCartHydration("ready", [intent], [], {})).toEqual({
      kind: "wait",
      reason: "unresolved-intent",
      unresolved: [intent],
    });
  });

  it("hydrates after the ready catalogue can resolve the intent", () => {
    expect(decideCartHydration("ready", [intent], [product], {})).toEqual({
      kind: "hydrate",
      lines: [expect.objectContaining({ productId: product.id, qty: 1 })],
    });
  });

  it("confirms a genuinely empty cart only with a ready catalogue", () => {
    expect(decideCartHydration("ready", [], [product], {})).toEqual({
      kind: "hydrate",
      lines: [],
    });
  });
});

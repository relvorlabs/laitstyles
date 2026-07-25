import { beforeEach, describe, expect, it } from "vitest";
import type { CartProduct, CartSelection } from "@/features/storefront/shared/cart-lines";
import { cartStore } from "@/stores/cart.store";

const product: CartProduct = {
  id: "product-1",
  price: 25_000,
  stock: 3,
  status: "available",
  inventory: "stocked",
};

const variantProduct: CartProduct = {
  ...product,
  id: "product-variant",
  inventory: "variant",
};

const selection: CartSelection = {
  variantId: "variant-1",
  variantLabel: "M / Black",
  colour: "Black",
  size: "M",
  unitPriceNaira: 27_500,
  maxQuantity: 2,
};

describe("cart store", () => {
  beforeEach(() => cartStore.getState().reset());

  it("hydrates intent lines without product records", () => {
    cartStore.getState().hydrate([
      {
        key: "product-1:default",
        productId: "product-1",
        qty: 2,
        variantId: null,
        variantLabel: null,
        colour: null,
        size: null,
        unitPriceNaira: 25_000,
        maxQuantity: 3,
      },
    ]);

    expect(cartStore.getState()).toMatchObject({ hydrated: true });
    expect(cartStore.getState().lines).toHaveLength(1);
    expect(cartStore.getState().lines[0]).not.toHaveProperty("product");
  });

  it("preserves one line per product and variant and enforces quantity limits", () => {
    expect(cartStore.getState().add(product, null, 2)).toBe("added");
    expect(cartStore.getState().add(product, null, 3)).toBe("added");
    expect(cartStore.getState().lines[0]?.qty).toBe(3);
    expect(cartStore.getState().add(product)).toBe("quantity-limit");

    expect(cartStore.getState().add(variantProduct)).toBe("selection-required");
    expect(cartStore.getState().add(variantProduct, selection)).toBe("added");
    expect(cartStore.getState().lines).toHaveLength(2);
  });

  it("supports remove, undo, quantity change and clear", () => {
    cartStore.getState().add(product);
    const line = cartStore.getState().lines[0];
    expect(line).toBeDefined();
    if (!line) return;

    expect(cartStore.getState().remove(line.key)).toEqual(line);
    expect(cartStore.getState().lines).toEqual([]);

    cartStore.getState().restore(line);
    cartStore.getState().changeQuantity(line.key, 1);
    expect(cartStore.getState().lines[0]?.qty).toBe(2);

    cartStore.getState().clear();
    expect(cartStore.getState().lines).toEqual([]);
  });
});

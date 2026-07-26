import { describe, expect, it } from "vitest";
import type { ProductDetail } from "@/lib/storefront/types";
import {
  createProductSelection,
  resolveProductSelection,
  transitionProductSelection,
} from "./product-selection";

const detail = {
  id: "shirt-1",
  slug: "patterned-office-shirt-capsule",
  name: "Patterned Office Shirt Capsule",
  brand: "Laitstyles",
  price: 3_000_000,
  referencePrice: 3_500_000,
  archiveNumber: null,
  condition: "Excellent",
  material: "Linen",
  fit: "Relaxed",
  style: "Resort",
  category: { id: "shirts", slug: "shirts", name: "Shirts" },
  collection: null,
  cover: null,
  description: "Canonical fixture",
  media: [
    {
      id: "stone-l-image",
      url: "/stone-l.jpg",
      alt: "Stone shirt in size L",
      kind: "cover",
      position: 3,
      width: 1200,
      height: 1500,
      variantId: "stone-l",
    },
    {
      id: "product-image",
      url: "/product.jpg",
      alt: "Product fallback",
      kind: "detail",
      position: 1,
      width: 1200,
      height: 1500,
      variantId: null,
    },
    {
      id: "stone-xl-image",
      url: "/stone-xl.jpg",
      alt: "Stone shirt in size XL",
      kind: "detail",
      position: 2,
      width: 1200,
      height: 1500,
      variantId: "stone-xl",
    },
    {
      id: "product-image",
      url: "/product-duplicate.jpg",
      alt: "Duplicate product fallback",
      kind: "detail",
      position: 4,
      width: 1200,
      height: 1500,
      variantId: null,
    },
  ],
  measurements: [],
  reviewSummary: {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  },
  careInstructions: null,
  flawNotes: null,
  mode: "variant",
  variants: [
    {
      id: "ecru-s",
      label: "Ecru / S",
      sku: null,
      size: "S",
      colour: "Ecru",
      colourHex: "#f3f0e7",
      price: null,
      availability: { state: "sold_out", available: 0, isOneOfOne: false },
    },
    {
      id: "black-m",
      label: "Black / M",
      sku: null,
      size: "M",
      colour: "Black",
      colourHex: "#202020",
      price: null,
      availability: { state: "available", available: 5, isOneOfOne: false },
    },
    {
      id: "black-l",
      label: "Black / L",
      sku: null,
      size: "L",
      colour: "Black",
      colourHex: "#202020",
      price: null,
      availability: { state: "sold_out", available: 0, isOneOfOne: false },
    },
    {
      id: "stone-l",
      label: "Stone / L",
      sku: null,
      size: "L",
      colour: "Stone",
      colourHex: "#8d8a83",
      price: 3_250_000,
      availability: { state: "low", available: 3, isOneOfOne: false },
    },
    {
      id: "stone-xl",
      label: "Stone / XL",
      sku: null,
      size: "XL",
      colour: "Stone",
      colourHex: "#8d8a83",
      price: null,
      availability: { state: "available", available: 2, isOneOfOne: false },
    },
  ],
  availability: { state: "available", available: 10, isOneOfOne: false },
} satisfies ProductDetail;

describe("createProductSelection", () => {
  it("chooses the first colour with stock and leaves an ambiguous size unselected", () => {
    expect(createProductSelection(detail)).toEqual({
      selectedColour: "Black",
      selectedSize: null,
      quantity: 1,
    });
  });

  it("auto-selects one unambiguous compatible size", () => {
    const oneSize = {
      ...detail,
      variants: detail.variants.filter((variant) => variant.id === "stone-l"),
    } satisfies ProductDetail;

    expect(createProductSelection(oneSize)).toEqual({
      selectedColour: "Stone",
      selectedSize: "L",
      quantity: 1,
    });
  });
});

describe("transitionProductSelection", () => {
  it("clears an incompatible size when colour changes", () => {
    const initial = { selectedColour: "Black", selectedSize: "M", quantity: 2 };
    const next = transitionProductSelection(detail, initial, {
      type: "select_colour",
      colour: "Stone",
    });

    expect(next).toEqual({ selectedColour: "Stone", selectedSize: null, quantity: 2 });
    expect(resolveProductSelection(detail, next).selectedVariantId).toBeNull();
  });

  it("preserves a size that exists for the next colour, even when one option is sold out", () => {
    const initial = { selectedColour: "Black", selectedSize: "L", quantity: 2 };
    expect(
      transitionProductSelection(detail, initial, {
        type: "select_colour",
        colour: "Stone",
      }),
    ).toEqual({ selectedColour: "Stone", selectedSize: "L", quantity: 2 });
  });

  it("records size and quantity transitions without prematurely applying stock caps", () => {
    const initial = createProductSelection(detail);
    const withSize = transitionProductSelection(detail, initial, {
      type: "select_size",
      size: "M",
    });
    expect(
      transitionProductSelection(detail, withSize, { type: "set_quantity", quantity: 12 }),
    ).toEqual({ selectedColour: "Black", selectedSize: "M", quantity: 12 });
  });
});

describe("resolveProductSelection", () => {
  it("resolves exact price, stock, quantity, and linked media in priority order", () => {
    const resolved = resolveProductSelection(detail, {
      selectedColour: "Stone",
      selectedSize: "L",
      quantity: 7,
    });

    expect(resolved.selectedVariantId).toBe("stone-l");
    expect(resolved.displayPrice).toBe(3_250_000);
    expect(resolved.referencePrice).toBe(3_500_000);
    expect(resolved.available).toBe(true);
    expect(resolved.availableQuantity).toBe(3);
    expect(resolved.quantity).toBe(3);
    expect(resolved.media.map((media) => media.id)).toEqual([
      "stone-l-image",
      "stone-xl-image",
      "product-image",
    ]);
  });

  it("uses the product price but prevents purchase when no exact variant is resolved", () => {
    const resolved = resolveProductSelection(detail, {
      selectedColour: "Stone",
      selectedSize: "M",
      quantity: 2,
    });

    expect(resolved.selectedVariantId).toBeNull();
    expect(resolved.displayPrice).toBe(detail.price);
    expect(resolved.available).toBe(false);
    expect(resolved.availableQuantity).toBe(0);
  });

  it("falls back to the base product price when the exact variant has no override", () => {
    const resolved = resolveProductSelection(detail, {
      selectedColour: "Black",
      selectedSize: "M",
      quantity: 1,
    });

    expect(resolved.selectedVariantId).toBe("black-m");
    expect(resolved.displayPrice).toBe(detail.price);
  });

  it("keeps sold-out sizes visible and resolves them as unavailable", () => {
    const resolved = resolveProductSelection(detail, {
      selectedColour: "Black",
      selectedSize: "L",
      quantity: 4,
    });

    expect(resolved.compatibleSizes.map((variant) => variant.size)).toEqual(["M", "L"]);
    expect(resolved.selectedVariantId).toBe("black-l");
    expect(resolved.available).toBe(false);
    expect(resolved.availableQuantity).toBe(0);
    expect(resolved.quantity).toBe(1);
  });

  it("deduplicates compatible sizes by shopper-facing label", () => {
    const duplicateSize = {
      ...detail,
      variants: [
        ...detail.variants,
        {
          ...detail.variants[1],
          id: "black-m-duplicate",
          label: "Black / Medium duplicate",
        },
      ],
    } satisfies ProductDetail;

    const resolved = resolveProductSelection(duplicateSize, {
      selectedColour: "Black",
      selectedSize: null,
      quantity: 1,
    });
    expect(resolved.compatibleSizes.map((variant) => variant.size)).toEqual(["M", "L"]);
  });

  it("preserves the full position-sorted gallery when the selection has no linked media", () => {
    const resolved = resolveProductSelection(detail, {
      selectedColour: "Black",
      selectedSize: "M",
      quantity: 1,
    });

    expect(resolved.media.map((media) => media.id)).toEqual([
      "product-image",
      "stone-xl-image",
      "stone-l-image",
    ]);
  });

  it("caps unique inventory at one", () => {
    const unique = (({ variants: _variants, ...common }) => ({
      ...common,
      mode: "unique" as const,
      sizeLabel: "One size",
      colour: "Black",
      availability: { state: "available" as const, available: 4, isOneOfOne: true },
    }))(detail) satisfies ProductDetail;

    const resolved = resolveProductSelection(unique, {
      selectedColour: "Black",
      selectedSize: "One size",
      quantity: 6,
    });
    expect(resolved.availableQuantity).toBe(1);
    expect(resolved.quantity).toBe(1);
    expect(resolved.available).toBe(true);
  });
});

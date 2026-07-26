import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ProductDetail } from "@/lib/storefront/types";

import { useProductSelection } from "./use-product-selection";

const detail = {
  id: "shirt-1",
  slug: "linen-shirt",
  name: "Linen Shirt",
  brand: "Laitstyles",
  price: 3_000_000,
  referencePrice: null,
  archiveNumber: null,
  condition: "Excellent",
  material: "Linen",
  fit: "Relaxed",
  style: "Resort",
  category: { id: "shirts", slug: "shirts", name: "Shirts" },
  collection: null,
  cover: null,
  description: "Canonical fixture",
  media: [],
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
      id: "stone-l",
      label: "Stone / L",
      sku: null,
      size: "L",
      colour: "Stone",
      colourHex: "#8d8a83",
      price: 3_250_000,
      availability: { state: "low", available: 3, isOneOfOne: false },
    },
  ],
  availability: { state: "low", available: 3, isOneOfOne: false },
} satisfies ProductDetail;

function SelectionProbe() {
  const selection = useProductSelection(detail);
  return (
    <output
      data-colour={selection.selectedColour ?? ""}
      data-size={selection.selectedSize ?? ""}
      data-variant={selection.selectedVariantId ?? ""}
      data-price={selection.displayPrice}
    />
  );
}

describe("useProductSelection", () => {
  it("hydrates the pure canonical selection model for its first render", () => {
    const markup = renderToStaticMarkup(<SelectionProbe />);

    expect(markup).toContain('data-colour="Stone"');
    expect(markup).toContain('data-size="L"');
    expect(markup).toContain('data-variant="stone-l"');
    expect(markup).toContain('data-price="3250000"');
  });
});

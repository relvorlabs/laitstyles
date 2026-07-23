import type { ProductDetail, ProductSummary } from "@/lib/storefront/types";
import { describe, expect, it } from "vitest";
import {
  buildStorefrontCatalog,
  measurementsCmFor,
  projectLegacyProduct,
  projectLegacyProductSummary,
} from "./catalog-adapter";

const cover = {
  id: "cover-1",
  url: "https://example.com/cover.jpg",
  alt: "Jacket",
  kind: "cover" as const,
  position: 0,
  width: 800,
  height: 1000,
  variantId: null,
};

const reviewSummary = {
  average: 0,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function summary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "product-1",
    slug: "black-jacket",
    name: "Black Jacket",
    brand: "Laitstyles",
    price: 2_500_000,
    referencePrice: 3_000_000,
    archiveNumber: "LST-1",
    condition: "Excellent",
    material: "Cotton",
    fit: "Relaxed",
    style: "Vintage",
    category: { id: "category-1", slug: "jackets", name: "Jackets" },
    collection: { id: "collection-1", slug: "women", name: "Women" },
    cover,
    mode: "unique",
    sizeLabel: "M",
    colour: "Black",
    availability: { state: "available", available: 1, isOneOfOne: true },
    ...overrides,
  };
}

function variantDetail(): ProductDetail {
  return {
    ...summary({ mode: "variant", sizeLabel: null, colour: null }),
    mode: "variant",
    description: "A jacket with variants.",
    media: [
      cover,
      {
        ...cover,
        id: "detail-1",
        url: "https://example.com/detail.jpg",
        kind: "detail",
        position: 1,
      },
    ],
    measurements: [
      { label: "Chest", value: "54 cm", position: 0 },
      { label: "Note", value: "oversized", position: 1 },
    ],
    reviewSummary,
    careInstructions: "Dry clean only.",
    flawNotes: "Small cuff mark.",
    variants: [
      {
        id: "variant-s",
        label: "Small",
        sku: "JACKET-S",
        size: "S",
        colour: "Black",
        colourHex: "#000000",
        price: null,
        availability: { state: "available", available: 1, isOneOfOne: false },
      },
      {
        id: "variant-m",
        label: "Medium",
        sku: "JACKET-M",
        size: "M",
        colour: "Black",
        colourHex: "#000000",
        price: 2_600_000,
        availability: { state: "low", available: 1, isOneOfOne: false },
      },
    ],
  };
}

describe("catalogue compatibility adapter", () => {
  it("maps canonical summaries without inventing detail media", () => {
    expect(projectLegacyProductSummary(summary(), 19)).toMatchObject({
      id: "product-1",
      databaseId: "product-1",
      category: "Women",
      type: "Jackets",
      price: 25_000,
      referencePrice: 30_000,
      condition: "A+",
      inventory: "one-of-one",
      stock: 1,
      status: "available",
      new: true,
      images: ["https://example.com/cover.jpg"],
    });
    expect(projectLegacyProductSummary(summary(), 20).new).toBe(false);
  });

  it("maps canonical variant detail into the unchanged UI contract", () => {
    expect(projectLegacyProduct(variantDetail(), 0)).toMatchObject({
      size: "S–M",
      colour: "Black",
      inventory: "variant",
      flaw: "Small cuff mark.",
      careInstructions: "Dry clean only.",
      variants: ["S", "M"],
      images: [
        "https://example.com/cover.jpg",
        "https://example.com/detail.jpg",
      ],
    });
  });

  it("builds client-safe category, measurement and variant payloads", () => {
    const detail = variantDetail();
    expect(measurementsCmFor(detail)).toEqual({ Chest: 54 });
    expect(
      buildStorefrontCatalog(
        [detail],
        [
          {
            id: "category-1",
            slug: "jackets",
            name: "Jackets",
            imageUrl: null,
            productCount: 1,
          },
        ],
      ),
    ).toMatchObject({
      categories: [
        {
          id: "category-1",
          slug: "jackets",
          name: "Jackets",
          imageUrl: null,
          productCount: 1,
        },
      ],
      measurementsCm: { Chest: 54 },
      variantOptionsByProductId: {
        "product-1": [{ id: "variant-s" }, { id: "variant-m" }],
      },
    });
  });
});

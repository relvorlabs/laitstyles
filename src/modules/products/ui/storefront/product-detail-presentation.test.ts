import { describe, expect, it } from "vitest";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import type { ProductDetail } from "@/lib/storefront/types";

import {
  buildProductDetailPresentation,
  productReviewAccessCopy,
  reviewDistributionRows,
  selectProductRecommendations,
  wrapCampaignIndex,
} from "./product-detail-presentation";

const product = {
  id: "shirt-1",
  databaseId: "shirt-1",
  slug: "linen-shirt",
  name: "Linen Shirt",
  brand: "Laitstyles",
  brandStatus: "Branded",
  category: "Resort",
  type: "Shirts",
  style: "Relaxed",
  price: 30_000,
  referencePrice: 40_000,
  condition: "A+",
  size: "M",
  fit: "Relaxed",
  colour: "Sand",
  inventory: "variant",
  stock: 2,
  status: "available",
  new: true,
  saved: 0,
  flaw: "None",
  material: "Linen",
  careInstructions: "Cold wash",
  images: ["/shirt-1.jpg"],
  variants: ["S", "M"],
} satisfies Product;

const detail = {
  id: "shirt-1",
  slug: "linen-shirt",
  name: "Linen Shirt",
  brand: "Laitstyles",
  price: 3_000_000,
  referencePrice: 4_000_000,
  archiveNumber: null,
  condition: "Excellent",
  material: "Linen",
  fit: "Relaxed",
  style: "Relaxed",
  category: { id: "shirts", slug: "shirts", name: "Shirts" },
  collection: { id: "resort", slug: "resort", name: "Resort" },
  cover: null,
  description: "Breathable and relaxed.",
  media: [],
  measurements: [],
  reviewSummary: {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  },
  careInstructions: "Cold wash",
  flawNotes: null,
  mode: "variant",
  variants: [
    {
      id: "s",
      label: "Small",
      sku: null,
      size: "S",
      colour: "Sand",
      colourHex: null,
      price: null,
      availability: { state: "available", available: 1, isOneOfOne: false },
    },
    {
      id: "m",
      label: "Medium",
      sku: null,
      size: "M",
      colour: "Sand",
      colourHex: null,
      price: null,
      availability: { state: "sold_out", available: 0, isOneOfOne: false },
    },
  ],
  availability: { state: "low", available: 1, isOneOfOne: false },
} satisfies ProductDetail;

describe("buildProductDetailPresentation", () => {
  it("uses real commerce and canonical detail values without inventing facts", () => {
    const result = buildProductDetailPresentation(product, detail);

    expect(result.description).toBe("Breathable and relaxed.");
    expect(result.discountPercent).toBe(25);
    expect(result.variants).toEqual(detail.variants);
    expect(result.colours).toEqual([{ name: "Sand", hex: null }]);
    expect(result.sizes).toEqual([
      { label: "S", value: "S", available: true },
      { label: "M", value: "M", available: false },
    ]);
    expect(result.measurements).toEqual([]);
    expect(result.reviewSummary.count).toBe(0);
    expect(result.campaignFrames).toHaveLength(3);
    expect(result.campaignFrames.every((frame) => frame.image === "/shirt-1.jpg")).toBe(true);
  });

  it("omits a discount when there is no valid compare-at price", () => {
    const result = buildProductDetailPresentation(
      { ...product, referencePrice: null },
      { ...detail, referencePrice: null },
    );

    expect(result.discountPercent).toBeNull();
  });

  it("does not mutate canonical media while ordering campaign imagery", () => {
    const media = [
      {
        id: "second",
        url: "/second.jpg",
        alt: "Second",
        kind: "detail",
        position: 2,
        width: null,
        height: null,
        variantId: null,
      },
      {
        id: "first",
        url: "/first.jpg",
        alt: "First",
        kind: "cover",
        position: 1,
        width: null,
        height: null,
        variantId: null,
      },
    ] satisfies ProductDetail["media"];

    buildProductDetailPresentation(product, { ...detail, media });

    expect(media.map((item) => item.id)).toEqual(["second", "first"]);
  });
});

describe("selectProductRecommendations", () => {
  it("uses existing catalogue products and never recommends the current product", () => {
    const sameType = { ...product, id: "shirt-2", slug: "linen-shirt-2" };
    const sameCollection = {
      ...product,
      id: "trouser-1",
      slug: "trouser-1",
      type: "Trousers",
    };
    const unrelated = {
      ...product,
      id: "coat-1",
      slug: "coat-1",
      category: "Outerwear",
      type: "Coats",
    };
    const thirdMatch = {
      ...product,
      id: "shirt-3",
      slug: "linen-shirt-3",
    };

    const result = selectProductRecommendations(
      [product, sameType, sameCollection, thirdMatch, unrelated],
      product,
    );

    expect(result.styledWith.map((candidate) => candidate.id)).toEqual(["shirt-2", "trouser-1"]);
    expect(result.related.map((candidate) => candidate.id)).toEqual([
      "shirt-2",
      "trouser-1",
      "shirt-3",
      "coat-1",
    ]);
  });
});

describe("wrapCampaignIndex", () => {
  it("wraps campaign navigation in both directions", () => {
    expect(wrapCampaignIndex(-1, 3)).toBe(2);
    expect(wrapCampaignIndex(3, 3)).toBe(0);
  });
});

describe("reviewDistributionRows", () => {
  it("returns truthful zero percentages for an empty aggregate", () => {
    expect(reviewDistributionRows(detail.reviewSummary)).toEqual([
      { rating: 5, count: 0, percentage: 0 },
      { rating: 4, count: 0, percentage: 0 },
      { rating: 3, count: 0, percentage: 0 },
      { rating: 2, count: 0, percentage: 0 },
      { rating: 1, count: 0, percentage: 0 },
    ]);
  });
});

describe("productReviewAccessCopy", () => {
  it("directs review creation to delivered items in order history", () => {
    expect(productReviewAccessCopy).toBe(
      "Reviews can be written from delivered items in your order history.",
    );
  });
});

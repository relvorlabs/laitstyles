import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "@/modules/products/storefront-types";

const queries = vi.hoisted(() => ({
  getPublishedProductBySlug: vi.fn(),
  listPublishedProductDetails: vi.fn(),
  listPublishedProductSlugs: vi.fn(),
  listStorefrontCategories: vi.fn(),
}));

vi.mock("@/modules/products/server/storefront/queries", () => queries);

import { loadStorefrontProductPageBySlug } from "./catalogue-loader";

function uniqueDetail(): ProductDetail {
  return {
    id: "prod-1",
    slug: "archive-silk-dress",
    name: "Archive Silk Dress",
    brand: "Maison",
    price: 4_900_000,
    referencePrice: null,
    archiveNumber: null,
    condition: "Excellent",
    material: "Silk",
    fit: "Relaxed",
    style: "Archive",
    category: { id: "cat-1", slug: "dresses", name: "Dresses" },
    collection: { id: "col-1", slug: "women", name: "Women" },
    cover: null,
    description: "One-of-one archive piece.",
    media: [],
    measurements: [],
    reviewSummary: {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    careInstructions: null,
    flawNotes: null,
    mode: "unique",
    sizeLabel: "M",
    colour: "Ivory",
    availability: { state: "available", available: 1, isOneOfOne: true },
  };
}

describe("storefront product-page reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.listPublishedProductDetails.mockResolvedValue([uniqueDetail()]);
    queries.listPublishedProductSlugs.mockResolvedValue(["archive-silk-dress"]);
    queries.listStorefrontCategories.mockResolvedValue([]);
    queries.getPublishedProductBySlug.mockResolvedValue(uniqueDetail());
  });

  it("reads the requested detail and slug order without loading the full catalogue", async () => {
    const page = await loadStorefrontProductPageBySlug("archive-silk-dress");

    expect(page?.detail.slug).toBe("archive-silk-dress");
    expect(queries.getPublishedProductBySlug).toHaveBeenCalledWith("archive-silk-dress");
    expect(queries.listPublishedProductSlugs).toHaveBeenCalledOnce();
    expect(queries.listPublishedProductDetails).not.toHaveBeenCalled();
    expect(queries.listStorefrontCategories).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "@/lib/storefront/types";

const repository = vi.hoisted(() => ({
  getPublishedProductBySlug: vi.fn(),
  listPublishedProductDetails: vi.fn(),
  listPublishedProductSlugs: vi.fn(),
  listStorefrontCategories: vi.fn(),
}));

vi.mock("@/server/commerce/catalogue/catalog-repository", () => repository);

import { loadStorefrontProductPageBySlug } from "./catalog-loader";

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
    repository.listPublishedProductDetails.mockResolvedValue([uniqueDetail()]);
    repository.listPublishedProductSlugs.mockResolvedValue(["archive-silk-dress"]);
    repository.listStorefrontCategories.mockResolvedValue([]);
    repository.getPublishedProductBySlug.mockResolvedValue(uniqueDetail());
  });

  it("reads the requested detail and slug order without loading the full catalogue", async () => {
    const page = await loadStorefrontProductPageBySlug("archive-silk-dress");

    expect(page?.detail.slug).toBe("archive-silk-dress");
    expect(repository.getPublishedProductBySlug).toHaveBeenCalledWith("archive-silk-dress");
    expect(repository.listPublishedProductSlugs).toHaveBeenCalledOnce();
    expect(repository.listPublishedProductDetails).not.toHaveBeenCalled();
    expect(repository.listStorefrontCategories).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({
  getPublishedProductBySlug: vi.fn(),
  listPublishedProductDetails: vi.fn(),
  listPublishedProductSlugs: vi.fn(),
  listStorefrontCategories: vi.fn(),
}));
const log = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("@/modules/products/server/storefront/queries", () => queries);
vi.mock("@/lib/logger", () => ({ logger: log }));

import { loadStorefrontShellCatalogue } from "./catalogue-loader";

describe("storefront shell failure containment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.listStorefrontCategories.mockResolvedValue([]);
  });

  it("returns a generic public state instead of rejecting with database details", async () => {
    queries.listPublishedProductDetails.mockRejectedValue(
      new Error("Can't reach database server at private-database.example"),
    );

    await expect(loadStorefrontShellCatalogue()).resolves.toEqual({
      availability: "temporarily-unavailable",
      products: [],
      categories: [],
      measurementsCm: {},
      variantOptionsByProductId: {},
    });
    expect(log.error).toHaveBeenCalledWith(
      { scope: "storefront-shell-catalogue", errorName: "Error" },
      "Storefront shell catalogue load failed",
    );
    expect(JSON.stringify(log.error.mock.calls)).not.toContain("private-database.example");
  });
});

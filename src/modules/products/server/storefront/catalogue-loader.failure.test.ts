import { beforeEach, describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({
  getPublishedProductBySlug: vi.fn(),
  listPublishedProductDetails: vi.fn(),
  listPublishedProductSlugs: vi.fn(),
  listStorefrontCategories: vi.fn(),
}));
const diagnostics = vi.hoisted(() => ({ report: vi.fn() }));

vi.mock("@/modules/products/server/storefront/queries", () => queries);
vi.mock("@/lib/server-diagnostics", () => ({
  reportPrerenderSafeServerError: diagnostics.report,
}));

import { loadStorefrontShellCatalogue } from "./catalogue-loader";

describe("storefront shell failure containment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.listStorefrontCategories.mockResolvedValue([]);
  });

  it("returns a generic public state and emits bounded prerender-safe diagnostics", async () => {
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
    expect(diagnostics.report).toHaveBeenCalledWith("Storefront shell catalogue load failed", {
      scope: "storefront-shell-catalogue",
      errorName: "Error",
    });
    expect(JSON.stringify(diagnostics.report.mock.calls)).not.toContain("private-database.example");
  });
});

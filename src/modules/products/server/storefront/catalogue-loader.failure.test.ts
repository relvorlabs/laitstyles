import { beforeEach, describe, expect, it, vi } from "vitest";

const shellQuery = vi.hoisted(() => ({ getStorefrontShellCatalogue: vi.fn() }));
const diagnostics = vi.hoisted(() => ({ report: vi.fn() }));

vi.mock("@/modules/products/server/storefront/shell-query", () => shellQuery);
vi.mock("@/lib/server-diagnostics", () => ({
  reportPrerenderSafeServerError: diagnostics.report,
}));

import { loadStorefrontShellCatalogue } from "./catalogue-loader";

describe("storefront shell failure containment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a generic public state and emits bounded prerender-safe diagnostics", async () => {
    shellQuery.getStorefrontShellCatalogue.mockRejectedValue(
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

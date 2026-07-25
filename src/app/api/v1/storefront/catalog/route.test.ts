import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStorefrontShellCatalog: vi.fn(),
}));

vi.mock("@/modules/products/server/storefront/shell-query", () => ({
  getStorefrontShellCatalog: mocks.getStorefrontShellCatalog,
}));

import { GET } from "./route";

const catalogue = {
  products: [],
  categories: [],
  measurementsCm: {},
  variantOptionsByProductId: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStorefrontShellCatalog.mockResolvedValue(catalogue);
});

describe("GET /api/v1/storefront/catalog", () => {
  it("returns the public shell projection in the standard data envelope", async () => {
    const response = await GET(new Request("http://localhost/api/v1/storefront/catalog"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    expect(mocks.getStorefrontShellCatalog).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ data: catalogue });
  });
});

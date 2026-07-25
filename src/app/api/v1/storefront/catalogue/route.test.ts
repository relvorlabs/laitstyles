import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStorefrontShellCatalogue: vi.fn(),
}));

vi.mock("@/modules/products/server/storefront/shell-query", () => ({
  getStorefrontShellCatalogue: mocks.getStorefrontShellCatalogue,
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
  mocks.getStorefrontShellCatalogue.mockResolvedValue(catalogue);
});

describe("GET /api/v1/storefront/catalogue", () => {
  it("returns the public shell projection in the standard data envelope", async () => {
    const response = await GET(new Request("http://localhost/api/v1/storefront/catalogue"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    expect(mocks.getStorefrontShellCatalogue).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ data: catalogue });
  });
});

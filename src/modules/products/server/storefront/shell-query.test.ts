import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  findProducts: vi.fn(),
  findCategories: vi.fn(),
  groupProducts: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    products: {
      findMany: database.findProducts,
      groupBy: database.groupProducts,
    },
    catalogue_categories: { findMany: database.findCategories },
  },
}));
vi.mock("@/modules/products/server/storefront/visibility", () => ({
  publishedProductWhere: () => ({ lifecycle: "active", publication: "published" }),
}));

import { getStorefrontShellCatalogue } from "@/modules/products/server/storefront/shell-query";

beforeEach(() => {
  vi.clearAllMocks();
  database.findProducts.mockResolvedValue([]);
  database.findCategories.mockResolvedValue([]);
  database.groupProducts.mockResolvedValue([]);
});

describe("getStorefrontShellCatalogue", () => {
  it("uses one lightweight product query and one aggregate category count query", async () => {
    await expect(getStorefrontShellCatalogue()).resolves.toEqual({
      availability: "ready",
      products: [],
      categories: [],
      measurementsCm: {},
      variantOptionsByProductId: {},
    });

    expect(database.findProducts).toHaveBeenCalledTimes(1);
    expect(database.findCategories).toHaveBeenCalledTimes(1);
    expect(database.groupProducts).toHaveBeenCalledTimes(1);

    const productQuery = database.findProducts.mock.calls[0]?.[0];
    expect(productQuery).toMatchObject({
      include: {
        product_media: { where: { kind: "product_cover" }, take: 1 },
        stock_levels: true,
        product_variants: { include: { stock_levels: true } },
      },
    });
    expect(productQuery.include).not.toHaveProperty("product_measurements");
    expect(database.groupProducts).toHaveBeenCalledWith(
      expect.objectContaining({ by: ["category_id"], _count: { _all: true } }),
    );
  });
});

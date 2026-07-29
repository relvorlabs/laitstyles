import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  prisma: {
    catalogue_categories: { findMany: vi.fn() },
    catalogue_collections: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: harness.prisma }));

import { listProductTaxonomy } from "@/modules/products/server/queries";

const now = new Date("2026-01-01T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  harness.prisma.catalogue_categories.findMany.mockResolvedValue([
    {
      id: "019f65c1-74fe-7bd3-8400-000000000011",
      name: "Jeans",
      slug: "jeans",
      image_url: "https://res.cloudinary.com/store/image/upload/category.jpg",
      position: 1,
      created_at: now,
      updated_at: now,
      _count: { products: 12 },
    },
  ]);
  harness.prisma.catalogue_collections.findMany.mockResolvedValue([
    {
      id: "019f65c1-74fe-7bd3-8400-000000000012",
      name: "New season",
      slug: "new-season",
      position: 2,
      created_at: now,
      updated_at: now,
      _count: { products: 4 },
      products: [
        {
          product_media: [
            {
              cloudinary_assets: {
                secure_url: "https://res.cloudinary.com/store/image/upload/product.jpg",
                delivery_url: null,
              },
            },
          ],
        },
      ],
    },
  ]);
});

describe("listProductTaxonomy", () => {
  it("projects Category images and product-derived Collection previews", async () => {
    const items = await listProductTaxonomy();

    const category = items.find((item) => item.kind === "category");
    const collection = items.find((item) => item.kind === "collection");
    expect(category).toMatchObject({
      kind: "category",
      imageUrl: "https://res.cloudinary.com/store/image/upload/category.jpg",
      position: 1,
      productCount: 12,
      previewImageUrls: [],
    });
    expect(collection).toMatchObject({
      kind: "collection",
      imageUrl: null,
      position: 2,
      productCount: 4,
      previewImageUrls: [expect.stringContaining("res.cloudinary.com")],
    });
  });

  it("requests only the first three newest Collection product covers", async () => {
    await listProductTaxonomy();

    expect(harness.prisma.catalogue_collections.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: expect.objectContaining({
          _count: { select: { products: true } },
          products: expect.objectContaining({
            orderBy: { updated_at: "desc" },
            take: 3,
            select: {
              product_media: expect.objectContaining({
                take: 1,
                where: { variant_id: null, kind: "product_cover" },
              }),
            },
          }),
        }),
      }),
    );
  });
});

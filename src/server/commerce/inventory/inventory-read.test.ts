import { describe, expect, it, vi } from "vitest";

const row = vi.hoisted(() => ({
  id: "019f65c1-74fe-7bd3-8400-000000000001",
  slug: "test",
  name: "Test",
  description: "Test",
  brand: null,
  inventory_mode: "stocked",
  price: { toNumber: () => 1000 },
  reference_price: null,
  cost: null,
  lifecycle: "active",
  publication: "published",
  low_stock_threshold: 1,
  archive_number: null,
  sku: "SKU-1",
  condition: null,
  size_label: "M",
  colour: "Black",
  material: null,
  fit: null,
  style: null,
  care_instructions: null,
  flaw_notes: null,
  weight_grams: null,
  pickup_available: true,
  delivery_restrictions: "",
  packaging_notes: "",
  scheduled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  catalogue_categories: null,
  catalogue_collections: null,
  product_channels: [],
  product_media: [],
  product_measurements: [],
  product_variants: [],
  stock_levels: [],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    products: {
      findMany: vi.fn().mockResolvedValue([row]),
      findUnique: vi.fn().mockResolvedValue(row),
      count: vi.fn().mockResolvedValue(1),
    },
    catalogue_categories: { findMany: vi.fn().mockResolvedValue([]) },
    catalogue_collections: { findMany: vi.fn().mockResolvedValue([]) },
    stock_movements: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { listStockMovements } from "@/modules/inventory/server/queries";
import {
  getAdminProduct,
  listAdminProducts,
  listProductTaxonomy,
} from "@/modules/products/server/queries";

const MISSING_PRODUCT_ID = "019f65c1-74fe-7bd3-8400-000000000099";

describe("inventory reads", () => {
  it("lists products with explicit database pagination", async () => {
    const result = await listAdminProducts({ page: 1, pageSize: 50 });
    expect(result.data).toHaveLength(1);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updated_at: "desc" },
        skip: 0,
        take: 50,
      }),
    );
    expect(result.meta).toEqual({ page: 1, pageSize: 50, total: 1, pageCount: 1 });
  });

  it("queries a valid identifier and returns null for an unknown product", async () => {
    vi.mocked(prisma.products.findUnique).mockResolvedValueOnce(null);

    await expect(getAdminProduct(MISSING_PRODUCT_ID)).resolves.toBeNull();

    expect(prisma.products.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: MISSING_PRODUCT_ID } }),
    );
  });

  it("combines categories and collections using encoded ids", async () => {
    vi.mocked(prisma.catalogue_categories.findMany).mockResolvedValueOnce([
      {
        id: "019f65c1-74fe-7bd3-8400-000000000021",
        slug: "tops",
        name: "Tops",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ] as never);
    const taxonomy = await listProductTaxonomy();
    expect(taxonomy[0]?.id).toMatch(/^category:/);
  });

  it("filters and paginates stock movement reads by product", async () => {
    await listStockMovements({
      productId: "019f65c1-74fe-7bd3-8400-000000000001",
      page: 1,
      pageSize: 50,
    });
    expect(prisma.stock_movements.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { product_id: "019f65c1-74fe-7bd3-8400-000000000001" },
        skip: 0,
        take: 50,
      }),
    );
  });
});

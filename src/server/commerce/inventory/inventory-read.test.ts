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
    products: {
      findMany: vi.fn().mockResolvedValue([row]),
      findUnique: vi.fn().mockResolvedValue(row),
    },
    catalogue_categories: { findMany: vi.fn().mockResolvedValue([]) },
    catalogue_collections: { findMany: vi.fn().mockResolvedValue([]) },
    stock_movements: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getInventoryProduct,
  listInventoryProducts,
  listInventoryStockMovements,
  listInventoryTaxonomy,
} from "./inventory-read";

const MISSING_PRODUCT_ID = "019f65c1-74fe-7bd3-8400-000000000099";

describe("inventory reads", () => {
  it("lists every lifecycle with an explicit upper bound", async () => {
    const products = await listInventoryProducts();
    expect(products).toHaveLength(1);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updated_at: "desc" },
        take: 500,
      }),
    );
    expect(vi.mocked(prisma.products.findMany).mock.calls[0]?.[0]?.where).toBeUndefined();
  });

  it("queries a valid identifier and returns null for an unknown product", async () => {
    vi.mocked(prisma.products.findUnique).mockResolvedValueOnce(null);

    await expect(getInventoryProduct(MISSING_PRODUCT_ID)).resolves.toBeNull();

    expect(prisma.products.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: MISSING_PRODUCT_ID } }),
    );
  });

  it("returns null for a malformed identifier without querying Prisma", async () => {
    vi.mocked(prisma.products.findUnique).mockClear();

    await expect(getInventoryProduct("missing")).resolves.toBeNull();

    expect(prisma.products.findUnique).not.toHaveBeenCalled();
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
    const taxonomy = await listInventoryTaxonomy();
    expect(taxonomy[0]?.id).toMatch(/^category:/);
  });

  it("filters movement reads by product and bounds the result", async () => {
    await listInventoryStockMovements("019f65c1-74fe-7bd3-8400-000000000001");
    expect(prisma.stock_movements.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { product_id: "019f65c1-74fe-7bd3-8400-000000000001" },
        take: 500,
      }),
    );
  });
});

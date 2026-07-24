import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InventoryProduct } from "@/lib/admin/inventory/inventory-types";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type { StaffSession } from "@/server/auth/session";

const PRODUCT_ID = "019f65c1-74fe-7bd3-8400-000000000001";
const actor: StaffSession = {
  kind: "staff",
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",
};

const harness = vi.hoisted(() => {
  const state = {
    currentRow: null as Record<string, unknown> | null,
  };
  const tx = {
    products: {
      findUnique: vi.fn(async () => state.currentRow),
      update: vi.fn(),
      create: vi.fn(),
    },
    holds: { count: vi.fn(async () => 0) },
    order_lines: { count: vi.fn(async () => 0) },
    stock_movements: { count: vi.fn(async () => 0) },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  const Prisma = {
    TransactionIsolationLevel: { Serializable: "Serializable" },
    PrismaClientKnownRequestError,
  };
  return { Prisma, prisma, state, tx };
});

const getInventoryProductMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  Prisma: harness.Prisma,
  prisma: harness.prisma,
}));

vi.mock("./inventory-read", () => ({
  getInventoryProduct: getInventoryProductMock,
}));

import { saveInventoryProduct } from "./inventory-service";

function stockedProduct(): InventoryProduct {
  return {
    id: PRODUCT_ID,
    slug: "recorded-stock-product",
    name: "Recorded stock product",
    description: "A product whose stock has already been received.",
    category: "Tops",
    collection: null,
    brand: "Laitstyles",
    image: "/product-placeholder.svg",
    media: [],
    price: 10_000,
    referencePrice: null,
    cost: null,
    lifecycle: "draft",
    publication: "unpublished",
    channels: [],
    lowStockThreshold: 1,
    createdAt: "2026-07-15T14:30:00.000Z",
    updatedAt: "2026-07-15T14:30:00.000Z",
    inventoryMode: "stocked",
    sku: "SKU-RECORDED",
    sizeLabel: "M",
    colour: "Black",
    stock: {
      totalReceived: 0,
      available: 0,
      reserved: 0,
      sold: 0,
      returned: 0,
      damaged: 0,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  harness.state.currentRow = null;
});

describe("inventory write regressions", () => {
  it("rechecks inventory-mode changes against transactional stock", async () => {
    getInventoryProductMock.mockResolvedValue(stockedProduct());
    harness.state.currentRow = {
      id: PRODUCT_ID,
      inventory_mode: "stocked",
      stock_levels: [
        {
          id: "019f65c1-74fe-7bd3-8600-000000000001",
          variant_id: null,
          total_received: 5,
          available: 5,
          reserved: 0,
          committed: 0,
          sold: 0,
          returned: 0,
          damaged: 0,
        },
      ],
      product_variants: [],
      product_media: [],
      product_measurements: [],
      product_channels: [],
    };

    const values = createEmptyProductEditorValues("variant");
    if (values.inventoryMode !== "variant") throw new Error("fixture mismatch");
    values.productId = PRODUCT_ID;
    values.name = "Recorded stock product";
    values.category = "Tops";
    values.brand = "Laitstyles";
    values.description = "A product whose stock has already been received.";
    values.internalReference = "SKU-RECORDED";
    values.sellingPrice = 10_000;

    const result = await saveInventoryProduct(actor, values, "draft");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation-failed");
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: "inventoryMode", step: "type" }),
      );
    }
    expect(harness.prisma.$transaction).toHaveBeenCalledOnce();
    expect(harness.tx.products.update).not.toHaveBeenCalled();
  });

  it("rejects relative media paths before starting a database transaction", async () => {
    getInventoryProductMock.mockResolvedValue(null);
    const values = createEmptyProductEditorValues("stocked");
    if (values.inventoryMode !== "stocked") throw new Error("fixture mismatch");
    values.name = "Relative media product";
    values.category = "Tops";
    values.brand = "Laitstyles";
    values.description = "A product with a non-durable image reference.";
    values.internalReference = "SKU-RELATIVE";
    values.sellingPrice = 10_000;
    values.media = [
      {
        id: "relative-media",
        url: "/product-placeholder.svg",
        alt: "Relative placeholder",
        kind: "cover",
        position: 0,
        source: "url",
      },
    ];

    const result = await saveInventoryProduct(actor, values, "draft");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: "media.0.url", step: "images" }),
      );
    }
    expect(harness.prisma.$transaction).not.toHaveBeenCalled();
  });
});

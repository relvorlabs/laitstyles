import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type { StaffSession } from "@/server/auth/session";

const harness = vi.hoisted(() => {
  const tx = {
    products: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    audit_events: { create: vi.fn() },
  };

  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }

  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  return {
    tx,
    prisma,
    Prisma: {
      TransactionIsolationLevel: { Serializable: "Serializable" },
      PrismaClientKnownRequestError,
    },
    getAdminProduct: vi.fn(),
    assertProductInventoryModeCanChange: vi.fn(),
    writeProductStockAndVariants: vi.fn(),
    resolveProductTaxonomyId: vi.fn(),
    writeProductMedia: vi.fn(),
    writeProductChannels: vi.fn(),
    writeProductMeasurements: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ Prisma: harness.Prisma, prisma: harness.prisma }));
vi.mock("@/modules/products/server/queries", () => ({
  getAdminProduct: harness.getAdminProduct,
}));
vi.mock("@/modules/inventory/server/stock-write", () => ({
  assertProductInventoryModeCanChange: harness.assertProductInventoryModeCanChange,
  writeProductStockAndVariants: harness.writeProductStockAndVariants,
}));
vi.mock("@/modules/products/server/write-helpers", () => ({
  resolveProductTaxonomyId: harness.resolveProductTaxonomyId,
  writeProductMedia: harness.writeProductMedia,
  writeProductChannels: harness.writeProductChannels,
  writeProductMeasurements: harness.writeProductMeasurements,
}));
vi.mock("@/modules/products/server/mappers", () => ({ adminProductInclude: {} }));

import { saveProduct } from "@/modules/products/server/product-commands";

const actor: StaffSession = {
  kind: "staff",
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",
};

beforeEach(() => {
  vi.clearAllMocks();
  harness.tx.products.findUnique.mockResolvedValue(null);
  harness.tx.products.create.mockResolvedValue({
    id: "019f65c1-74fe-7bd3-8400-000000000001",
    slug: "test-product",
  });
  harness.tx.audit_events.create.mockResolvedValue({});
  harness.resolveProductTaxonomyId.mockResolvedValue(null);
});

describe("saveProduct", () => {
  it("creates through one serializable transaction without a client database id", async () => {
    const values = validStockedValues();
    const saved = savedStockedProduct();
    harness.getAdminProduct.mockResolvedValueOnce(null).mockResolvedValueOnce(saved);

    const result = await saveProduct(actor, values, "draft");

    expect(result).toMatchObject({ ok: true, value: { product: saved, previousSlug: null } });
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
    expect(harness.tx.products.create).toHaveBeenCalledWith({
      data: expect.not.objectContaining({ id: expect.anything() }),
    });
    expect(harness.writeProductStockAndVariants).toHaveBeenCalledWith(
      harness.tx,
      actor,
      saved.id,
      values,
      null,
    );
    expect(harness.tx.audit_events.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_profile_id: actor.authUserId,
        action: "inventory:create",
        target_table: "products",
        target_id: saved.id,
      }),
    });
  });

  it("rejects non-durable preview media before opening a transaction", async () => {
    const values = validStockedValues();
    values.media = [
      {
        id: "preview",
        url: "blob:http://localhost/preview",
        alt: "Preview",
        kind: "cover",
        position: 0,
        source: "local-preview",
      },
    ];
    harness.getAdminProduct.mockResolvedValueOnce(null);

    const result = await saveProduct(actor, values, "draft");

    expect(result).toMatchObject({
      ok: false,
      error: { code: "validation-failed", issues: [expect.objectContaining({ step: "images" })] },
    });
    expect(harness.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("maps Prisma uniqueness failures to the stable product error", async () => {
    const values = validStockedValues();
    harness.getAdminProduct.mockResolvedValueOnce(null);
    harness.tx.products.create.mockRejectedValueOnce(
      new harness.Prisma.PrismaClientKnownRequestError("duplicate", "P2002"),
    );

    const result = await saveProduct(actor, values, "draft");

    expect(result).toEqual({
      ok: false,
      error: {
        code: "duplicate-reference",
        message: "The product slug, archive number or SKU is already used.",
      },
    });
  });
});

function validStockedValues() {
  const values = createEmptyProductEditorValues("stocked");
  if (values.inventoryMode !== "stocked") throw new Error("fixture mismatch");
  return {
    ...values,
    name: "Test product",
    category: "Tops",
    brand: "Laitstyles",
    description: "A persisted product description.",
    internalReference: "SKU-1",
    sellingPrice: 10_000,
    stocked: { ...values.stocked, quantity: 3 },
  };
}

function savedStockedProduct() {
  return {
    id: "019f65c1-74fe-7bd3-8400-000000000001",
    slug: "test-product",
    name: "Test product",
    description: "A persisted product description.",
    category: "Tops",
    collection: null,
    brand: "Laitstyles",
    image: "/product-placeholder.svg",
    media: [],
    price: 10_000,
    referencePrice: null,
    cost: null,
    lifecycle: "draft" as const,
    publication: "unpublished" as const,
    channels: [],
    lowStockThreshold: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    inventoryMode: "stocked" as const,
    sku: "SKU-1",
    sizeLabel: "M",
    colour: "Black",
    stock: {
      totalReceived: 3,
      available: 3,
      reserved: 0,
      sold: 0,
      returned: 0,
      damaged: 0,
    },
  };
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffSession } from "@/server/auth/session";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type {
  InventoryProduct,
  ProductEditorValues,
} from "@/lib/admin/shared/types";

const PRODUCT_ID = "019f65c1-74fe-7bd3-8400-000000000001";
const VARIANT_ID = "019f65c1-74fe-7bd3-8400-000000000011";
const actor: StaffSession = {
  kind: "staff",
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  role: "admin",
};

const harness = vi.hoisted(() => {
  const productId = "019f65c1-74fe-7bd3-8400-000000000001";
  const variantId = "019f65c1-74fe-7bd3-8400-000000000011";
  const recorded = {
    productCreates: [] as Record<string, unknown>[],
    productUpdates: [] as Record<string, unknown>[],
    stockCreates: [] as Record<string, unknown>[],
    stockUpdates: [] as Record<string, unknown>[],
    movementCreates: [] as Record<string, unknown>[],
    auditCreates: [] as Record<string, unknown>[],
    variantCreates: [] as Record<string, unknown>[],
  };
  const state = {
    currentRow: null as Record<string, unknown> | null,
    holds: 0,
    orderLines: 0,
    movements: 0,
    saved: 0,
  };
  const tx = {
    products: {
      findUnique: vi.fn(async () => state.currentRow),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        recorded.productCreates.push(data);
        return { id: productId, slug: data.slug };
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        recorded.productUpdates.push(data);
        return { id: productId, slug: data.slug };
      }),
      delete: vi.fn(async () => ({ id: productId })),
      findMany: vi.fn(async () => []),
    },
    catalogue_categories: {
      upsert: vi.fn(async () => ({ id: "019f65c1-74fe-7bd3-8400-000000000021" })),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "019f65c1-74fe-7bd3-8400-000000000021",
        ...data,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      })),
      update: vi.fn(),
      delete: vi.fn(),
    },
    catalogue_collections: {
      upsert: vi.fn(async () => ({ id: "019f65c1-74fe-7bd3-8400-000000000022" })),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product_media: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async () => ({})),
    },
    cloudinary_assets: {
      upsert: vi.fn(async () => ({ id: "019f65c1-74fe-7bd3-8400-000000000031" })),
    },
    product_channels: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
    product_measurements: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
    product_variants: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        recorded.variantCreates.push(data);
        return { id: variantId, ...data };
      }),
      update: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    stock_levels: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        recorded.stockCreates.push(data);
        return { id: "stock-new", ...data };
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        recorded.stockUpdates.push(data);
        return { id: "stock-existing", ...data };
      }),
      delete: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    stock_movements: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        recorded.movementCreates.push(data);
        return {};
      }),
      count: vi.fn(async () => state.movements),
    },
    holds: { count: vi.fn(async () => state.holds) },
    order_lines: { count: vi.fn(async () => state.orderLines) },
    audit_events: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        recorded.auditCreates.push(data);
        return {};
      }),
    },
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
  const prisma = {
    $transaction: vi.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
    products: {
      findUnique: vi.fn(async () => ({
        id: productId,
        name: "Test product",
        slug: "test-product",
      })),
      count: vi.fn(async () => 0),
    },
    order_lines: { count: vi.fn(async () => state.orderLines) },
    holds: { count: vi.fn(async () => state.holds) },
    stock_movements: { count: vi.fn(async () => state.movements) },
    customer_saved_products: { count: vi.fn(async () => state.saved) },
  };
  return { Prisma, prisma, tx, state, recorded };
});

const getInventoryProductMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  Prisma: harness.Prisma,
  prisma: harness.prisma,
}));

vi.mock("./inventory-read", () => ({
  getInventoryProduct: getInventoryProductMock,
}));

import {
  archiveInventoryProduct,
  createInventoryTaxonomy,
  deleteInventoryProduct,
  saveInventoryProduct,
} from "./inventory-service";

function stock() {
  return {
    totalReceived: 3,
    available: 3,
    reserved: 0,
    sold: 0,
    returned: 0,
    damaged: 0,
  };
}

function savedProduct(mode: "unique" | "stocked" | "variant"): InventoryProduct {
  const base = {
    id: PRODUCT_ID,
    slug: "test-product",
    name: "Test product",
    description: "A persisted product.",
    category: "Tops",
    collection: null,
    brand: "Laitstyles",
    material: null,
    fit: null,
    style: null,
    careInstructions: null,
    flawNotes: null,
    image: "/product-placeholder.svg",
    media: [],
    price: 10_000,
    referencePrice: null,
    cost: null,
    lifecycle: "draft" as const,
    publication: "unpublished" as const,
    channels: [],
    lowStockThreshold: 1,
    fulfilment: {
      weightKg: null,
      pickupAvailable: true,
      deliveryRestrictions: "",
      packagingNotes: "",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  if (mode === "unique") {
    return {
      ...base,
      inventoryMode: "unique",
      archiveNumber: "LST-1",
      condition: "Good",
      size: "M",
      colour: "Black",
      measurements: [],
      stock: stock(),
    };
  }
  if (mode === "stocked") {
    return {
      ...base,
      inventoryMode: "stocked",
      sku: "SKU-1",
      sizeLabel: "M",
      colour: "Black",
      stock: stock(),
    };
  }
  return {
    ...base,
    inventoryMode: "variant",
    optionNames: ["Size"],
    variants: [
      {
        id: VARIANT_ID,
        label: "Small",
        sku: "SKU-S",
        size: "S",
        colour: null,
        imageUrl: null,
        price: null,
        cost: null,
        stock: stock(),
      },
    ],
  };
}

function valuesFor(mode: "unique" | "stocked" | "variant"): ProductEditorValues {
  const common = {
    name: "Test product",
    category: "Tops",
    brand: "Laitstyles",
    description: "A persisted product description.",
    internalReference: mode === "unique" ? "LST-1" : "SKU-1",
    sellingPrice: 10_000,
  };

  if (mode === "unique") {
    const values = createEmptyProductEditorValues("unique");
    if (values.inventoryMode !== "unique") throw new Error("fixture mismatch");
    return { ...values, ...common };
  }

  if (mode === "stocked") {
    const values = createEmptyProductEditorValues("stocked");
    if (values.inventoryMode !== "stocked") throw new Error("fixture mismatch");
    return {
      ...values,
      ...common,
      stocked: { ...values.stocked, quantity: 3 },
    };
  }

  const values = createEmptyProductEditorValues("variant");
  if (values.inventoryMode !== "variant") throw new Error("fixture mismatch");
  return {
    ...values,
    ...common,
    variant: {
      optionNames: ["Size"],
      variants: [
        {
          id: "client-variant",
          label: "Small",
          sku: "SKU-S",
          size: "S",
          colour: "",
          imageUrl: "",
          price: null,
          cost: null,
          quantity: 3,
        },
      ],
    },
  };
}

beforeEach(() => {
  harness.state.currentRow = null;
  harness.state.holds = 0;
  harness.state.orderLines = 0;
  harness.state.movements = 0;
  harness.state.saved = 0;
  for (const values of Object.values(harness.recorded)) values.length = 0;
  vi.clearAllMocks();
});

describe("saveInventoryProduct", () => {
  it.each(["unique", "stocked", "variant"] as const)(
    "creates a %s product without a client-supplied database id",
    async (mode) => {
      getInventoryProductMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedProduct(mode));

      const result = await saveInventoryProduct(actor, valuesFor(mode), "draft");

      expect(result.ok).toBe(true);
      expect(harness.recorded.productCreates[0]).not.toHaveProperty("id");
      if (mode === "variant") {
        expect(harness.recorded.variantCreates[0]).not.toHaveProperty("id");
      }
      expect(harness.recorded.auditCreates[0]).toMatchObject({
        actor_profile_id: actor.authUserId,
        action: "inventory:create",
      });
    },
  );

  it("rejects local preview media before any database write", async () => {
    getInventoryProductMock.mockResolvedValueOnce(null);
    const values = valuesFor("stocked");
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

    const result = await saveInventoryProduct(actor, values, "draft");

    expect(result.ok).toBe(false);
    expect(harness.tx.products.create).not.toHaveBeenCalled();
  });

  it("preserves reserved and committed balances separately during an update", async () => {
    const existing = savedProduct("stocked");
    if (existing.inventoryMode !== "stocked") throw new Error("fixture mismatch");
    existing.stock = {
      totalReceived: 8,
      available: 3,
      reserved: 3,
      sold: 1,
      returned: 0,
      damaged: 1,
    };
    getInventoryProductMock
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    harness.state.currentRow = {
      ...baseCurrentRow("stocked"),
      stock_levels: [
        {
          id: "stock-existing",
          variant_id: null,
          total_received: 8,
          available: 3,
          reserved: 1,
          committed: 2,
          sold: 1,
          returned: 0,
          damaged: 1,
        },
      ],
    };
    const values = valuesFor("stocked");
    values.productId = PRODUCT_ID;
    values.stocked.quantity = 9;

    const result = await saveInventoryProduct(actor, values, "draft");

    expect(result.ok).toBe(true);
    expect(harness.recorded.stockUpdates[0]).toMatchObject({
      total_received: 9,
      available: 4,
      reserved: 1,
      committed: 2,
      sold: 1,
      damaged: 1,
    });
  });

  it("blocks removal of a variant with stock history", async () => {
    const existing = savedProduct("variant");
    getInventoryProductMock.mockResolvedValueOnce(existing);
    harness.state.currentRow = baseCurrentRow("variant");
    harness.state.movements = 1;
    const values = valuesFor("variant");
    values.productId = PRODUCT_ID;
    values.variant.variants = [];

    const result = await saveInventoryProduct(actor, values, "draft");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("history");
  });
});

describe("lifecycle and taxonomy writes", () => {
  it("denies permanent delete to a manager before reading the target", async () => {
    const result = await deleteInventoryProduct({ ...actor, role: "manager" }, PRODUCT_ID);
    expect(result.ok).toBe(false);
  });

  it("archives transactionally and writes an audit event", async () => {
    const result = await archiveInventoryProduct(actor, PRODUCT_ID);
    expect(result.ok).toBe(true);
    expect(harness.recorded.productUpdates[0]).toMatchObject({
      lifecycle: "archived",
      publication: "unpublished",
    });
    expect(harness.recorded.auditCreates[0]).toMatchObject({ action: "inventory:archive" });
  });

  it("creates taxonomy transactionally and returns the encoded database id", async () => {
    const result = await createInventoryTaxonomy(actor, {
      kind: "category",
      name: "Denim",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.item?.id).toBe(
        "category:019f65c1-74fe-7bd3-8400-000000000021",
      );
    }
    expect(harness.recorded.auditCreates[0]).toMatchObject({
      action: "inventory:category:create",
    });
  });
});

function baseCurrentRow(mode: "unique" | "stocked" | "variant") {
  return {
    id: PRODUCT_ID,
    slug: "test-product",
    inventory_mode: mode,
    product_media: [],
    product_measurements: [],
    product_channels: [],
    stock_levels: [],
    product_variants:
      mode === "variant"
        ? [
            {
              id: VARIANT_ID,
              label: "Small",
              sku: "SKU-S",
              size: "S",
              colour: null,
              price: null,
              cost: null,
              position: 0,
              product_media: [],
              stock_levels: [
                {
                  id: "stock-v1",
                  variant_id: VARIANT_ID,
                  total_received: 3,
                  available: 3,
                  reserved: 0,
                  committed: 0,
                  sold: 0,
                  returned: 0,
                  damaged: 0,
                },
              ],
            },
          ]
        : [],
  };
}

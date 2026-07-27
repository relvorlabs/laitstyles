import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffSession } from "@/modules/auth/server/session";

const PRODUCT_ID = "019f65c1-74fe-7bd3-8400-000000000001";
const CATEGORY_ID = "019f65c1-74fe-7bd3-8100-000000000001";
const actor: StaffSession = {
  kind: "staff",
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",
};

const harness = vi.hoisted(() => {
  const state = {
    product: null as { id: string; name: string; slug: string } | null,
    productDependencies: [0, 0, 0, 0] as [number, number, number, number],
    taxonomyUsage: 0,
  };
  const tx = {
    products: {
      findUnique: vi.fn(async () => state.product),
      count: vi.fn(async () => state.taxonomyUsage),
      delete: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      findMany: vi.fn(async () => []),
    },
    order_lines: { count: vi.fn(async () => state.productDependencies[0]) },
    holds: { count: vi.fn(async () => state.productDependencies[1]) },
    stock_movements: { count: vi.fn(async () => state.productDependencies[2]) },
    customer_saved_products: { count: vi.fn(async () => state.productDependencies[3]) },
    product_channels: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    catalogue_categories: {
      delete: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    catalogue_collections: {
      delete: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    audit_events: { create: vi.fn(async () => ({})) },
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

vi.mock("@/lib/prisma", () => ({
  Prisma: harness.Prisma,
  prisma: harness.prisma,
}));

import { deleteProduct as deleteInventoryProduct } from "@/modules/products/server/lifecycle-commands";
import { deleteProductTaxonomy as deleteInventoryTaxonomy } from "@/modules/products/server/taxonomy-commands";

beforeEach(() => {
  vi.clearAllMocks();
  harness.state.product = null;
  harness.state.productDependencies = [0, 0, 0, 0];
  harness.state.taxonomyUsage = 0;
});

describe("inventory transaction boundaries", () => {
  it("checks product dependencies inside the delete transaction", async () => {
    harness.state.product = {
      id: PRODUCT_ID,
      name: "Referenced product",
      slug: "referenced-product",
    };
    harness.state.productDependencies = [0, 1, 0, 0];

    const result = await deleteInventoryProduct(actor, PRODUCT_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("product-in-use");
    expect(harness.tx.products.delete).not.toHaveBeenCalled();
    expect(harness.prisma.$transaction).toHaveBeenCalled();
  });

  it("checks taxonomy usage inside the delete transaction", async () => {
    harness.state.taxonomyUsage = 1;

    const result = await deleteInventoryTaxonomy(actor, `category:${CATEGORY_ID}`);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("taxonomy-in-use");
    expect(harness.tx.catalogue_categories.delete).not.toHaveBeenCalled();
    expect(harness.prisma.$transaction).toHaveBeenCalled();
  });
});

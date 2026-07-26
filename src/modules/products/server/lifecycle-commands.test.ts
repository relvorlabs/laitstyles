import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffSession } from "@/server/auth/session";

const harness = vi.hoisted(() => {
  const tx = {
    products: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    product_channels: { deleteMany: vi.fn() },
    order_lines: { count: vi.fn() },
    holds: { count: vi.fn() },
    stock_movements: { count: vi.fn() },
    customer_saved_products: { count: vi.fn() },
    audit_events: { create: vi.fn() },
  };
  const prisma = {
    products: { findUnique: vi.fn() },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    tx,
    prisma,
    Prisma: {
      TransactionIsolationLevel: { Serializable: "Serializable" },
      PrismaClientKnownRequestError,
    },
  };
});

vi.mock("@/lib/prisma", () => ({ Prisma: harness.Prisma, prisma: harness.prisma }));

import {
  archiveProduct,
  deleteProduct,
  restoreProduct,
} from "@/modules/products/server/lifecycle-commands";

const admin: StaffSession = {
  kind: "staff",
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",
};

beforeEach(() => {
  vi.clearAllMocks();
  harness.prisma.products.findUnique.mockResolvedValue({
    id: "019f65c1-74fe-7bd3-8400-000000000001",
    name: "Denim",
    slug: "denim",
  });
  harness.tx.products.findUnique.mockResolvedValue({
    id: "019f65c1-74fe-7bd3-8400-000000000001",
    name: "Denim",
    slug: "denim",
  });
  harness.tx.products.update.mockResolvedValue({});
  harness.tx.products.delete.mockResolvedValue({});
  harness.tx.product_channels.deleteMany.mockResolvedValue({ count: 1 });
  harness.tx.audit_events.create.mockResolvedValue({});
  harness.tx.order_lines.count.mockResolvedValue(0);
  harness.tx.holds.count.mockResolvedValue(0);
  harness.tx.stock_movements.count.mockResolvedValue(0);
  harness.tx.customer_saved_products.count.mockResolvedValue(0);
});

describe("product lifecycle commands", () => {
  it("archives inside a serializable transaction and removes selling channels", async () => {
    const result = await archiveProduct(admin, "019f65c1-74fe-7bd3-8400-000000000001");

    expect(result).toMatchObject({ ok: true, value: { deleted: false, slug: "denim" } });
    expect(harness.tx.products.update).toHaveBeenCalledWith({
      where: { id: "019f65c1-74fe-7bd3-8400-000000000001" },
      data: { lifecycle: "archived", publication: "unpublished", scheduled_at: null },
    });
    expect(harness.tx.product_channels.deleteMany).toHaveBeenCalled();
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
  });

  it("restores a product as active but unpublished", async () => {
    const result = await restoreProduct(admin, "019f65c1-74fe-7bd3-8400-000000000001");

    expect(result.ok).toBe(true);
    expect(harness.tx.products.update).toHaveBeenCalledWith({
      where: { id: "019f65c1-74fe-7bd3-8400-000000000001" },
      data: { lifecycle: "active", publication: "unpublished", scheduled_at: null },
    });
  });

  it("blocks permanent deletion when operational history exists", async () => {
    harness.tx.order_lines.count.mockResolvedValueOnce(1);

    const result = await deleteProduct(admin, "019f65c1-74fe-7bd3-8400-000000000001");

    expect(result).toMatchObject({ ok: false, error: { code: "product-in-use" } });
    expect(harness.tx.products.delete).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  products: { findUnique: vi.fn() },
  stock_levels: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  stock_movements: { create: vi.fn() },
  audit_events: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } },
  prisma: {
    $transaction: vi.fn(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
  },
}));

import { adjustInventoryStock } from "@/modules/inventory/server/adjust-stock";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.com",
  displayName: "Store owner",
  role: "admin" as const,
};

const productId = "22222222-2222-4222-8222-222222222222";
const variantId = "33333333-3333-4333-8333-333333333333";
const stockId = "44444444-4444-4444-8444-444444444444";

const stock = {
  id: stockId,
  product_id: productId,
  variant_id: null,
  total_received: 10,
  available: 6,
  reserved: 1,
  committed: 1,
  sold: 2,
  returned: 0,
  damaged: 0,
  created_at: new Date("2026-07-24T12:00:00.000Z"),
  updated_at: new Date("2026-07-24T12:00:00.000Z"),
};

describe("adjustInventoryStock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.products.findUnique.mockResolvedValue({ inventory_mode: "stocked", product_variants: [] });
    tx.stock_levels.findFirst.mockResolvedValue(stock);
    tx.stock_levels.updateMany.mockResolvedValue({ count: 1 });
    tx.stock_levels.findUniqueOrThrow.mockResolvedValue({
      ...stock,
      total_received: 12,
      available: 8,
    });
    tx.stock_movements.create.mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      product_id: productId,
      variant_id: null,
      kind: "adjusted",
      quantity: 2,
      occurred_at: new Date("2026-07-24T13:00:00.000Z"),
      actor_profile_id: actor.authUserId,
      note: "Cycle count correction",
    });
    tx.audit_events.create.mockResolvedValue({});
  });

  it("updates the balance and appends an immutable movement", async () => {
    const result = await adjustInventoryStock(actor, {
      productId,
      variantId: null,
      quantityDelta: 2,
      note: "  Cycle   count correction  ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.balance).toMatchObject({ totalReceived: 12, available: 8 });
    expect(result.value.movement).toMatchObject({
      productId,
      variantId: null,
      quantity: 2,
      note: "Cycle count correction",
    });
    expect(tx.stock_levels.updateMany).toHaveBeenCalledWith({
      where: { id: stockId, total_received: 10, available: 6 },
      data: { total_received: { increment: 2 }, available: { increment: 2 } },
    });
    expect(tx.stock_movements.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        product_id: productId,
        variant_id: null,
        kind: "adjusted",
        quantity: 2,
        actor_profile_id: actor.authUserId,
      }),
    });
    expect(tx.audit_events.create).toHaveBeenCalledOnce();
  });

  it("rejects a reduction that would make available stock negative", async () => {
    const result = await adjustInventoryStock(actor, {
      productId,
      variantId: null,
      quantityDelta: -7,
      note: "Cycle count correction",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid-adjustment",
        message: "This adjustment would create an invalid stock balance.",
      },
    });
    expect(tx.stock_levels.updateMany).not.toHaveBeenCalled();
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
  });

  it("requires a variant that belongs to variant-managed products", async () => {
    tx.products.findUnique.mockResolvedValue({
      inventory_mode: "variant",
      product_variants: [{ id: variantId }],
    });

    const result = await adjustInventoryStock(actor, {
      productId,
      variantId: "66666666-6666-4666-8666-666666666666",
      quantityDelta: 1,
      note: "Cycle count correction",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "variant-not-found",
        message: "Choose a variant that belongs to this product.",
      },
    });
    expect(tx.stock_levels.findFirst).not.toHaveBeenCalled();
  });

  it("rejects stale concurrent balances instead of overwriting them", async () => {
    tx.stock_levels.updateMany.mockResolvedValue({ count: 0 });

    const result = await adjustInventoryStock(actor, {
      productId,
      variantId: null,
      quantityDelta: 2,
      note: "Cycle count correction",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid-adjustment",
        message: "The stock balance changed while this adjustment was being applied. Try again.",
      },
    });
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
  });
});

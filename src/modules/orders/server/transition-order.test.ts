import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  stockMutation: vi.fn(),
  mapStatus: vi.fn((row: { currentStatus: string }) => row.currentStatus),
  mapOrder: vi.fn((row: { order_number: string }) => ({
    id: row.order_number,
    fulfilmentStatus: "delivered",
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: mocks.stockMutation,
  OperationalStockError: class OperationalStockError extends Error {},
}));
vi.mock("@/modules/orders/server/mappers", () => ({
  adminOrderInclude: {},
  mapAdminOrderRow: mocks.mapOrder,
  mapDatabaseOrderStatus: mocks.mapStatus,
}));
vi.mock("@/modules/orders/server/queries", () => ({
  orderIdentifierWhere: (identifier: string) => ({ order_number: identifier }),
}));

import { transitionOrder } from "@/modules/orders/server/transition-order";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin" as const,
};
const orderId = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transitionOrder stock invariants", () => {
  it("moves committed stock to sold when customer handoff is delivered", async () => {
    const tx = createTx("ready-for-pickup", "committed");
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await transitionOrder(actor, "LS-TEST1234", "delivered");

    expect(result.ok).toBe(true);
    expect(mocks.stockMutation).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        productId,
        quantity: 1,
        kind: "sell-committed",
        relatedOrderId: orderId,
      }),
    );
  });

  it("releases reserved stock when a pending order is cancelled", async () => {
    const tx = createTx("pending-payment", "reserved");
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await transitionOrder(actor, "LS-TEST1234", "cancelled");

    expect(result.ok).toBe(true);
    expect(mocks.stockMutation).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        productId,
        quantity: 1,
        kind: "release-reserved",
        relatedOrderId: orderId,
      }),
    );
  });

  it("rejects a return before delivery without touching stock", async () => {
    const tx = createTx("dispatched", "committed");
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await transitionOrder(actor, "LS-TEST1234", "returned");

    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid-order-transition" },
    });
    expect(mocks.stockMutation).not.toHaveBeenCalled();
    expect(tx.orders.update).not.toHaveBeenCalled();
  });
});

function createTx(currentStatus: string, stockState: string) {
  const order = {
    id: orderId,
    order_number: "LS-TEST1234",
    source: "online-order",
    currentStatus,
    payment_method: "paystack",
    currency: "NGN",
    total: { minus: vi.fn(() => "0.00") },
    refunded_amount: "0.00",
    delivery_city: "Lagos",
    customer_id: "44444444-4444-4444-8444-444444444444",
    order_lines: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        product_id: productId,
        variant_id: null,
        quantity: 1,
        stock_state: stockState,
      },
    ],
  };
  return {
    orders: {
      findFirst: vi.fn().mockResolvedValue(order),
      update: vi.fn().mockResolvedValue(order),
      findUniqueOrThrow: vi.fn().mockResolvedValue(order),
    },
    order_lines: { update: vi.fn().mockResolvedValue({}) },
    order_timeline_events: { create: vi.fn().mockResolvedValue({}) },
    order_payment_events: { create: vi.fn().mockResolvedValue({}) },
    activity_events: { create: vi.fn().mockResolvedValue({}) },
  };
}

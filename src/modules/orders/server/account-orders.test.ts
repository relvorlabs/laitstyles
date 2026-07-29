import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
  applyOperationalStockMutation: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orders: { findFirst: mocks.findFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: mocks.applyOperationalStockMutation,
}));

import { ApiError } from "@/lib/errors/api-error";
import { requestOrderCancellation } from "@/modules/orders/server/account-orders";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};

function orderRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "order-db-1",
    order_number: "LS-0001",
    customer_id: identity.customerId,
    payment_status: "pending",
    fulfilment_status: "unfulfilled",
    order_lines: [
      {
        id: "line-1",
        product_id: "product-1",
        variant_id: null,
        quantity: 1,
        stock_state: "reserved",
      },
    ],
    ...overrides,
  };
}

function createTx() {
  return {
    orders: { findFirst: mocks.findFirst, update: vi.fn() },
    order_lines: { update: vi.fn() },
    order_timeline_events: { create: vi.fn() },
    activity_events: { create: vi.fn() },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requestOrderCancellation", () => {
  it("conceals an order not owned by the consumer as not found", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(requestOrderCancellation(identity, "LS-0001")).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
    });
  });

  it("refuses to cancel a paid or fulfilled order", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(orderRow({ payment_status: "paid" }));
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(requestOrderCancellation(identity, "LS-0001")).rejects.toMatchObject({
      code: "ORDER_NOT_CANCELLABLE",
    });
    expect(tx.orders.update).not.toHaveBeenCalled();
  });

  it("releases reserved stock and cancels an eligible order", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(orderRow());
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await requestOrderCancellation(identity, "LS-0001", {
      reason: "Ordered by mistake",
    });

    expect(mocks.applyOperationalStockMutation).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ productId: "product-1", kind: "release-reserved" }),
    );
    expect(tx.order_lines.update).toHaveBeenCalledWith({
      where: { id: "line-1" },
      data: { stock_state: "released" },
    });
    expect(tx.orders.update).toHaveBeenCalledWith({
      where: { id: "order-db-1" },
      data: { payment_status: "cancelled", fulfilment_status: "cancelled", attention: null },
    });
    expect(tx.order_timeline_events.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        note: "Customer cancellation request: Ordered by mistake",
      }),
    });
    expect(result).toEqual({ orderNumber: "LS-0001" });
  });

  it("throws an ApiError instance so route handlers map it consistently", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(requestOrderCancellation(identity, "LS-0001")).rejects.toBeInstanceOf(ApiError);
  });
});

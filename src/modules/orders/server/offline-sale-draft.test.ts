import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  stockMutation: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    holds: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: mocks.stockMutation,
  OperationalStockError: class OperationalStockError extends Error {},
}));

import { createOfflineSaleDraft } from "@/modules/orders/server/offline-sale-draft";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin" as const,
};
const productId = "22222222-2222-4222-8222-222222222222";
const customerId = "33333333-3333-4333-8333-333333333333";
const orderId = "44444444-4444-4444-8444-444444444444";
const lineId = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createOfflineSaleDraft", () => {
  it("creates the pending order before reserving exact stock against its ID", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await createOfflineSaleDraft(actor, {
      lines: [{ productId, quantity: 2, unitPrice: 25_000 }],
      channel: "physical-store",
      customer: {
        kind: "new",
        name: "Walk-in customer",
        email: "customer@example.com",
        phone: "+2348000000000",
        city: "Lagos",
      },
      notes: "Customer is present.",
    });

    expect(result.ok).toBe(true);
    expect(tx.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payment_status: "pending",
          payment_method: "paystack",
          fulfilment_status: "unfulfilled",
          order_lines: {
            create: [
              expect.objectContaining({
                product_id: productId,
                quantity: 2,
                stock_state: "reserved",
              }),
            ],
          },
        }),
      }),
    );
    expect(mocks.stockMutation).toHaveBeenCalledWith(tx, {
      productId,
      quantity: 2,
      kind: "reserve",
      actorProfileId: actor.authUserId,
      note: expect.stringContaining("Reserved for in-person order"),
      relatedOrderId: orderId,
      metadata: expect.objectContaining({
        operation: "offline-sale-checkout",
        orderLineId: lineId,
      }),
    });
    expect(tx.orders.create.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.stockMutation.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });
});

function createTx() {
  return {
    products: {
      findUnique: vi.fn().mockResolvedValue({
        name: "Botanical Jeans",
        inventory_mode: "stocked",
        sku: "BJ-01",
        product_variants: [],
      }),
    },
    customers: {
      create: vi.fn().mockResolvedValue({
        id: customerId,
        name: "Walk-in customer",
        email: "customer@example.com",
        phone: "+2348000000000",
        city: "Lagos",
      }),
      findUnique: vi.fn(),
    },
    orders: {
      create: vi.fn().mockResolvedValue({
        id: orderId,
        order_number: "LS-TEST1234",
        order_lines: [
          {
            id: lineId,
            product_id: productId,
            variant_id: null,
            quantity: 2,
          },
        ],
      }),
    },
    payments: {
      create: vi.fn().mockResolvedValue({
        id: "66666666-6666-4666-8666-666666666666",
      }),
    },
    order_payment_events: { create: vi.fn().mockResolvedValue({}) },
  };
}

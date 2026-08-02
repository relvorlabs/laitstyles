import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaystackSettlementEvent } from "@/modules/checkout/types";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  applyStockMutation: vi.fn(),
  recordSuccessfulPayment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: mocks.applyStockMutation,
}));
vi.mock("@/modules/orders/server/payment-settlement", () => ({
  recordSuccessfulOrderPayment: mocks.recordSuccessfulPayment,
}));

import { settlePaystackEvent } from "@/modules/checkout/server/settle-payment";

const event = {
  source: "webhook",
  providerTransactionId: "4099260516",
  reference: "LS-CHECKOUT-cancelled",
  status: "success",
  amountMinor: 105_000,
  currency: "NGN",
  customerEmail: "buyer@example.com",
  paidAt: "2026-07-31T18:30:00.000Z",
  channel: "card",
  gatewayResponse: "Successful",
} satisfies PaystackSettlementEvent;

function decimal(value: number) {
  return { toString: () => value.toFixed(2) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("settlement after cancellation", () => {
  it("records a payment incident without reopening fulfilment or stock", async () => {
    const tx = {
      payments: {
        findUnique: vi.fn().mockResolvedValue({
          id: "77777777-7777-4777-8777-777777777777",
          reference: event.reference,
          amount: decimal(1_050),
          currency: "NGN",
          status: "initialized",
          orders: {
            id: "66666666-6666-4666-8666-666666666666",
            order_number: "LS-CANCELLED",
            customer_id: "22222222-2222-4222-8222-222222222222",
            customer_email: "buyer@example.com",
            payment_status: "cancelled",
            fulfilment_status: "cancelled",
            order_lines: [
              {
                product_id: "55555555-5555-4555-8555-555555555555",
                variant_id: null,
                quantity: 1,
                stock_state: "released",
              },
            ],
            holds: [],
          },
        }),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      orders: { update: vi.fn().mockResolvedValue({}) },
      order_payment_events: { create: vi.fn().mockResolvedValue({}) },
      order_timeline_events: { create: vi.fn().mockResolvedValue({}) },
      outbox_messages: { create: vi.fn().mockResolvedValue({}) },
      $executeRaw: vi.fn(),
    };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx));

    await expect(settlePaystackEvent(event)).resolves.toMatchObject({
      ok: true,
      value: {
        orderNumber: "LS-CANCELLED",
        status: "review_required",
        replayed: false,
      },
    });
    expect(tx.orders.update).toHaveBeenCalledWith({
      where: { id: "66666666-6666-4666-8666-666666666666" },
      data: { payment_status: "review_required", attention: "payment-review" },
    });
    expect(mocks.applyStockMutation).not.toHaveBeenCalled();
    expect(mocks.recordSuccessfulPayment).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  stockMutation: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: mocks.stockMutation,
}));

import { cancelFailedOfflineSaleDraft } from "@/modules/orders/server/offline-sale-checkout";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin" as const,
};
const draft = {
  orderId: "22222222-2222-4222-8222-222222222222",
  orderNumber: "LS-TEST1234",
  customerId: "33333333-3333-4333-8333-333333333333",
  customerName: "Walk-in customer",
  customerEmail: "customer@example.com",
  paymentId: "44444444-4444-4444-8444-444444444444",
  reference: "LS-INPERSON-test",
  amountKobo: 50_000,
  lines: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      productId: "66666666-6666-4666-8666-666666666666",
      quantity: 2,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cancelFailedOfflineSaleDraft", () => {
  it("releases only the exact draft lines and cancels the persisted attempt", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await cancelFailedOfflineSaleDraft(actor, draft, new Error("Paystack unavailable"));

    expect(mocks.stockMutation).toHaveBeenCalledTimes(1);
    expect(mocks.stockMutation).toHaveBeenCalledWith(tx, {
      productId: draft.lines[0]?.productId,
      quantity: 2,
      kind: "release-reserved",
      actorProfileId: actor.authUserId,
      note: `Released after checkout initialization failed for ${draft.orderNumber}.`,
      relatedOrderId: draft.orderId,
      metadata: {
        operation: "offline-sale-checkout-failed",
        orderLineId: draft.lines[0]?.id,
        paymentReference: draft.reference,
      },
    });
    expect(tx.order_lines.update).toHaveBeenCalledWith({
      where: { id: draft.lines[0]?.id },
      data: { stock_state: "released" },
    });
    expect(tx.payments.update).toHaveBeenCalledWith({
      where: { id: draft.paymentId },
      data: { status: "failed", gateway_response: "Paystack unavailable" },
    });
    expect(tx.orders.update).toHaveBeenCalledWith({
      where: { id: draft.orderId },
      data: {
        payment_status: "cancelled",
        fulfilment_status: "cancelled",
        attention: null,
      },
    });
  });
});

function createTx() {
  return {
    order_lines: { update: vi.fn().mockResolvedValue({}) },
    payments: { update: vi.fn().mockResolvedValue({}) },
    orders: { update: vi.fn().mockResolvedValue({}) },
    order_payment_events: { create: vi.fn().mockResolvedValue({}) },
    order_timeline_events: { create: vi.fn().mockResolvedValue({}) },
    activity_events: { create: vi.fn().mockResolvedValue({}) },
  };
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfiguredAuthOrigin: vi.fn(),
  isPaystackConfigured: vi.fn(),
  createOfflineSaleDraft: vi.fn(),
  initializeTransaction: vi.fn(),
  finalizeInitializedCheckout: vi.fn(),
  cancelFailedOfflineSaleDraft: vi.fn(),
  mapAdminOrderRow: vi.fn(),
  findPayment: vi.fn(),
  verifyTransaction: vi.fn(),
  settlePaystackEvent: vi.fn(),
}));

vi.mock("@/modules/auth/server/redirects", () => ({
  getConfiguredAuthOrigin: mocks.getConfiguredAuthOrigin,
}));
vi.mock("@/modules/orders/server/offline-sale-draft", () => ({
  createOfflineSaleDraft: mocks.createOfflineSaleDraft,
}));
vi.mock("@/modules/orders/server/offline-sale-checkout", () => ({
  finalizeInitializedCheckout: mocks.finalizeInitializedCheckout,
  cancelFailedOfflineSaleDraft: mocks.cancelFailedOfflineSaleDraft,
}));
vi.mock("@/modules/orders/server/mappers", () => ({
  adminOrderInclude: {},
  mapAdminOrderRow: mocks.mapAdminOrderRow,
}));
vi.mock("@/modules/payments/server/paystack", () => ({
  isPaystackConfigured: mocks.isPaystackConfigured,
  initializeTransaction: mocks.initializeTransaction,
  verifyTransaction: mocks.verifyTransaction,
  PaystackConfigurationError: class PaystackConfigurationError extends Error {},
  PaystackProviderError: class PaystackProviderError extends Error {},
}));
vi.mock("@/modules/checkout/server/settle-payment", () => ({
  settlePaystackEvent: mocks.settlePaystackEvent,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { payments: { findFirst: mocks.findPayment } },
}));

import { recordOfflineSale } from "@/modules/orders/server/offline-sale";
import { verifyOfflineSalePayment } from "@/modules/orders/server/offline-sale-payment";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  role: "admin" as const,
  email: "owner@example.com",
  displayName: "Owner",
};
const input = {
  lines: [
    {
      productId: "22222222-2222-4222-8222-222222222222",
      variantId: "33333333-3333-4333-8333-333333333333",
      quantity: 1,
      unitPrice: 2500,
    },
  ],
  channel: "physical-store" as const,
  customer: {
    kind: "new" as const,
    name: "Buyer",
    email: "buyer@example.com",
    phone: "+2348000000000",
    city: "Lagos",
  },
  notes: "",
};
const draft = {
  orderId: "44444444-4444-4444-8444-444444444444",
  orderNumber: "LS-OFFLINE1",
  customerId: "55555555-5555-4555-8555-555555555555",
  customerName: "Buyer",
  customerEmail: "buyer@example.com",
  paymentId: "66666666-6666-4666-8666-666666666666",
  reference: "LS-INPERSON-reference",
  amountKobo: 250_000,
  lines: [
    {
      id: "77777777-7777-4777-8777-777777777777",
      productId: input.lines[0].productId,
      variantId: input.lines[0].variantId,
      quantity: 1,
    },
  ],
};
const mappedOrder = {
  id: draft.orderNumber,
  databaseId: draft.orderId,
  customerId: draft.customerId,
  channel: input.channel,
  paymentStatus: "pending",
  fulfilmentStatus: "pending-payment",
  lines: [],
  total: 2500,
  placedAt: "2026-07-30T00:00:00.000Z",
  deliveryCity: "Lagos",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isPaystackConfigured.mockReturnValue(true);
  mocks.getConfiguredAuthOrigin.mockReturnValue("https://www.laitstyles.com");
  mocks.createOfflineSaleDraft.mockResolvedValue({ ok: true, value: draft });
  mocks.initializeTransaction.mockResolvedValue({
    authorizationUrl: "https://checkout.paystack.com/access",
    accessCode: "access",
    reference: draft.reference,
    rawResponse: { status: true, message: "created", data: {} },
  });
  mocks.finalizeInitializedCheckout.mockResolvedValue({ id: draft.orderId });
  mocks.mapAdminOrderRow.mockReturnValue(mappedOrder);
});

describe("recordOfflineSale", () => {
  it("creates a pending Paystack payment and returns access only through the staff command", async () => {
    const result = await recordOfflineSale(actor, input);

    expect(result).toMatchObject({
      ok: true,
      value: {
        order: { id: draft.orderNumber, paymentStatus: "pending" },
        checkout: {
          accessCode: "access",
          reference: draft.reference,
        },
      },
    });
    expect(mocks.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        email: draft.customerEmail,
        amountMinor: draft.amountKobo,
        reference: draft.reference,
        callbackUrl: `https://www.laitstyles.com/admin/orders?order=${draft.orderNumber}`,
      }),
    );
  });

  it("does not create an order when Paystack or the callback origin is not configured", async () => {
    mocks.getConfiguredAuthOrigin.mockReturnValueOnce(null);

    await expect(recordOfflineSale(actor, input)).resolves.toMatchObject({
      ok: false,
      error: { code: "paystack-not-configured" },
    });
    expect(mocks.createOfflineSaleDraft).not.toHaveBeenCalled();
  });
});

describe("verifyOfflineSalePayment", () => {
  it("converges staff verification on the shared idempotent settlement operation", async () => {
    mocks.findPayment.mockResolvedValue({
      id: draft.paymentId,
      reference: draft.reference,
      status: "initialized",
      orders: { ...mappedOrder, order_number: draft.orderNumber, payment_status: "pending" },
    });
    mocks.verifyTransaction.mockResolvedValue({
      id: "4099260516",
      status: "success",
      reference: draft.reference,
      amountMinor: draft.amountKobo,
      currency: "NGN",
      customer: { email: draft.customerEmail },
      paidAt: "2026-07-30T00:00:00.000Z",
      channel: "card",
      gatewayResponse: "Successful",
      message: null,
    });
    mocks.settlePaystackEvent.mockResolvedValue({
      ok: true,
      value: {
        checkoutId: draft.orderId,
        paymentId: draft.paymentId,
        orderNumber: draft.orderNumber,
        status: "success",
        replayed: false,
      },
    });
    mocks.findPayment
      .mockResolvedValueOnce({
        id: draft.paymentId,
        reference: draft.reference,
        status: "initialized",
        orders: { ...mappedOrder, order_number: draft.orderNumber, payment_status: "pending" },
      })
      .mockResolvedValueOnce({
        id: draft.paymentId,
        reference: draft.reference,
        status: "success",
        orders: { ...mappedOrder, paymentStatus: "paid", order_number: draft.orderNumber, payment_status: "paid" },
      });
    mocks.mapAdminOrderRow.mockReturnValueOnce({ ...mappedOrder, paymentStatus: "paid" });

    const result = await verifyOfflineSalePayment(actor, draft.orderNumber);

    expect(result).toMatchObject({
      ok: true,
      value: {
        order: { id: draft.orderNumber, paymentStatus: "paid" },
        status: "success",
        replayed: false,
      },
    });
    expect(mocks.settlePaystackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "manual_verify",
        reference: draft.reference,
        status: "success",
        amountMinor: draft.amountKobo,
      }),
    );
  });
});

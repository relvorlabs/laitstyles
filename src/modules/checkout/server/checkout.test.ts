import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type { CreateCheckoutInput, PaystackSettlementEvent } from "@/modules/checkout/types";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findIdempotency: vi.fn(),
  updatePayment: vi.fn(),
  updateHolds: vi.fn(),
  findOwnedPayment: vi.fn(),
  initializeTransaction: vi.fn(),
  verifyTransaction: vi.fn(),
  applyStockMutation: vi.fn(),
  getOwnedProfile: vi.fn(),
  resolveDeliveryQuote: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    idempotency_records: { findUnique: mocks.findIdempotency },
    payments: { update: mocks.updatePayment, findFirst: mocks.findOwnedPayment },
    holds: { updateMany: mocks.updateHolds },
  },
}));

vi.mock("@/modules/payments/server/paystack", () => ({
  initializeTransaction: mocks.initializeTransaction,
  verifyTransaction: mocks.verifyTransaction,
}));

vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: mocks.applyStockMutation,
  OperationalStockError: class OperationalStockError extends Error {},
}));

vi.mock("@/modules/customers/server/account-profile", () => ({
  getOwnedProfile: mocks.getOwnedProfile,
}));

vi.mock("@/modules/checkout/server/delivery-policy", () => ({
  resolveCheckoutDeliveryQuote: mocks.resolveDeliveryQuote,
}));

type CheckoutApi = {
  createCheckout: typeof import("@/modules/checkout/server/create-checkout").createCheckout;
  settlePaystackEvent: typeof import("@/modules/checkout/server/settle-payment").settlePaystackEvent;
  verifyCheckoutPayment: typeof import("@/modules/checkout/server/verify-payment").verifyCheckoutPayment;
};

async function loadCheckout(): Promise<CheckoutApi> {
  const [createModule, settlementModule, verificationModule] = await Promise.all([
    import("@/modules/checkout/server/create-checkout"),
    import("@/modules/checkout/server/settle-payment"),
    import("@/modules/checkout/server/verify-payment"),
  ]);
  return {
    createCheckout: createModule.createCheckout,
    settlePaystackEvent: settlementModule.settlePaystackEvent,
    verifyCheckoutPayment: verificationModule.verifyCheckoutPayment,
  };
}

const identity = {
  kind: "consumer",
  authUserId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  email: "buyer@example.com",
  displayName: "Buyer",
  phone: "+2348000000000",
} satisfies ConsumerSession;

function checkoutInput(overrides: Partial<CreateCheckoutInput> = {}): CreateCheckoutInput {
  return {
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
    addressId: "44444444-4444-4444-8444-444444444444",
    callbackUrl: "https://laitstyles.com/account/orders?payment=processing",
    lines: [
      {
        productId: "66666666-6666-4666-8666-666666666666",
        variantId: "77777777-7777-4777-8777-777777777777",
        quantity: 2,
      },
    ],
    ...overrides,
  };
}

function settlementEvent(
  overrides: Partial<PaystackSettlementEvent> = {},
): PaystackSettlementEvent {
  return {
    source: "manual_verify",
    providerTransactionId: "4099260516",
    reference: "LS-CHECKOUT-reference",
    status: "success",
    amountMinor: 251_500,
    currency: "NGN",
    customerEmail: "buyer@example.com",
    paidAt: "2026-07-29T20:00:00.000Z",
    channel: "card",
    gatewayResponse: "Successful",
    ...overrides,
  };
}

function decimal(value: number) {
  return { toString: () => value.toFixed(2), toFixed: () => value.toFixed(2) };
}

function createTransaction(overrides: Record<string, unknown> = {}) {
  const order = {
    id: "order-1",
    order_number: "LS-ORDER1",
    order_lines: [
      {
        id: "line-1",
        product_id: "66666666-6666-4666-8666-666666666666",
        variant_id: "77777777-7777-4777-8777-777777777777",
        quantity: 2,
      },
    ],
  };
  return {
    idempotency_records: {
      create: vi.fn().mockResolvedValue({ id: "idem-1" }),
      update: vi.fn().mockResolvedValue({}),
    },
    customer_addresses: {
      findFirst: vi.fn().mockResolvedValue({
        id: "44444444-4444-4444-8444-444444444444",
        customer_id: identity.customerId,
        line1: "1 Lagos Street",
        line2: null,
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
        delivery_notes: null,
      }),
    },
    delivery_zones: {
      findFirst: vi.fn().mockResolvedValue({
        id: "55555555-5555-4555-8555-555555555555",
        name: "Lagos",
        city: "Lagos",
        rate: decimal(15),
      }),
    },
    products: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "66666666-6666-4666-8666-666666666666",
          name: "Silk dress",
          price: decimal(1_250),
          sku: "DRESS",
          inventory_mode: "variant",
          lifecycle: "active",
          publication: "published",
          product_variants: [
            {
              id: "77777777-7777-4777-8777-777777777777",
              label: "Medium",
              sku: "DRESS-M",
              price: null,
            },
          ],
        },
      ]),
    },
    holds: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "hold-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    orders: { create: vi.fn().mockResolvedValue(order) },
    payments: {
      create: vi.fn().mockResolvedValue({ id: "payment-1", reference: "LS-CHECKOUT-reference" }),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    order_payment_events: { create: vi.fn().mockResolvedValue({}) },
    order_timeline_events: { create: vi.fn().mockResolvedValue({}) },
    order_lines: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    outbox_messages: { create: vi.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

function settlementTransaction(options: { alreadyPaid?: boolean; claim?: () => number } = {}) {
  const payment = {
    id: "payment-1",
    reference: "LS-CHECKOUT-reference",
    amount: decimal(2_515),
    currency: "NGN",
    status: options.alreadyPaid ? "success" : "initialized",
    orders: {
      id: "order-1",
      customer_id: identity.customerId,
      customer_email: "buyer@example.com",
      payment_status: options.alreadyPaid ? "paid" : "pending",
      order_number: "LS-ORDER1",
      order_lines: [
        {
          id: "line-1",
          product_id: "66666666-6666-4666-8666-666666666666",
          variant_id: "77777777-7777-4777-8777-777777777777",
          quantity: 2,
          stock_state: options.alreadyPaid ? "committed" : "reserved",
        },
      ],
      holds: [
        {
          id: "hold-1",
          status: options.alreadyPaid ? "converted" : "active",
          product_id: "66666666-6666-4666-8666-666666666666",
          variant_id: "77777777-7777-4777-8777-777777777777",
        },
      ],
    },
  };
  return {
    $executeRaw: vi.fn().mockResolvedValue(1),
    payments: {
      findUnique: vi.fn().mockResolvedValue(payment),
      updateMany: vi.fn().mockImplementation(async () => ({ count: options.claim?.() ?? 1 })),
      findUniqueOrThrow: vi.fn().mockResolvedValue(payment),
    },
    orders: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    order_lines: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    holds: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    order_payment_events: { create: vi.fn().mockResolvedValue({}) },
    order_timeline_events: { create: vi.fn().mockResolvedValue({}) },
    outbox_messages: { create: vi.fn().mockResolvedValue({}) },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findIdempotency.mockResolvedValue(null);
  mocks.updatePayment.mockResolvedValue({});
  mocks.updateHolds.mockResolvedValue({ count: 1 });
  mocks.getOwnedProfile.mockResolvedValue({
    authUserId: identity.authUserId,
    email: identity.email,
    firstName: "Ada",
    lastName: "Buyer",
    preferredName: "Buyer",
    phone: identity.phone,
  });
  mocks.resolveDeliveryQuote.mockResolvedValue({
    addressId: "44444444-4444-4444-8444-444444444444",
    deliveryZoneId: "55555555-5555-4555-8555-555555555555",
    label: "Lagos Mainland",
    coverageLabel: "Lagos Mainland rate",
    feeMinor: 1_500,
    estimatedDays: "1-2",
    source: "regional-override",
  });
  mocks.initializeTransaction.mockResolvedValue({
    authorizationUrl: "https://checkout.paystack.com/access123",
    accessCode: "access123",
    reference: "LS-CHECKOUT-reference",
    rawResponse: { status: true, message: "created", data: {} },
  });
});

describe("checkout draft", () => {
  it("reconstructs authoritative product and delivery prices on the server", async () => {
    const api = await loadCheckout();
    const tx = createTransaction();
    mocks.transaction.mockImplementation(
      async (work: (client: ReturnType<typeof createTransaction>) => unknown) => work(tx),
    );

    const result = await api.createCheckout(identity, checkoutInput());

    expect(result).toMatchObject({
      ok: true,
      value: {
        checkoutId: "order-1",
        paymentId: "payment-1",
        reference: "LS-CHECKOUT-reference",
        accessCode: "access123",
        subtotalMinor: 250_000,
        deliveryFeeMinor: 1_500,
        totalMinor: 251_500,
      },
    });
    expect(mocks.resolveDeliveryQuote).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        id: "44444444-4444-4444-8444-444444444444",
        city: "Lagos",
        state: "Lagos",
      }),
    );
    expect(tx.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customer_name: "Buyer",
          customer_email: "buyer@example.com",
          delivery_phone: "+2348000000000",
          delivery_zone_id: "55555555-5555-4555-8555-555555555555",
          subtotal: "2500.00",
          delivery_fee: "15.00",
          total: "2515.00",
        }),
      }),
    );
    expect(mocks.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinor: 251_500, reference: "LS-CHECKOUT-reference" }),
    );
  });

  it("rejects checkout when required account details are incomplete", async () => {
    const api = await loadCheckout();
    mocks.getOwnedProfile.mockResolvedValueOnce({
      authUserId: identity.authUserId,
      email: identity.email,
      firstName: "Ada",
      lastName: "Buyer",
      preferredName: "",
      phone: "",
    });

    await expect(api.createCheckout(identity, checkoutInput())).resolves.toMatchObject({
      ok: false,
      error: { code: "CHECKOUT_INVALID", field: "profile.phone" },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.initializeTransaction).not.toHaveBeenCalled();
  });

  it("rejects a variant that does not belong to the selected product", async () => {
    const api = await loadCheckout();
    const tx = createTransaction();
    tx.products.findMany.mockResolvedValueOnce([
      {
        id: "66666666-6666-4666-8666-666666666666",
        name: "Silk dress",
        price: decimal(1_250),
        sku: "DRESS",
        inventory_mode: "variant",
        lifecycle: "active",
        publication: "published",
        product_variants: [],
      },
    ]);
    mocks.transaction.mockImplementation(
      async (work: (client: ReturnType<typeof createTransaction>) => unknown) => work(tx),
    );

    await expect(api.createCheckout(identity, checkoutInput())).resolves.toMatchObject({
      ok: false,
      error: { code: "CHECKOUT_VARIANT_INVALID" },
    });
    expect(tx.orders.create).not.toHaveBeenCalled();
  });

  it("rejects an address owned by another customer", async () => {
    const api = await loadCheckout();
    const tx = createTransaction();
    tx.customer_addresses.findFirst.mockResolvedValueOnce(null);
    mocks.transaction.mockImplementation(
      async (work: (client: ReturnType<typeof createTransaction>) => unknown) => work(tx),
    );

    await expect(api.createCheckout(identity, checkoutInput())).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_OWNED" },
    });
  });

  it("rejects an explicitly supplied expired hold", async () => {
    const api = await loadCheckout();
    const tx = createTransaction();
    tx.holds.findUnique.mockResolvedValueOnce({
      id: "88888888-8888-4888-8888-888888888888",
      customer_id: identity.customerId,
      product_id: "66666666-6666-4666-8666-666666666666",
      variant_id: "77777777-7777-4777-8777-777777777777",
      quantity: 2,
      status: "active",
      expires_at: new Date("2020-01-01T00:00:00.000Z"),
    });
    mocks.transaction.mockImplementation(
      async (work: (client: ReturnType<typeof createTransaction>) => unknown) => work(tx),
    );

    const input = checkoutInput({
      lines: [
        {
          ...checkoutInput().lines[0],
          holdId: "88888888-8888-4888-8888-888888888888",
        },
      ],
    });
    await expect(api.createCheckout(identity, input)).resolves.toMatchObject({
      ok: false,
      error: { code: "CHECKOUT_HOLD_EXPIRED" },
    });
  });

  it("retries the full draft transaction when a generated payment reference collides", async () => {
    const api = await loadCheckout();
    const tx = createTransaction();
    let attempts = 0;
    mocks.transaction.mockImplementation(
      async (work: (client: ReturnType<typeof createTransaction>) => unknown) => {
        attempts += 1;
        if (attempts === 1) throw { code: "P2002", meta: { target: ["reference"] } };
        return work(tx);
      },
    );

    await expect(api.createCheckout(identity, checkoutInput())).resolves.toMatchObject({
      ok: true,
      value: { paymentId: "payment-1", accessCode: "access123" },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});

describe("payment settlement", () => {
  it("allows only one stock transition and preserves later cart additions", async () => {
    const api = await loadCheckout();
    let claimed = false;
    const tx = settlementTransaction({
      claim: () => {
        if (claimed) return 0;
        claimed = true;
        return 1;
      },
    });
    mocks.transaction.mockImplementation(
      async (work: (client: ReturnType<typeof settlementTransaction>) => unknown) => work(tx),
    );

    const [first, replay] = await Promise.all([
      api.settlePaystackEvent(settlementEvent()),
      api.settlePaystackEvent(settlementEvent()),
    ]);

    expect([first, replay]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ok: true, value: expect.objectContaining({ replayed: false }) }),
        expect.objectContaining({ ok: true, value: expect.objectContaining({ replayed: true }) }),
      ]),
    );
    expect(mocks.applyStockMutation).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it("treats a paid order replay as a no-op", async () => {
    const api = await loadCheckout();
    const tx = settlementTransaction({ alreadyPaid: true });
    mocks.transaction.mockImplementation(
      async (work: (client: ReturnType<typeof settlementTransaction>) => unknown) => work(tx),
    );

    await expect(api.settlePaystackEvent(settlementEvent())).resolves.toMatchObject({
      ok: true,
      value: { paymentId: "payment-1", status: "success", replayed: true },
    });
    expect(tx.payments.updateMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(mocks.applyStockMutation).not.toHaveBeenCalled();
  });

  it("acknowledges a duplicate terminal failure without appending another event", async () => {
    const api = await loadCheckout();
    let claimed = false;
    const tx = settlementTransaction({
      claim: () => {
        if (claimed) return 0;
        claimed = true;
        return 1;
      },
    });
    mocks.transaction.mockImplementation(
      async (work: (client: ReturnType<typeof settlementTransaction>) => unknown) => work(tx),
    );
    const event = settlementEvent({ status: "failed", paidAt: null });

    const first = await api.settlePaystackEvent(event);
    const duplicate = await api.settlePaystackEvent(event);

    expect(first).toMatchObject({ ok: true, value: { status: "failed", replayed: false } });
    expect(duplicate).toMatchObject({ ok: true, value: { status: "failed", replayed: true } });
    expect(tx.order_payment_events.create).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("rejects verification when Paystack returns a different reference", async () => {
    const api = await loadCheckout();
    mocks.findOwnedPayment.mockResolvedValue({
      id: "99999999-9999-4999-8999-999999999999",
      reference: "pay_expected",
    });
    mocks.verifyTransaction.mockResolvedValue({
      id: "4099260516",
      status: "success",
      reference: "pay_different",
      amountMinor: 251_500,
      currency: "NGN",
      paidAt: "2026-07-29T20:00:00.000Z",
      channel: "card",
      gatewayResponse: "Successful",
      message: null,
      customer: { email: "buyer@example.com" },
    });

    await expect(
      api.verifyCheckoutPayment(identity, "99999999-9999-4999-8999-999999999999"),
    ).resolves.toMatchObject({ ok: false, error: { code: "PAYMENT_REFERENCE_MISMATCH" } });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

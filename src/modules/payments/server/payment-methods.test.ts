import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAuthorization: vi.fn(),
  findAuthorizations: vi.fn(),
  updateAuthorization: vi.fn(),
  updateAuthorizations: vi.fn(),
  findIdempotency: vi.fn(),
  updateIdempotency: vi.fn(),
  transaction: vi.fn(),
  updatePayment: vi.fn(),
  updateOrder: vi.fn(),
  updateRefund: vi.fn(),
  claimRefund: vi.fn(),
  verifyTransaction: vi.fn(),
  initializeTransaction: vi.fn(),
  createRefund: vi.fn(),
  deactivateAuthorization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment_authorizations: {
      findFirst: mocks.findAuthorization,
      findMany: mocks.findAuthorizations,
      update: mocks.updateAuthorization,
      updateMany: mocks.updateAuthorizations,
    },
    idempotency_records: {
      findUnique: mocks.findIdempotency,
      update: mocks.updateIdempotency,
    },
    payments: { update: mocks.updatePayment },
    orders: { update: mocks.updateOrder },
    payment_refunds: {
      update: mocks.updateRefund,
      updateMany: mocks.claimRefund,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/modules/payments/server/paystack", () => ({
  verifyTransaction: mocks.verifyTransaction,
  initializeTransaction: mocks.initializeTransaction,
  createRefund: mocks.createRefund,
  deactivateAuthorization: mocks.deactivateAuthorization,
}));
vi.mock("@/modules/payments/server/authorization-secrets", () => ({
  encryptAuthorizationCode: (value: string) => `encrypted:${value}`,
  decryptAuthorizationCode: (value: string) => value.replace(/^encrypted:/, ""),
}));

import {
  createPaymentMethodSetup,
  deletePaymentMethod,
  getPaymentMethodSetup,
  setDefaultPaymentMethod,
  verifyPaymentMethodSetup,
} from "@/modules/payments/server/payment-methods";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  email: "buyer@example.com",
  displayName: "Buyer",
  phone: null,
};
const attemptId = "33333333-3333-4333-8333-333333333333";
const payment = {
  id: "44444444-4444-4444-8444-444444444444",
  reference: "LS-METHOD-reference",
  access_code: "access",
  status: "initialized",
  payment_refunds: [],
  orders: { id: "55555555-5555-4555-8555-555555555555" },
};
const pendingAuthorization = {
  id: attemptId,
  customer_id: identity.customerId,
  authorization_code: "encrypted:pending",
  signature: `setup:${attemptId}`,
  bank: null,
  last4: null,
  exp_month: null,
  exp_year: null,
  country_code: null,
  channel: null,
  card_type: null,
  reusable: false,
  is_default: false,
  status: "pending",
  created_at: new Date("2026-07-30T00:00:00.000Z"),
  payments: [payment],
};
const providerTransaction = {
  id: "123",
  status: "success",
  reference: payment.reference,
  amountMinor: 5_000,
  currency: "NGN",
  customer: { email: identity.email, customerCode: "CUS_1" },
  authorization: {
    authorizationCode: "AUTH_1",
    reusable: true,
    signature: "SIG_1",
    channel: "card",
    brand: "visa",
    cardType: "visa",
    bank: "Test Bank",
    last4: "4081",
    expMonth: "12",
    expYear: "2030",
    countryCode: "ng",
  },
  paidAt: "2026-07-30T00:00:00.000Z",
  channel: "card",
  gatewayResponse: "Successful",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findAuthorization.mockResolvedValue(pendingAuthorization);
  mocks.findAuthorizations.mockResolvedValue([]);
  mocks.findIdempotency.mockResolvedValue(null);
  mocks.claimRefund.mockResolvedValue({ count: 1 });
  mocks.updateRefund.mockResolvedValue({ id: "refund-1" });
  mocks.verifyTransaction.mockResolvedValue(providerTransaction);
  mocks.createRefund.mockResolvedValue({ id: "REF_1", status: "processed" });
});

describe("payment method setup idempotency", () => {
  it("returns the canonical pending state for a concurrent setup key", async () => {
    mocks.findIdempotency.mockResolvedValueOnce({
      request_hash: identity.customerId,
      response_snapshot: null,
      status: "in_progress",
    });

    await expect(
      createPaymentMethodSetup(
        identity,
        { idempotencyKey: "66666666-6666-4666-8666-666666666666" },
        "https://www.laitstyles.com/account/payment-methods",
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_SETUP_PENDING" },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects cross-account reuse of an idempotency key", async () => {
    mocks.findIdempotency.mockResolvedValueOnce({
      request_hash: "99999999-9999-4999-8999-999999999999",
      response_snapshot: null,
      status: "in_progress",
    });

    await expect(
      createPaymentMethodSetup(
        identity,
        { idempotencyKey: "66666666-6666-4666-8666-666666666666" },
        "https://www.laitstyles.com/account/payment-methods",
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_INVALID", field: "idempotencyKey" },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("closes every local record when provider initialization fails", async () => {
    const createTx = {
      idempotency_records: {
        create: vi.fn().mockResolvedValue({ id: "idempotency-1" }),
      },
      payment_authorizations: {
        create: vi.fn().mockResolvedValue({ id: attemptId }),
      },
      orders: {
        create: vi.fn().mockResolvedValue({ id: payment.orders.id }),
      },
      payments: {
        create: vi.fn().mockResolvedValue({ id: payment.id }),
      },
    };
    const cleanupTx = {
      payments: { update: vi.fn() },
      payment_authorizations: { update: vi.fn() },
      orders: { update: vi.fn() },
      idempotency_records: { update: vi.fn() },
    };
    mocks.transaction
      .mockImplementationOnce(async (work: (client: typeof createTx) => unknown) => work(createTx))
      .mockImplementationOnce(async (work: (client: typeof cleanupTx) => unknown) =>
        work(cleanupTx),
      );
    mocks.initializeTransaction.mockRejectedValueOnce(new Error("provider unavailable"));

    const result = await createPaymentMethodSetup(
      identity,
      { idempotencyKey: "66666666-6666-4666-8666-666666666666" },
      "https://www.laitstyles.com/account/payment-methods",
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_PROVIDER_UNAVAILABLE" },
    });
    expect(cleanupTx.payments.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) }),
    );
    expect(cleanupTx.payment_authorizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "inactive", reusable: false }),
      }),
    );
    expect(cleanupTx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ payment_status: "cancelled", attention: null }),
      }),
    );
    expect(cleanupTx.idempotency_records.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed", completed_at: expect.any(Date) }),
      }),
    );
  });
});

describe("payment method setup", () => {
  it("denies cross-account setup reads", async () => {
    mocks.findAuthorization.mockResolvedValueOnce(null);
    await expect(getPaymentMethodSetup(identity, attemptId)).resolves.toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_SETUP_NOT_FOUND" },
    });
  });

  it("rejects a successful setup charge without a reusable authorization", async () => {
    mocks.verifyTransaction.mockResolvedValueOnce({
      ...providerTransaction,
      authorization: {
        ...providerTransaction.authorization,
        reusable: false,
      },
    });

    await expect(verifyPaymentMethodSetup(identity, attemptId)).resolves.toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_NOT_REUSABLE" },
    });
  });

  it("closes the setup lifecycle after terminal provider failure", async () => {
    const cleanupTx = {
      payments: { update: vi.fn() },
      payment_authorizations: { update: vi.fn() },
      orders: { update: vi.fn() },
    };
    mocks.verifyTransaction.mockResolvedValueOnce({
      ...providerTransaction,
      status: "failed",
    });
    mocks.transaction.mockImplementationOnce(async (work: (client: typeof cleanupTx) => unknown) =>
      work(cleanupTx),
    );

    const result = await verifyPaymentMethodSetup(identity, attemptId);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_SETUP_FAILED" },
    });
    expect(cleanupTx.payments.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) }),
    );
    expect(cleanupTx.payment_authorizations.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "inactive" }) }),
    );
    expect(cleanupTx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ payment_status: "cancelled" }) }),
    );
  });

  it("rejects a provider signature owned by another customer", async () => {
    mocks.findAuthorizations.mockResolvedValueOnce([
      {
        ...pendingAuthorization,
        id: "77777777-7777-4777-8777-777777777777",
        customer_id: "99999999-9999-4999-8999-999999999999",
        signature: providerTransaction.authorization.signature,
        status: "active",
        reusable: true,
      },
    ]);

    await expect(verifyPaymentMethodSetup(identity, attemptId)).resolves.toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_CUSTOMER_MISMATCH" },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("maps a concurrent global signature conflict to an ownership error", async () => {
    mocks.transaction.mockRejectedValueOnce({ code: "P2002" });

    await expect(verifyPaymentMethodSetup(identity, attemptId)).resolves.toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_CUSTOMER_MISMATCH" },
    });
  });

  it("tombstones a same-customer duplicate and persists its country descriptor", async () => {
    const duplicate = {
      ...pendingAuthorization,
      id: "77777777-7777-4777-8777-777777777777",
      signature: providerTransaction.authorization.signature,
      status: "active",
      reusable: true,
      is_default: true,
    };
    const activeMethod = {
      ...pendingAuthorization,
      status: "active",
      reusable: true,
      is_default: true,
      signature: providerTransaction.authorization.signature,
      authorization_code: "encrypted:AUTH_1",
      provider_customer_code: "CUS_1",
      bank: "Test Bank",
      last4: "4081",
      exp_month: "12",
      exp_year: "2030",
      country_code: "NG",
      channel: "card",
      card_type: "visa",
      payments: [
        {
          ...payment,
          status: "success",
          payment_refunds: [{ id: "refund-1", status: "processed" }],
        },
      ],
    };
    mocks.findAuthorizations.mockResolvedValueOnce([duplicate]);
    mocks.findAuthorization
      .mockResolvedValueOnce(pendingAuthorization)
      .mockResolvedValueOnce(pendingAuthorization)
      .mockResolvedValueOnce(activeMethod);

    const tx = {
      payment_authorizations: {
        update: vi
          .fn()
          .mockResolvedValueOnce({ ...duplicate, status: "inactive" })
          .mockResolvedValueOnce(activeMethod),
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      payments: { update: vi.fn().mockResolvedValue({ id: payment.id }) },
      orders: { update: vi.fn().mockResolvedValue({ id: payment.orders.id }) },
      payment_refunds: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "refund-1",
          provider_reference: null,
          status: "pending",
        }),
      },
    };
    mocks.transaction.mockImplementationOnce(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    );

    const result = await verifyPaymentMethodSetup(identity, attemptId);

    expect(result).toMatchObject({
      ok: true,
      value: {
        method: { id: attemptId, countryCode: "NG", isDefault: true },
        refundStatus: "processed",
      },
    });
    expect(tx.payment_authorizations.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: duplicate.id },
        data: expect.objectContaining({
          status: "inactive",
          signature: expect.stringContaining(`inactive:${duplicate.id}:`),
        }),
      }),
    );
    expect(tx.payment_authorizations.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ country_code: "NG" }),
      }),
    );
    expect(tx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ payment_status: "paid" }) }),
    );
    expect(mocks.createRefund).toHaveBeenCalledTimes(1);
  });
});

describe("saved method ownership and defaults", () => {
  it("enforces one default method inside one transaction", async () => {
    const active = {
      ...pendingAuthorization,
      status: "active",
      reusable: true,
    };
    const tx = {
      payment_authorizations: {
        findFirst: vi.fn().mockResolvedValue(active),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ ...active, is_default: true }),
      },
    };
    mocks.transaction.mockImplementationOnce(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    );

    const result = await setDefaultPaymentMethod(identity, attemptId);

    expect(result).toMatchObject({
      ok: true,
      value: { id: attemptId, isDefault: true },
    });
    expect(tx.payment_authorizations.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: identity.customerId }),
      }),
    );
  });

  it("makes provider deactivation idempotent for an already inactive method", async () => {
    mocks.findAuthorization.mockResolvedValueOnce({
      ...pendingAuthorization,
      status: "inactive",
    });
    const result = await deletePaymentMethod(identity, attemptId);
    expect(result).toEqual({ ok: true, value: { id: attemptId, inactive: true } });
    expect(mocks.deactivateAuthorization).not.toHaveBeenCalled();
  });

  it("tombstones a pending local method without sending a placeholder to Paystack", async () => {
    mocks.findAuthorization.mockResolvedValueOnce(pendingAuthorization);
    mocks.updateAuthorization.mockResolvedValueOnce({
      ...pendingAuthorization,
      status: "inactive",
    });

    const result = await deletePaymentMethod(identity, attemptId);

    expect(result).toEqual({ ok: true, value: { id: attemptId, inactive: true } });
    expect(mocks.deactivateAuthorization).not.toHaveBeenCalled();
    expect(mocks.updateAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "inactive",
          signature: expect.stringContaining(`inactive:${attemptId}:`),
        }),
      }),
    );
  });
});

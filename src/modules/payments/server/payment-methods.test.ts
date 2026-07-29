import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAuthorization: vi.fn(),
  findAuthorizations: vi.fn(),
  updateAuthorization: vi.fn(),
  updateAuthorizations: vi.fn(),
  findIdempotency: vi.fn(),
  transaction: vi.fn(),
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
    idempotency_records: { findUnique: mocks.findIdempotency },
    payments: { update: vi.fn() },
    payment_refunds: { update: vi.fn() },
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
  orders: { id: "order-1" },
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
  channel: null,
  card_type: null,
  reusable: false,
  is_default: false,
  status: "pending",
  created_at: new Date("2026-07-30T00:00:00.000Z"),
  payments: [payment],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findAuthorization.mockResolvedValue(pendingAuthorization);
  mocks.verifyTransaction.mockResolvedValue({
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
    },
    paidAt: "2026-07-30T00:00:00.000Z",
    channel: "card",
    gatewayResponse: "Successful",
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
      ...(await mocks.verifyTransaction()),
      authorization: { authorizationCode: "AUTH_1", reusable: false, signature: "SIG_1" },
    });
    await expect(verifyPaymentMethodSetup(identity, attemptId)).resolves.toMatchObject({
      ok: false,
      error: { code: "PAYMENT_METHOD_NOT_REUSABLE" },
    });
  });
});

describe("saved method ownership and defaults", () => {
  it("enforces one default method inside one transaction", async () => {
    const active = { ...pendingAuthorization, status: "active", reusable: true };
    const tx = {
      payment_authorizations: {
        findFirst: vi.fn().mockResolvedValue(active),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ ...active, is_default: true }),
      },
    };
    mocks.transaction.mockImplementationOnce(async (work: (client: typeof tx) => unknown) => work(tx));

    const result = await setDefaultPaymentMethod(identity, attemptId);

    expect(result).toMatchObject({ ok: true, value: { id: attemptId, isDefault: true } });
    expect(tx.payment_authorizations.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customer_id: identity.customerId }) }),
    );
  });

  it("makes provider deactivation idempotent for an already inactive method", async () => {
    mocks.findAuthorization.mockResolvedValueOnce({ ...pendingAuthorization, status: "inactive" });
    const result = await deletePaymentMethod(identity, attemptId);
    expect(result).toEqual({ ok: true, value: { id: attemptId, inactive: true } });
    expect(mocks.deactivateAuthorization).not.toHaveBeenCalled();
  });
});

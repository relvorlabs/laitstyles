import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type { CreateCheckoutInput } from "@/modules/checkout/types";

const mocks = vi.hoisted(() => ({
  findIdempotency: vi.fn(),
  findOrder: vi.fn(),
  initializeTransaction: vi.fn(),
  getOwnedProfile: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } },
  prisma: {
    idempotency_records: { findUnique: mocks.findIdempotency },
    orders: { findUnique: mocks.findOrder },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/modules/payments/server/paystack", () => ({
  initializeTransaction: mocks.initializeTransaction,
}));
vi.mock("@/modules/customers/server/account-profile", () => ({
  getOwnedProfile: mocks.getOwnedProfile,
}));
vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: vi.fn(),
  OperationalStockError: class OperationalStockError extends Error {},
}));
vi.mock("@/modules/checkout/server/delivery-policy", () => ({
  resolveCheckoutDeliveryQuote: vi.fn(),
}));
vi.mock("@/modules/checkout/server/coupons", () => ({
  validateCheckoutCoupon: vi.fn(),
}));

import { createCheckout } from "@/modules/checkout/server/create-checkout";

const identity = {
  kind: "consumer",
  authUserId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  email: "buyer@example.com",
  displayName: "Buyer",
  phone: "+2348000000000",
} satisfies ConsumerSession;

const input = {
  idempotencyKey: "33333333-3333-4333-8333-333333333333",
  addressId: "44444444-4444-4444-8444-444444444444",
  callbackUrl: "https://laitstyles.com/account/orders?payment=processing",
  lines: [
    {
      productId: "55555555-5555-4555-8555-555555555555",
      quantity: 1,
    },
  ],
} satisfies CreateCheckoutInput;

const snapshot = {
  checkoutId: "66666666-6666-4666-8666-666666666666",
  paymentId: "77777777-7777-4777-8777-777777777777",
  orderNumber: "LS-CANCELLED",
  reference: "LS-CHECKOUT-cancelled",
  accessCode: "old-access-code",
  status: "initialized",
  currency: "NGN",
  subtotalMinor: 100_000,
  deliveryFeeMinor: 5_000,
  discountMinor: 0,
  totalMinor: 105_000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOwnedProfile.mockResolvedValue({
    authUserId: identity.authUserId,
    email: identity.email,
    firstName: "Ada",
    lastName: "Buyer",
    preferredName: "Buyer",
    phone: identity.phone,
  });
  mocks.findIdempotency.mockResolvedValue({
    request_hash: expect.anything(),
    status: "completed",
    response_snapshot: snapshot,
  });
});

describe("checkout idempotency replay", () => {
  it("does not return a cancelled checkout snapshot", async () => {
    // Use the real request hash by accepting the first lookup and replacing its
    // matcher with the value observed in the repository call.
    mocks.findIdempotency.mockImplementationOnce(async () => ({
      request_hash: await readRequestHash(),
      status: "completed",
      response_snapshot: snapshot,
    }));
    mocks.findOrder.mockResolvedValue({
      payment_status: "cancelled",
      fulfilment_status: "cancelled",
      payments: [{ status: "initialized", access_code: null }],
    });

    await expect(createCheckout(identity, input)).resolves.toMatchObject({
      ok: false,
      error: {
        code: "CHECKOUT_IDEMPOTENCY_CONFLICT",
        checkoutId: snapshot.checkoutId,
        paymentId: snapshot.paymentId,
      },
    });
    expect(mocks.initializeTransaction).not.toHaveBeenCalled();
  });

  it("refreshes an active replay from current payment state", async () => {
    mocks.findIdempotency.mockImplementationOnce(async () => ({
      request_hash: await readRequestHash(),
      status: "completed",
      response_snapshot: snapshot,
    }));
    mocks.findOrder.mockResolvedValue({
      payment_status: "pending",
      fulfilment_status: "unfulfilled",
      payments: [{ status: "pending", access_code: "current-access-code" }],
    });

    await expect(createCheckout(identity, input)).resolves.toMatchObject({
      ok: true,
      value: {
        checkoutId: snapshot.checkoutId,
        status: "pending",
        accessCode: "current-access-code",
      },
    });
  });
});

async function readRequestHash(): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256")
    .update(JSON.stringify({ customerId: identity.customerId, input }))
    .digest("hex");
}

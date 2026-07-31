import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/modules/payments/server/payment-methods", () => ({
  createPaymentMethodSetup: vi.fn(),
  deletePaymentMethod: mocks.remove,
  getPaymentMethodSetup: vi.fn(),
  listPaymentMethods: vi.fn(),
  setDefaultPaymentMethod: vi.fn(),
  verifyPaymentMethodSetup: mocks.verify,
}));
vi.mock("@/modules/payments/server/api-errors", () => ({
  throwPaymentMethodApiError: vi.fn(),
}));
vi.mock("@/modules/payments/server/paystack", () => {
  class PaystackProviderError extends Error {}
  class PaystackConfigurationError extends Error {}
  return { PaystackProviderError, PaystackConfigurationError };
});

import { PaystackProviderError } from "@/modules/payments/server/paystack";
import {
  deletePaymentMethod,
  verifyPaymentMethodSetup,
} from "@/modules/payments/server/payment-methods/index";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  email: "buyer@example.com",
  displayName: "Buyer",
  phone: "+2348000000000",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("payment method server boundary", () => {
  it("normalizes provider verification failures", async () => {
    mocks.verify.mockRejectedValueOnce(
      new PaystackProviderError("provider unavailable", "verify-transaction", null),
    );

    await expect(
      verifyPaymentMethodSetup(identity, "33333333-3333-4333-8333-333333333333"),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "PAYMENT_METHOD_PROVIDER_UNAVAILABLE",
        message: "Paystack could not verify the payment-method setup. Try again safely.",
      },
    });
  });

  it("keeps the local method active when provider removal fails", async () => {
    mocks.remove.mockRejectedValueOnce(
      new PaystackProviderError("provider unavailable", "deactivate-authorization", null),
    );

    await expect(
      deletePaymentMethod(identity, "33333333-3333-4333-8333-333333333333"),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "PAYMENT_METHOD_PROVIDER_UNAVAILABLE",
        message: "Paystack could not deactivate this payment method, so it remains active locally.",
      },
    });
  });
});

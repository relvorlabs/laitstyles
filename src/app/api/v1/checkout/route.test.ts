import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  createCheckout: vi.fn(),
  getCheckout: vi.fn(),
  getConfiguredAuthOrigin: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/auth/server/redirects", () => ({
  getConfiguredAuthOrigin: mocks.getConfiguredAuthOrigin,
}));
vi.mock("@/modules/checkout/server/create-checkout", () => ({
  createCheckout: mocks.createCheckout,
}));
vi.mock("@/modules/checkout/server/get-checkout", () => ({ getCheckout: mocks.getCheckout }));

import { GET } from "./[checkoutId]/route";
import { POST } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  email: "buyer@example.com",
  displayName: "Buyer",
  phone: null,
};

const requestInput = {
  idempotencyKey: "33333333-3333-4333-8333-333333333333",
  addressId: "44444444-4444-4444-8444-444444444444",
  deliveryZoneId: "55555555-5555-4555-8555-555555555555",
  lines: [
    {
      productId: "66666666-6666-4666-8666-666666666666",
      variantId: "77777777-7777-4777-8777-777777777777",
      quantity: 1,
    },
  ],
};

const draft = {
  checkoutId: "88888888-8888-4888-8888-888888888888",
  paymentId: "99999999-9999-4999-8999-999999999999",
  orderNumber: "LS-ORDER1",
  reference: "LS-CHECKOUT-reference",
  accessCode: "access-code",
  status: "initialized" as const,
  currency: "NGN",
  subtotalMinor: 100_000,
  deliveryFeeMinor: 2_000,
  discountMinor: 0,
  totalMinor: 102_000,
};

function jsonRequest(body: unknown) {
  return new Request("https://app.example.com/api/v1/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.getConfiguredAuthOrigin.mockReturnValue("https://www.laitstyles.com");
  mocks.createCheckout.mockResolvedValue({ ok: true, value: draft });
  mocks.getCheckout.mockResolvedValue({
    ok: true,
    value: { ...draft, paidAt: null, lines: [] },
  });
});

describe("POST /api/v1/checkout", () => {
  it("rejects unauthenticated checkout", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await POST(jsonRequest(requestInput));

    expect(response.status).toBe(401);
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("rejects a client-controlled callback URL", async () => {
    const response = await POST(
      jsonRequest({ ...requestInput, callbackUrl: "https://attacker.example/callback" }),
    );

    expect(response.status).toBe(422);
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });

  it("derives the callback URL on the server and returns private checkout state", async () => {
    const response = await POST(jsonRequest(requestInput));

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.createCheckout).toHaveBeenCalledWith(identity, {
      ...requestInput,
      callbackUrl: "https://www.laitstyles.com/checkout",
    });
    await expect(response.json()).resolves.toEqual({ data: draft });
  });
});

describe("GET /api/v1/checkout/:checkoutId", () => {
  it("delegates ownership enforcement to the checkout domain", async () => {
    const response = await GET(
      new Request(`https://www.laitstyles.com/api/v1/checkout/${draft.checkoutId}`),
      { params: Promise.resolve({ checkoutId: draft.checkoutId }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getCheckout).toHaveBeenCalledWith(identity, draft.checkoutId);
  });
});

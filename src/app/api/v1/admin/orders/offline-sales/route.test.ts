import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  recordOfflineSale: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/orders/server/commands", () => ({
  recordOfflineSale: mocks.recordOfflineSale,
}));

import { POST } from "./route";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin" as const,
};
const productId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue(actor);
});

describe("POST /api/v1/admin/orders/offline-sales", () => {
  it("requires the sales:record capability before creating a draft", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
    );

    const response = await POST(offlineSaleRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" },
    });
    expect(mocks.recordOfflineSale).not.toHaveBeenCalled();
  });

  it("requires an email for a new customer before Paystack initialization", async () => {
    const response = await POST(
      offlineSaleRequest({
        customer: {
          kind: "new",
          name: "Walk-in customer",
          email: "",
          phone: "+2348000000000",
          city: "Lagos",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_BODY",
        fieldErrors: { customer: expect.any(String) },
      },
    });
    expect(mocks.recordOfflineSale).not.toHaveBeenCalled();
  });

  it("returns a stable unavailable response without creating an untracked payment", async () => {
    mocks.recordOfflineSale.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "paystack-not-configured",
        message: "Paystack checkout is not configured yet. No order or stock reservation was created.",
      },
    });

    const response = await POST(offlineSaleRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "PAYSTACK_NOT_CONFIGURED",
        message: expect.stringContaining("No order or stock reservation"),
      },
    });
  });

  it("returns the persisted pending order and recoverable one-time checkout", async () => {
    const outcome = {
      order: {
        id: "LS-TEST1234",
        databaseId: "33333333-3333-4333-8333-333333333333",
        customerId: "44444444-4444-4444-8444-444444444444",
        customer: null,
        channel: "physical-store",
        paymentStatus: "pending",
        paymentMethod: "paystack",
        fulfilmentStatus: "pending-payment",
        lines: [],
        total: 25_000,
        placedAt: "2026-07-25T10:00:00.000Z",
        deliveryCity: "Lagos",
      },
      customerId: "44444444-4444-4444-8444-444444444444",
      checkout: {
        authorizationUrl: "https://checkout.paystack.com/access123",
        accessCode: "access123",
        reference: "LS-INPERSON-reference",
      },
      message: "Paystack checkout generated for Walk-in customer.",
    };
    mocks.recordOfflineSale.mockResolvedValueOnce({ ok: true, value: outcome });

    const response = await POST(offlineSaleRequest());

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("sales:record");
    expect(mocks.recordOfflineSale).toHaveBeenCalledWith(actor, {
      lines: [{ productId, quantity: 1, unitPrice: 25_000 }],
      channel: "physical-store",
      customer: {
        kind: "new",
        name: "Walk-in customer",
        email: "customer@example.com",
        phone: "+2348000000000",
        city: "Lagos",
      },
      notes: "Customer is present at the store.",
    });
    await expect(response.json()).resolves.toEqual({ data: outcome });
  });
});

type OfflineSaleOverrides = {
  customer?: {
    kind: "new";
    name: string;
    email: string;
    phone: string;
    city: string;
  };
};

function offlineSaleRequest(overrides: OfflineSaleOverrides = {}) {
  return new Request("http://localhost/api/v1/admin/orders/offline-sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lines: [{ productId, quantity: 1, unitPrice: 25_000 }],
      channel: "physical-store",
      customer: overrides.customer ?? {
        kind: "new",
        name: "Walk-in customer",
        email: "customer@example.com",
        phone: "+2348000000000",
        city: "Lagos",
      },
      notes: "Customer is present at the store.",
    }),
  });
}

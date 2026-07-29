import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  requestOrderCancellation: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/orders/server/account-orders", () => ({
  requestOrderCancellation: mocks.requestOrderCancellation,
}));

import { POST } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};

function request(body: unknown = {}) {
  return new Request("http://localhost/api/v1/account/orders/LS-1/cancellation-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(orderNumber = "LS-1") {
  return { params: Promise.resolve({ orderNumber }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.requestOrderCancellation.mockResolvedValue({ orderNumber: "LS-1" });
});

describe("POST /api/v1/account/orders/[orderNumber]/cancellation-requests", () => {
  it("rejects a paid or fulfilled order with a conflict", async () => {
    mocks.requestOrderCancellation.mockRejectedValueOnce(
      new ApiError({
        code: "ORDER_NOT_CANCELLABLE",
        message: "This order can no longer be self-cancelled.",
        status: 409,
      }),
    );

    const response = await POST(request(), context());

    expect(response.status).toBe(409);
  });

  it("requests cancellation for the authenticated customer's order", async () => {
    const response = await POST(request({ reason: "Ordered by mistake" }), context());

    expect(response.status).toBe(201);
    expect(mocks.requestOrderCancellation).toHaveBeenCalledWith(identity, "LS-1", {
      reason: "Ordered by mistake",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  getAccountOrder: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/orders/server/account-orders", () => ({
  getAccountOrder: mocks.getAccountOrder,
}));

import { GET } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};

function context(orderNumber = "LS-1") {
  return { params: Promise.resolve({ orderNumber }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
});

describe("GET /api/v1/account/orders/[orderNumber]", () => {
  it("conceals an order not owned by the consumer", async () => {
    mocks.getAccountOrder.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/v1/account/orders/LS-1"),
      context("LS-1"),
    );

    expect(response.status).toBe(404);
  });

  it("returns the order scoped to the authenticated customer", async () => {
    mocks.getAccountOrder.mockResolvedValue({ orderNumber: "LS-1" });

    const response = await GET(
      new Request("http://localhost/api/v1/account/orders/LS-1"),
      context("LS-1"),
    );

    expect(response.status).toBe(200);
    expect(mocks.getAccountOrder).toHaveBeenCalledWith(identity.customerId, "LS-1");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  getAccountOrders: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/orders/server/account-orders", () => ({
  getAccountOrders: mocks.getAccountOrders,
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.getAccountOrders.mockResolvedValue([]);
});

describe("GET /api/v1/account/orders", () => {
  it("requires an authenticated consumer", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/account/orders"));

    expect(response.status).toBe(401);
    expect(mocks.getAccountOrders).not.toHaveBeenCalled();
  });

  it("lists orders scoped to the authenticated customer", async () => {
    const response = await GET(new Request("http://localhost/api/v1/account/orders"));

    expect(response.status).toBe(200);
    expect(mocks.getAccountOrders).toHaveBeenCalledWith(identity.customerId);
    await expect(response.json()).resolves.toEqual({ data: [] });
  });
});

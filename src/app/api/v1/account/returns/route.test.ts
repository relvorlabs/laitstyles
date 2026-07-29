import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  listAccountReturns: vi.fn(),
  createCustomerReturn: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/returns/server/account-returns", () => ({
  listAccountReturns: mocks.listAccountReturns,
  createCustomerReturn: mocks.createCustomerReturn,
}));

import { GET, POST } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};

const input = {
  orderNumber: "LS-1",
  reason: "Wrong fit",
  lines: [{ orderLineId: "44444444-4444-4444-8444-444444444444", quantity: 1 }],
};

function request(body: unknown) {
  return new Request("http://localhost/api/v1/account/returns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.listAccountReturns.mockResolvedValue([]);
  mocks.createCustomerReturn.mockResolvedValue({ id: "return-a" });
});

describe("GET /api/v1/account/returns", () => {
  it("requires an authenticated consumer", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/account/returns"));

    expect(response.status).toBe(401);
    expect(mocks.listAccountReturns).not.toHaveBeenCalled();
  });

  it("lists only the authenticated customer's returns", async () => {
    const response = await GET(new Request("http://localhost/api/v1/account/returns"));

    expect(response.status).toBe(200);
    expect(mocks.listAccountReturns).toHaveBeenCalledWith(identity.customerId);
  });
});

describe("POST /api/v1/account/returns", () => {
  it("rejects client-supplied ownership fields", async () => {
    const response = await POST(request({ ...input, customerId: "other" }));

    expect(response.status).toBe(422);
    expect(mocks.createCustomerReturn).not.toHaveBeenCalled();
  });

  it("creates a return through the authenticated customer command", async () => {
    const response = await POST(request(input));

    expect(response.status).toBe(201);
    expect(mocks.createCustomerReturn).toHaveBeenCalledWith(identity, input);
  });
});

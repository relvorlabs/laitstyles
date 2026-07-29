import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  getAccountReturn: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/returns/server/account-returns", () => ({
  getAccountReturn: mocks.getAccountReturn,
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

const returnId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
});

describe("GET /api/v1/account/returns/[returnId]", () => {
  it("conceals a return not owned by the customer", async () => {
    mocks.getAccountReturn.mockResolvedValue(null);

    const response = await GET(new Request(`http://localhost/api/v1/account/returns/${returnId}`), {
      params: Promise.resolve({ returnId }),
    });

    expect(response.status).toBe(404);
  });

  it("returns an owned return", async () => {
    mocks.getAccountReturn.mockResolvedValue({ id: returnId });

    const response = await GET(new Request(`http://localhost/api/v1/account/returns/${returnId}`), {
      params: Promise.resolve({ returnId }),
    });

    expect(response.status).toBe(200);
    expect(mocks.getAccountReturn).toHaveBeenCalledWith(identity.customerId, returnId);
  });
});

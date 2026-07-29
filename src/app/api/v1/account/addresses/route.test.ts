import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  listOwnedAddresses: vi.fn(),
  createOwnedAddress: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/customers/server/addresses", () => ({
  listOwnedAddresses: mocks.listOwnedAddresses,
  createOwnedAddress: mocks.createOwnedAddress,
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

const address = {
  id: "address-1",
  label: "Home",
  line1: "18 Example Road",
  line2: "",
  city: "Lagos",
  state: "Lagos",
  country: "Nigeria",
  isDefault: true,
  deliveryNotes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/account/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.listOwnedAddresses.mockResolvedValue([address]);
  mocks.createOwnedAddress.mockResolvedValue(address);
});

describe("GET /api/v1/account/addresses", () => {
  it("requires an authenticated consumer", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/account/addresses"));

    expect(response.status).toBe(401);
    expect(mocks.listOwnedAddresses).not.toHaveBeenCalled();
  });

  it("lists the authenticated customer's addresses", async () => {
    const response = await GET(new Request("http://localhost/api/v1/account/addresses"));

    expect(response.status).toBe(200);
    expect(mocks.listOwnedAddresses).toHaveBeenCalledWith(identity);
    await expect(response.json()).resolves.toEqual({ data: [address] });
  });
});

describe("POST /api/v1/account/addresses", () => {
  const validAddress = { line1: "18 Example Road", city: "Lagos" };

  it("does not accept customer_id from an address payload", async () => {
    const response = await POST(jsonRequest({ ...validAddress, customer_id: "other-customer" }));

    // The schema rejects unrecognized fields, so the address is never created
    // with a client-controlled owner — the domain command only ever receives
    // the authenticated identity's customerId.
    expect(response.status).toBe(422);
    expect(mocks.createOwnedAddress).not.toHaveBeenCalled();
  });

  it("creates an address for the authenticated customer", async () => {
    const response = await POST(jsonRequest(validAddress));

    expect(response.status).toBe(201);
    expect(mocks.createOwnedAddress).toHaveBeenCalledWith(identity, validAddress);
  });
});

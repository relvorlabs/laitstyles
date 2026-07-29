import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  updateOwnedAddress: vi.fn(),
  deleteOwnedAddress: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/customers/server/addresses", () => ({
  updateOwnedAddress: mocks.updateOwnedAddress,
  deleteOwnedAddress: mocks.deleteOwnedAddress,
}));

import { DELETE, PATCH } from "./route";

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

function jsonRequest(body: unknown, method = "PATCH") {
  return new Request("http://localhost/api/v1/account/addresses/address-1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(addressId = "address-1") {
  return { params: Promise.resolve({ addressId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.updateOwnedAddress.mockResolvedValue(address);
  mocks.deleteOwnedAddress.mockResolvedValue(undefined);
});

describe("PATCH /api/v1/account/addresses/[addressId]", () => {
  it("conceals another customer's address as not found", async () => {
    mocks.updateOwnedAddress.mockRejectedValueOnce(
      new ApiError({
        code: "ADDRESS_NOT_FOUND",
        message: "The selected address could not be found.",
        status: 404,
      }),
    );

    const response = await PATCH(jsonRequest({ city: "Abuja" }), context("other-address"));

    expect(response.status).toBe(404);
  });

  it("updates the addressed scoped to the authenticated customer", async () => {
    const response = await PATCH(jsonRequest({ city: "Abuja" }), context());

    expect(response.status).toBe(200);
    expect(mocks.updateOwnedAddress).toHaveBeenCalledWith(identity, "address-1", {
      city: "Abuja",
    });
  });
});

describe("DELETE /api/v1/account/addresses/[addressId]", () => {
  it("requires an authenticated consumer", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await DELETE(jsonRequest(undefined, "DELETE"), context());

    expect(response.status).toBe(401);
    expect(mocks.deleteOwnedAddress).not.toHaveBeenCalled();
  });

  it("deletes the address scoped to the authenticated customer", async () => {
    const response = await DELETE(jsonRequest(undefined, "DELETE"), context());

    expect(response.status).toBe(200);
    expect(mocks.deleteOwnedAddress).toHaveBeenCalledWith(identity, "address-1");
  });
});

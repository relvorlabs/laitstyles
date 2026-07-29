import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  getOwnedProfile: vi.fn(),
  updateOwnedProfile: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/customers/server/account-profile", () => ({
  getOwnedProfile: mocks.getOwnedProfile,
  updateOwnedProfile: mocks.updateOwnedProfile,
}));

import { GET, PATCH } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};

const profile = {
  authUserId: identity.authUserId,
  email: identity.email,
  firstName: "Ada",
  lastName: "Okafor",
  preferredName: "",
  phone: "",
};

function jsonRequest(body: unknown, method = "PATCH") {
  return new Request("http://localhost/api/v1/account/profile", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.getOwnedProfile.mockResolvedValue(profile);
  mocks.updateOwnedProfile.mockResolvedValue(profile);
});

describe("GET /api/v1/account/profile", () => {
  it("rejects an unauthenticated read", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/account/profile"));

    expect(response.status).toBe(401);
    expect(mocks.getOwnedProfile).not.toHaveBeenCalled();
  });

  it("returns the authenticated customer's profile", async () => {
    const response = await GET(new Request("http://localhost/api/v1/account/profile"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getOwnedProfile).toHaveBeenCalledWith(identity);
    await expect(response.json()).resolves.toEqual({ data: profile });
  });
});

describe("PATCH /api/v1/account/profile", () => {
  it("rejects an unauthenticated profile update", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await PATCH(jsonRequest({ firstName: "Ada", lastName: "Okafor" }));

    expect(response.status).toBe(401);
    expect(mocks.updateOwnedProfile).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload before calling the domain command", async () => {
    const response = await PATCH(jsonRequest({ firstName: "", lastName: "" }));

    expect(response.status).toBe(422);
    expect(mocks.updateOwnedProfile).not.toHaveBeenCalled();
  });

  it("updates the authenticated customer's profile", async () => {
    const response = await PATCH(
      jsonRequest({ firstName: "Ada", lastName: "Okafor", phone: "+2348010000000" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateOwnedProfile).toHaveBeenCalledWith(identity, {
      firstName: "Ada",
      lastName: "Okafor",
      phone: "+2348010000000",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  getCustomerPreferences: vi.fn(),
  updateCustomerPreferences: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/preferences/server/queries", () => ({
  getCustomerPreferences: mocks.getCustomerPreferences,
}));
vi.mock("@/modules/preferences/server/commands", () => ({
  updateCustomerPreferences: mocks.updateCustomerPreferences,
}));

import { GET, PATCH } from "./route";

const consumer = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "amara@example.com",
  displayName: "Amara",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
});

describe("GET /api/v1/account/preferences", () => {
  it("requires an authenticated customer session", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
    );

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.getCustomerPreferences).not.toHaveBeenCalled();
  });

  it("returns the authenticated customer's own preferences", async () => {
    mocks.getCustomerPreferences.mockResolvedValue({
      contactChannel: "email",
      sizingUnit: "metric",
      marketingOptIn: false,
      personalizationEnabled: true,
      updatedAt: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getCustomerPreferences).toHaveBeenCalledWith(consumer);
  });
});

describe("PATCH /api/v1/account/preferences", () => {
  it("rejects a malformed body", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactChannel: "carrier-pigeon" }),
      }),
    );

    expect(response.status).toBe(422);
    expect(mocks.updateCustomerPreferences).not.toHaveBeenCalled();
  });

  it("updates the authenticated customer's own preferences", async () => {
    mocks.updateCustomerPreferences.mockResolvedValue({
      contactChannel: "sms",
      sizingUnit: "metric",
      marketingOptIn: true,
      personalizationEnabled: true,
      updatedAt: "2026-07-29T00:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost/api/v1/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactChannel: "sms",
          sizingUnit: "metric",
          marketingOptIn: true,
          personalizationEnabled: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateCustomerPreferences).toHaveBeenCalledWith(consumer, {
      contactChannel: "sms",
      sizingUnit: "metric",
      marketingOptIn: true,
      personalizationEnabled: true,
    });
  });
});

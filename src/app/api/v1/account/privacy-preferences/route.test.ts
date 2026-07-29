import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  getPrivacyPreferences: vi.fn(),
  updatePrivacyPreferences: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/privacy/server/queries", () => ({
  getPrivacyPreferences: mocks.getPrivacyPreferences,
}));
vi.mock("@/modules/privacy/server/commands", () => ({
  updatePrivacyPreferences: mocks.updatePrivacyPreferences,
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

describe("GET /api/v1/account/privacy-preferences", () => {
  it("requires authentication", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
    );

    const response = await GET();

    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/v1/account/privacy-preferences", () => {
  it("rejects an empty body", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/account/privacy-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(422);
    expect(mocks.updatePrivacyPreferences).not.toHaveBeenCalled();
  });

  it("updates the authenticated customer's own consent state", async () => {
    mocks.updatePrivacyPreferences.mockResolvedValue({
      consents: {
        analytics: false,
        personalization: true,
        marketing_email: false,
        marketing_sms: false,
      },
      policyVersion: "2026-07-28.1",
      updatedAt: "2026-07-29T00:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost/api/v1/account/privacy-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics: false }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.updatePrivacyPreferences).toHaveBeenCalledWith(consumer, { analytics: false });
  });
});

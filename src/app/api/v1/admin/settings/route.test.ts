import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  getStoreSettings: vi.fn(),
  saveStoreSettings: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/settings/server/queries", () => ({
  getStoreSettings: mocks.getStoreSettings,
}));
vi.mock("@/modules/settings/server/commands", () => ({
  saveStoreSettings: mocks.saveStoreSettings,
}));

import { GET } from "./route";

const settings = {
  identity: {
    storeName: "Laitstyle",
    supportEmail: "support@example.com",
    supportPhone: "+2348000000000",
    instagramHandle: "@laitstyle",
  },
  selling: {
    currency: "NGN",
    holdDurationMinutes: 15,
    lowStockDefault: 2,
    allowGuestCheckout: true,
  },
  payments: {
    acceptedMethods: ["paystack"],
    refundPreference: "original-method",
  },
  notifications: {
    orderCreated: true,
    paymentFailed: true,
    lowStock: true,
    returnRequested: true,
  },
  delivery: { zones: [], pickupLocations: [] },
  updatedAt: "2026-07-25T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue({
    kind: "staff",
    authUserId: "11111111-1111-4111-8111-111111111111",
    role: "admin",
  });
  mocks.getStoreSettings.mockResolvedValue(settings);
});

describe("GET /api/v1/admin/settings", () => {
  it("requires settings:read before reading the persisted singleton", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
    );

    const response = await GET(new Request("http://localhost/api/v1/admin/settings"));

    expect(response.status).toBe(401);
    expect(mocks.getStoreSettings).not.toHaveBeenCalled();
  });

  it("returns the persisted settings projection without cacheable browser defaults", async () => {
    const response = await GET(new Request("http://localhost/api/v1/admin/settings"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("settings:read");
    expect(mocks.getStoreSettings).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ data: settings });
  });
});

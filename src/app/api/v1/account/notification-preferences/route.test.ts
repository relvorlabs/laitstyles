import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  listNotificationPreferences: vi.fn(),
  updateNotificationPreference: vi.fn(),
}));
vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/notifications/server/queries", () => ({
  listNotificationPreferences: mocks.listNotificationPreferences,
}));
vi.mock("@/modules/notifications/server/commands", () => ({
  updateNotificationPreference: mocks.updateNotificationPreference,
}));

import { GET, PATCH } from "./route";

const consumer = { kind: "consumer" as const, customerId: "customer-1" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
  mocks.listNotificationPreferences.mockResolvedValue([]);
});

describe("/api/v1/account/notification-preferences", () => {
  it("lists the authenticated customer's preferences", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.listNotificationPreferences).toHaveBeenCalledWith(consumer);
  });

  it("rejects malformed preference input", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/account/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "security", emailEnabled: "no" }),
      }),
    );
    expect(response.status).toBe(422);
    expect(mocks.updateNotificationPreference).not.toHaveBeenCalled();
  });
});

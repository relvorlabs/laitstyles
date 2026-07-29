import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  listNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/notifications/server/queries", () => ({
  listNotifications: mocks.listNotifications,
}));
vi.mock("@/modules/notifications/server/commands", () => ({
  markAllNotificationsRead: mocks.markAllNotificationsRead,
}));

import { GET, PATCH } from "./route";

const consumer = { kind: "consumer" as const, customerId: "customer-1" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
  mocks.listNotifications.mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 25, total: 0, pageCount: 0, unreadCount: 0 },
  });
  mocks.markAllNotificationsRead.mockResolvedValue({ count: 0 });
});

describe("/api/v1/account/notifications", () => {
  it("parses unreadOnly=false without filtering to unread records", async () => {
    const response = await GET(
      new Request("http://localhost/api/v1/account/notifications?unreadOnly=false"),
    );
    expect(response.status).toBe(200);
    expect(mocks.listNotifications).toHaveBeenCalledWith(consumer, {
      page: 1,
      pageSize: 25,
      unreadOnly: false,
    });
  });

  it("marks all of the authenticated customer's notifications read", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.markAllNotificationsRead).toHaveBeenCalledWith(consumer);
  });
});

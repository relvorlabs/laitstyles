import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/notifications/server/commands", () => ({
  markNotificationRead: mocks.markNotificationRead,
}));

import { PATCH } from "./route";

const consumer = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "amara@example.com",
  displayName: "Amara",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};
const notificationId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
});

describe("PATCH /api/v1/account/notifications/[notificationId]", () => {
  it("does not expose a notification owned by another customer", async () => {
    mocks.markNotificationRead.mockRejectedValue(
      new ApiError({
        code: "NOTIFICATION_NOT_FOUND",
        message: "The selected notification could not be found.",
        status: 404,
      }),
    );

    const response = await PATCH(
      new Request(`http://localhost/api/v1/account/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-request-id": "request-notification" },
        body: JSON.stringify({ read: true }),
      }),
      { params: Promise.resolve({ notificationId }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("x-request-id")).toBe("request-notification");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "NOTIFICATION_NOT_FOUND" },
    });
    expect(mocks.markNotificationRead).toHaveBeenCalledWith(consumer, notificationId);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notificationsUpdateMany: vi.fn(),
  notificationsFindUnique: vi.fn(),
  notificationsCreate: vi.fn(),
  preferencesUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, params: { code: string }) {
        super(message);
        this.code = params.code;
      }
    },
  },
  prisma: {
    notifications: {
      updateMany: mocks.notificationsUpdateMany,
      findUnique: mocks.notificationsFindUnique,
      create: mocks.notificationsCreate,
    },
    notification_preferences: {
      upsert: mocks.preferencesUpsert,
    },
  },
}));

import {
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
} from "@/modules/notifications/server/commands";
import { projectNotification } from "@/modules/notifications/server/projectors";
import { NotificationPolicyError } from "@/modules/notifications/types";

const identity = { customerId: "11111111-1111-4111-8111-111111111111" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("markNotificationRead", () => {
  it("marks only the authenticated customer's notification", async () => {
    mocks.notificationsUpdateMany.mockResolvedValue({ count: 1 });

    await markNotificationRead(identity, "notification-1");

    expect(mocks.notificationsUpdateMany).toHaveBeenCalledWith({
      where: { id: "notification-1", customer_id: identity.customerId, read_at: null },
      data: { read_at: expect.any(Date) },
    });
  });

  it("rejects a notification owned by another customer", async () => {
    mocks.notificationsUpdateMany.mockResolvedValue({ count: 0 });
    mocks.notificationsFindUnique.mockResolvedValue({ customer_id: "someone-else" });

    await expect(markNotificationRead(identity, "notification-1")).rejects.toMatchObject({
      code: "NOTIFICATION_NOT_FOUND",
    });
  });

  it("no-ops when the notification is already read", async () => {
    mocks.notificationsUpdateMany.mockResolvedValue({ count: 0 });
    mocks.notificationsFindUnique.mockResolvedValue({ customer_id: identity.customerId });

    await expect(markNotificationRead(identity, "notification-1")).resolves.toBeUndefined();
  });
});

describe("markAllNotificationsRead", () => {
  it("marks every unread notification owned by the customer", async () => {
    mocks.notificationsUpdateMany.mockResolvedValue({ count: 3 });

    const result = await markAllNotificationsRead(identity);

    expect(mocks.notificationsUpdateMany).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId, read_at: null },
      data: { read_at: expect.any(Date) },
    });
    expect(result).toEqual({ count: 3 });
  });
});

describe("updateNotificationPreference", () => {
  it("rejects disabling email for a required category", async () => {
    await expect(
      updateNotificationPreference(identity, {
        category: "security",
        emailEnabled: false,
        smsEnabled: false,
        pushEnabled: false,
      }),
    ).rejects.toBeInstanceOf(NotificationPolicyError);
    expect(mocks.preferencesUpsert).not.toHaveBeenCalled();
  });

  it("allows disabling sms/push for a required category as long as email stays on", async () => {
    mocks.preferencesUpsert.mockResolvedValue({
      category: "order_updates",
      email_enabled: true,
      sms_enabled: false,
      push_enabled: false,
    });

    const result = await updateNotificationPreference(identity, {
      category: "order_updates",
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: false,
    });

    expect(result).toEqual({
      category: "order_updates",
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: false,
    });
  });

  it("allows freely toggling a non-required category", async () => {
    mocks.preferencesUpsert.mockResolvedValue({
      category: "promotions",
      email_enabled: false,
      sms_enabled: false,
      push_enabled: false,
    });

    await updateNotificationPreference(identity, {
      category: "promotions",
      emailEnabled: false,
      smsEnabled: false,
      pushEnabled: false,
    });

    expect(mocks.preferencesUpsert).toHaveBeenCalledWith({
      where: {
        customer_id_category: {
          customer_id: identity.customerId,
          category: "promotions",
        },
      },
      create: {
        customer_id: identity.customerId,
        category: "promotions",
        email_enabled: false,
        sms_enabled: false,
        push_enabled: false,
      },
      update: {
        email_enabled: false,
        sms_enabled: false,
        push_enabled: false,
      },
    });
  });
});

describe("projectNotification", () => {
  const event = {
    customerId: identity.customerId,
    category: "order_updates" as const,
    title: "Your order has shipped",
    eventKey: "order-shipped:order-1",
  };

  it("deduplicates the same outbox event", async () => {
    mocks.notificationsFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "notification-1" });
    mocks.notificationsCreate.mockResolvedValueOnce({ id: "notification-1" });

    await projectNotification(event);
    await projectNotification(event);

    expect(mocks.notificationsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.notificationsCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customer_id: identity.customerId,
        category: "order_updates",
        title: "Your order has shipped",
        event_key: "order-shipped:order-1",
      }),
    });
  });

  it("swallows a unique-constraint race from a concurrent projector", async () => {
    mocks.notificationsFindUnique.mockResolvedValueOnce(null);
    const { Prisma } = await import("@/lib/prisma");
    mocks.notificationsCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(projectNotification(event)).resolves.toBeUndefined();
  });
});

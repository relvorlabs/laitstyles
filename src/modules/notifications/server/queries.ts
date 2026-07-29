import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  CustomerIdentity,
  NotificationCategory,
  NotificationListInput,
  NotificationListResult,
  NotificationPreference,
  StoredNotification,
} from "@/modules/notifications/types";

const ALL_CATEGORIES: readonly NotificationCategory[] = [
  "order_updates",
  "promotions",
  "support",
  "security",
];

/** Matches the Prisma column defaults on `notification_preferences` so a
 * category without a persisted row still reads a deterministic default. */
const DEFAULT_PREFERENCE_BY_CATEGORY: Record<
  NotificationCategory,
  Omit<NotificationPreference, "category">
> = {
  order_updates: { emailEnabled: true, smsEnabled: false, pushEnabled: true },
  promotions: { emailEnabled: true, smsEnabled: false, pushEnabled: true },
  support: { emailEnabled: true, smsEnabled: false, pushEnabled: true },
  security: { emailEnabled: true, smsEnabled: false, pushEnabled: true },
};

export async function listNotificationPreferences(
  identity: CustomerIdentity,
): Promise<NotificationPreference[]> {
  const rows = await prisma.notification_preferences.findMany({
    where: { customer_id: identity.customerId },
  });
  const byCategory = new Map(rows.map((row) => [row.category, row]));

  return ALL_CATEGORIES.map((category) => {
    const row = byCategory.get(category);
    return row
      ? {
          category,
          emailEnabled: row.email_enabled,
          smsEnabled: row.sms_enabled,
          pushEnabled: row.push_enabled,
        }
      : { category, ...DEFAULT_PREFERENCE_BY_CATEGORY[category] };
  });
}

export async function listNotifications(
  identity: CustomerIdentity,
  input: NotificationListInput,
): Promise<NotificationListResult> {
  const where = {
    customer_id: identity.customerId,
    ...(input.unreadOnly ? { read_at: null } : {}),
  };

  const [rows, total, unreadCount] = await Promise.all([
    prisma.notifications.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.notifications.count({ where }),
    prisma.notifications.count({ where: { customer_id: identity.customerId, read_at: null } }),
  ]);

  const data: StoredNotification[] = rows.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown>) ?? {},
    readAt: row.read_at ? row.read_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  }));

  return {
    data,
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: total === 0 ? 0 : Math.ceil(total / input.pageSize),
      unreadCount,
    },
  };
}

export async function getUnreadNotificationCount(identity: CustomerIdentity): Promise<number> {
  return prisma.notifications.count({
    where: { customer_id: identity.customerId, read_at: null },
  });
}

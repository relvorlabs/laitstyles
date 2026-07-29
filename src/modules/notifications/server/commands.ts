import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";
import { assertMutableNotificationPreference } from "@/modules/notifications/server/policy";
import type {
  CustomerIdentity,
  NotificationPreference,
  UpdateNotificationPreferenceInput,
} from "@/modules/notifications/types";

export async function updateNotificationPreference(
  identity: CustomerIdentity,
  input: UpdateNotificationPreferenceInput,
): Promise<NotificationPreference> {
  assertMutableNotificationPreference(input);

  const data = {
    email_enabled: input.emailEnabled,
    sms_enabled: input.smsEnabled,
    push_enabled: input.pushEnabled,
  };

  const row = await prisma.notification_preferences.upsert({
    where: {
      customer_id_category: {
        customer_id: identity.customerId,
        category: input.category,
      },
    },
    create: { customer_id: identity.customerId, category: input.category, ...data },
    update: data,
  });

  return {
    category: row.category,
    emailEnabled: row.email_enabled,
    smsEnabled: row.sms_enabled,
    pushEnabled: row.push_enabled,
  };
}

export async function markNotificationRead(
  identity: CustomerIdentity,
  notificationId: string,
): Promise<void> {
  const result = await prisma.notifications.updateMany({
    where: { id: notificationId, customer_id: identity.customerId, read_at: null },
    data: { read_at: new Date() },
  });

  if (result.count === 0) {
    const exists = await prisma.notifications.findUnique({
      where: { id: notificationId },
      select: { customer_id: true },
    });
    if (!exists || exists.customer_id !== identity.customerId) {
      throw new ApiError({
        code: "NOTIFICATION_NOT_FOUND",
        message: "The selected notification could not be found.",
        status: 404,
      });
    }
    // Already read: idempotent no-op.
  }
}

export async function markAllNotificationsRead(
  identity: CustomerIdentity,
): Promise<{ count: number }> {
  const result = await prisma.notifications.updateMany({
    where: { customer_id: identity.customerId, read_at: null },
    data: { read_at: new Date() },
  });
  return { count: result.count };
}

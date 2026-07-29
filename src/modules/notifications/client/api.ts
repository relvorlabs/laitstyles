import { apiRequest } from "@/lib/http/client";
import type {
  NotificationListInput,
  NotificationListResult,
  NotificationPreference,
  UpdateNotificationPreferenceInput,
} from "@/modules/notifications/types";

const NOTIFICATIONS_URL = "/api/v1/account/notifications";
const NOTIFICATION_PREFERENCES_URL = "/api/v1/account/notification-preferences";

export async function listNotificationsRequest(
  input: NotificationListInput,
  signal?: AbortSignal,
): Promise<NotificationListResult> {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    unreadOnly: String(input.unreadOnly),
  });
  const response = await apiRequest<NotificationListResult["data"], NotificationListResult["meta"]>(
    `${NOTIFICATIONS_URL}?${params.toString()}`,
    { cache: "no-store", signal },
  );
  return {
    data: response.data,
    meta: response.meta ?? { page: 1, pageSize: 25, total: 0, pageCount: 0, unreadCount: 0 },
  };
}

export async function markNotificationReadRequest(notificationId: string): Promise<void> {
  await apiRequest(`${NOTIFICATIONS_URL}/${encodeURIComponent(notificationId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
}

export async function markAllNotificationsReadRequest(): Promise<void> {
  await apiRequest(NOTIFICATIONS_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markAllRead: true }),
  });
}

export async function listNotificationPreferencesRequest(
  signal?: AbortSignal,
): Promise<NotificationPreference[]> {
  const response = await apiRequest<NotificationPreference[]>(NOTIFICATION_PREFERENCES_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function updateNotificationPreferenceRequest(
  input: UpdateNotificationPreferenceInput,
): Promise<NotificationPreference> {
  const response = await apiRequest<NotificationPreference>(NOTIFICATION_PREFERENCES_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

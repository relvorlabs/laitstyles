import type { NotificationListInput } from "@/modules/notifications/types";

export const notificationKeys = {
  all: ["account", "notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (input: NotificationListInput) => [...notificationKeys.lists(), input] as const,
  preferences: () => ["account", "notification-preferences"] as const,
};

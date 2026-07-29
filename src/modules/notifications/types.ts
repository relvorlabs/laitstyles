import { ApiError } from "@/lib/errors/api-error";
import type { ApiPaginationMeta } from "@/lib/http/contracts";

export type NotificationCategory = "order_updates" | "promotions" | "support" | "security";

/** Categories a customer cannot fully silence — order/delivery updates and
 * security alerts are operationally required, matching the disabled-checkbox
 * behaviour the legacy preferences UI already showed the customer. */
export const REQUIRED_NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  "order_updates",
  "security",
];

export type NotificationPreference = {
  category: NotificationCategory;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
};

export type UpdateNotificationPreferenceInput = {
  category: NotificationCategory;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
};

export type StoredNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListInput = {
  page: number;
  pageSize: number;
  unreadOnly: boolean;
};

export type NotificationListResult = {
  data: StoredNotification[];
  meta: ApiPaginationMeta & { unreadCount: number };
};

export type CustomerIdentity = { customerId: string };

export type NotificationEvent = {
  customerId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  /** De-duplicates repeated outbox projection attempts for the same event. */
  eventKey: string;
};

export class NotificationPolicyError extends ApiError {
  constructor(category: NotificationCategory) {
    super({
      code: "NOTIFICATION_CATEGORY_REQUIRED",
      message: `The "${category}" notification category cannot be fully disabled.`,
      status: 409,
    });
    this.name = "NotificationPolicyError";
  }
}

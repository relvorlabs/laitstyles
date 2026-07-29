import "server-only";

import {
  NotificationPolicyError,
  REQUIRED_NOTIFICATION_CATEGORIES,
  type UpdateNotificationPreferenceInput,
} from "@/modules/notifications/types";

/** Required transactional/security categories cannot be fully silenced from
 * stored preferences: email delivery must remain on even if the customer
 * turns off SMS/push for that category. */
export function assertMutableNotificationPreference(
  input: UpdateNotificationPreferenceInput,
): void {
  if (REQUIRED_NOTIFICATION_CATEGORIES.includes(input.category) && !input.emailEnabled) {
    throw new NotificationPolicyError(input.category);
  }
}

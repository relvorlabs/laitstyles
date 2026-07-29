import { z } from "zod";
import { paginationQuerySchema } from "@/lib/http/pagination";

export const notificationCategorySchema = z.enum([
  "order_updates",
  "promotions",
  "support",
  "security",
]);

export const notificationIdentifierSchema = z.string().trim().uuid();

export const notificationListSearchSchema = paginationQuerySchema.extend({
  unreadOnly: z.coerce.boolean().default(false),
});

export const updateNotificationPreferenceSchema = z
  .object({
    category: notificationCategorySchema,
    emailEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    pushEnabled: z.boolean(),
  })
  .strict();

export const markNotificationReadSchema = z
  .object({
    read: z.literal(true),
  })
  .strict();

export const markAllNotificationsReadSchema = z
  .object({
    markAllRead: z.literal(true),
  })
  .strict();

import { z } from "zod";

const optionalEmailSchema = z.union([
  z.literal(""),
  z.string().trim().email("Enter a valid contact email."),
]);

const optionalPhoneSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{7,24}$/, "Enter a valid phone number."),
]);

const optionalUrlSchema = z.union([
  z.literal(""),
  z.string().trim().url("Enter a complete website address."),
]);

export const storeBrandLogoSchema = z.object({
  publicId: z.string().trim().min(1),
  url: z.string().trim().min(1),
  width: z.number().nullable(),
  height: z.number().nullable(),
  format: z.string().nullable(),
  bytes: z.number().nullable(),
});

export const storeIdentitySettingsSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(2, "Enter a store name with at least 2 characters.")
    .max(60, "Keep the store name within 60 characters."),
  description: z
    .string()
    .trim()
    .min(20, "Describe the store in at least 20 characters.")
    .max(320, "Keep the store description within 320 characters."),
  contactEmail: optionalEmailSchema,
  contactPhone: optionalPhoneSchema,
  whatsappNumber: optionalPhoneSchema,
  instagramHandle: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^@[A-Za-z0-9._]{1,30}$/, "Use an Instagram handle beginning with @."),
  ]),
  websiteUrl: optionalUrlSchema,
  logo: storeBrandLogoSchema.nullable(),
});

export const sellingPreferencesSettingsSchema = z.object({
  currency: z.literal("NGN"),
  holdDurationMinutes: z.coerce
    .number()
    .int("Hold duration must be a whole number of minutes.")
    .min(5, "Hold duration must be at least 5 minutes.")
    .max(1440, "Hold duration cannot exceed 24 hours."),
  lowStockThreshold: z.coerce
    .number()
    .int("Low-stock threshold must be a whole number.")
    .min(0, "Low-stock threshold cannot be negative.")
    .max(10000, "Low-stock threshold is too large for this store."),
  defaultProductMode: z.enum(["unique", "stocked", "variant"]),
  payOnDeliveryEnabled: z.boolean(),
});

const deliveryZoneSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z
      .string()
      .trim()
      .min(2, "Enter a delivery-zone name.")
      .max(80, "Keep the delivery-zone name within 80 characters."),
    rate: z.coerce
      .number()
      .min(0, "Delivery rate cannot be negative.")
      .max(1000000, "Delivery rate is too large."),
    estimatedMinDays: z.coerce
      .number()
      .int("Estimated days must be whole numbers.")
      .min(1, "Minimum delivery time must be at least 1 day.")
      .max(60, "Minimum delivery time cannot exceed 60 days."),
    estimatedMaxDays: z.coerce
      .number()
      .int("Estimated days must be whole numbers.")
      .min(1, "Maximum delivery time must be at least 1 day.")
      .max(60, "Maximum delivery time cannot exceed 60 days."),
    enabled: z.boolean(),
  })
  .superRefine((zone, context) => {
    if (zone.estimatedMaxDays < zone.estimatedMinDays) {
      context.addIssue({
        code: "custom",
        path: ["estimatedMaxDays"],
        message: "Maximum delivery time must be the same as or later than the minimum.",
      });
    }
  });

const pickupLocationSchema = z.object({
  id: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(2, "Enter a pickup-location name.")
    .max(80, "Keep the pickup-location name within 80 characters."),
  address: z
    .string()
    .trim()
    .min(5, "Enter a useful pickup address.")
    .max(180, "Keep the pickup address within 180 characters."),
  city: z.string().trim().min(2, "Enter the pickup city."),
  instructions: z.string().trim().max(240, "Keep pickup instructions within 240 characters."),
  enabled: z.boolean(),
});

export const deliverySettingsSchema = z
  .object({
    zones: z.array(deliveryZoneSchema).max(20),
    pickupLocations: z.array(pickupLocationSchema).max(10),
  })
  .superRefine((delivery, context) => {
    const enabledDeliveryExists =
      delivery.zones.some((zone) => zone.enabled) ||
      delivery.pickupLocations.some((location) => location.enabled);
    if (!enabledDeliveryExists) {
      context.addIssue({
        code: "custom",
        path: ["zones"],
        message: "Keep at least one delivery zone or pickup location available.",
      });
    }
  });

export const paymentSettingsSchema = z.object({
  acceptedMethods: z
    .array(z.enum(["bank-transfer", "card", "cash", "pos", "pay-on-delivery"]))
    .min(1, "Keep at least one payment method available."),
  bankTransferInstructions: z
    .string()
    .trim()
    .max(500, "Keep bank-transfer instructions within 500 characters."),
  payOnDeliveryDepositPercent: z.coerce
    .number()
    .min(0, "Deposit percentage cannot be negative.")
    .max(100, "Deposit percentage cannot exceed 100%."),
  refundPreference: z.enum(["original-method", "bank-transfer", "store-credit"]),
});

export const notificationSettingsSchema = z.object({
  newOrders: z.boolean(),
  expiringHolds: z.boolean(),
  lowStock: z.boolean(),
  paymentIssues: z.boolean(),
  deliveryExceptions: z.boolean(),
});

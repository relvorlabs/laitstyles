import { z } from "zod";
import {
  deliverySettingsSchema,
  notificationSettingsSchema,
  paymentSettingsSchema,
  sellingPreferencesSettingsSchema,
  storeIdentitySettingsSchema,
  teamSettingsSchema,
} from "@/lib/control-room/settings-section-schemas";
import type {
  SaveStoreSettingsInput,
  SettingsSection,
  SettingsValidationIssue,
} from "@/lib/control-room/settings-types";

export {
  deliverySettingsSchema,
  notificationSettingsSchema,
  paymentSettingsSchema,
  sellingPreferencesSettingsSchema,
  storeIdentitySettingsSchema,
  teamSettingsSchema,
} from "@/lib/control-room/settings-section-schemas";

export const storeSettingsInputSchema = z
  .object({
    identity: storeIdentitySettingsSchema,
    selling: sellingPreferencesSettingsSchema,
    delivery: deliverySettingsSchema,
    payments: paymentSettingsSchema,
    notifications: notificationSettingsSchema,
    team: teamSettingsSchema,
  })
  .superRefine((settings, context) => {
    const payOnDeliveryAccepted = settings.payments.acceptedMethods.includes("pay-on-delivery");
    if (settings.selling.payOnDeliveryEnabled !== payOnDeliveryAccepted) {
      context.addIssue({
        code: "custom",
        path: ["payments", "acceptedMethods"],
        message:
          "Pay on delivery must be enabled in both selling preferences and accepted payment methods.",
      });
    }
  });

const settingsSectionSchemas = {
  identity: storeIdentitySettingsSchema,
  selling: sellingPreferencesSettingsSchema,
  delivery: deliverySettingsSchema,
  payments: paymentSettingsSchema,
  notifications: notificationSettingsSchema,
  team: teamSettingsSchema,
} as const;

export function parseStoreSettingsInput(
  value: unknown,
): { ok: true; value: SaveStoreSettingsInput } | { ok: false; issues: SettingsValidationIssue[] } {
  const result = storeSettingsInputSchema.safeParse(value);
  if (result.success) return { ok: true, value: result.data };

  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      section: getSettingsSection(issue.path[0]),
    })),
  };
}

export function validateSettingsSection(
  input: SaveStoreSettingsInput,
  section: SettingsSection,
): SettingsValidationIssue[] {
  const result = settingsSectionSchemas[section].safeParse(input[section]);
  if (result.success) return [];

  return result.error.issues.map((issue) => ({
    path: [section, ...issue.path].join("."),
    message: issue.message,
    section,
  }));
}

function getSettingsSection(value: PropertyKey | undefined): SettingsSection {
  if (
    value === "identity" ||
    value === "selling" ||
    value === "delivery" ||
    value === "payments" ||
    value === "notifications" ||
    value === "team"
  ) {
    return value;
  }
  return "identity";
}

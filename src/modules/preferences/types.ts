export type ContactChannel = "email" | "sms" | "whatsapp" | "none";
export type SizingUnit = "metric" | "imperial";

export type CustomerPreferences = {
  contactChannel: ContactChannel;
  sizingUnit: SizingUnit;
  marketingOptIn: boolean;
  personalizationEnabled: boolean;
  updatedAt: string | null;
};

/** Deterministic application-level defaults for a customer without a
 * persisted preferences row. Mirrors the Prisma column defaults on
 * `customer_preferences` so a fresh read and a fresh write agree. */
export const DEFAULT_CUSTOMER_PREFERENCES: CustomerPreferences = {
  contactChannel: "email",
  sizingUnit: "metric",
  marketingOptIn: false,
  personalizationEnabled: true,
  updatedAt: null,
};

export type UpdateCustomerPreferencesInput = {
  contactChannel: ContactChannel;
  sizingUnit: SizingUnit;
  marketingOptIn: boolean;
  personalizationEnabled: boolean;
};

export type CustomerIdentity = { customerId: string };

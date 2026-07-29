import "server-only";

import type { CustomerPreferences } from "@/modules/preferences/types";
import { DEFAULT_CUSTOMER_PREFERENCES } from "@/modules/preferences/types";

type PreferencesRow = {
  contact_channel: CustomerPreferences["contactChannel"];
  sizing_unit: CustomerPreferences["sizingUnit"];
  marketing_opt_in: boolean;
  personalization_enabled: boolean;
  updated_at: Date;
} | null;

/** A customer without a persisted row reads the deterministic application
 * defaults rather than a database NULL. Once any field is written, the row
 * (and its real `updated_at`) becomes authoritative. */
export function applyPreferenceDefaults(row: PreferencesRow): CustomerPreferences {
  if (!row) return DEFAULT_CUSTOMER_PREFERENCES;

  return {
    contactChannel: row.contact_channel,
    sizingUnit: row.sizing_unit,
    marketingOptIn: row.marketing_opt_in,
    personalizationEnabled: row.personalization_enabled,
    updatedAt: row.updated_at.toISOString(),
  };
}

import "server-only";

import {
  DEFAULT_PRIVACY_CONSENTS,
  type PrivacyConsentKey,
  type PrivacyConsentState,
  type UpdatePrivacyPreferencesInput,
} from "@/modules/privacy/types";

/** Bumped whenever the retention/consent policy text changes. Every consent
 * row is stamped with the version in force when it was recorded, so consent
 * history stays auditable even after future policy revisions. */
export const CURRENT_PRIVACY_POLICY_VERSION = "2026-07-28.1";

type ConsentHistoryRow = {
  consent_key: PrivacyConsentKey;
  granted: boolean;
  effective_at: Date;
};

/** Reduces the append-only consent history to the current effective state:
 * the most recent row per key, defaulting keys with no history. */
export function latestConsentState(rows: ConsentHistoryRow[]): PrivacyConsentState {
  const state = { ...DEFAULT_PRIVACY_CONSENTS };
  const seen = new Set<PrivacyConsentKey>();

  for (const row of [...rows].sort((a, b) => b.effective_at.getTime() - a.effective_at.getTime())) {
    if (seen.has(row.consent_key)) continue;
    seen.add(row.consent_key);
    state[row.consent_key] = row.granted;
  }

  return state;
}

/** Only values that actually change the customer's current effective state
 * are written — the domain rule an append-only history depends on to stay
 * meaningful (Task 1: "appends consent history only when the value changes"). */
export function consentChanges(
  current: PrivacyConsentState,
  input: UpdatePrivacyPreferencesInput,
): Array<{ consentKey: PrivacyConsentKey; granted: boolean }> {
  return (Object.entries(input) as Array<[PrivacyConsentKey, boolean | undefined]>)
    .filter((entry): entry is [PrivacyConsentKey, boolean] => entry[1] !== undefined)
    .filter(([key, granted]) => current[key] !== granted)
    .map(([consentKey, granted]) => ({ consentKey, granted }));
}

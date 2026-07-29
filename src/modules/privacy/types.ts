export type PrivacyConsentKey =
  | "analytics"
  | "personalization"
  | "marketing_email"
  | "marketing_sms";

export type PrivacyConsentState = Record<PrivacyConsentKey, boolean>;

export type PrivacyConsentHistoryEntry = {
  consentKey: PrivacyConsentKey;
  granted: boolean;
  policyVersion: string;
  effectiveAt: string;
};

export type PrivacyPreferences = {
  consents: PrivacyConsentState;
  policyVersion: string;
  updatedAt: string | null;
};

/** Deterministic defaults applied when a customer has no consent history for
 * a given key yet. `personalization` defaults on (it drives basic on-site
 * merchandising), everything else defaults off until the customer opts in. */
export const DEFAULT_PRIVACY_CONSENTS: PrivacyConsentState = {
  analytics: false,
  personalization: true,
  marketing_email: false,
  marketing_sms: false,
};

export type UpdatePrivacyPreferencesInput = Partial<PrivacyConsentState>;

export type CustomerIdentity = { customerId: string };

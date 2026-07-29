import { apiRequest } from "@/lib/http/client";
import type { PrivacyPreferences, UpdatePrivacyPreferencesInput } from "@/modules/privacy/types";

const PRIVACY_PREFERENCES_URL = "/api/v1/account/privacy-preferences";

export async function getPrivacyPreferencesRequest(
  signal?: AbortSignal,
): Promise<PrivacyPreferences> {
  const response = await apiRequest<PrivacyPreferences>(PRIVACY_PREFERENCES_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function updatePrivacyPreferencesRequest(
  input: UpdatePrivacyPreferencesInput,
): Promise<PrivacyPreferences> {
  const response = await apiRequest<PrivacyPreferences>(PRIVACY_PREFERENCES_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

import { apiRequest } from "@/lib/http/client";
import type {
  CustomerPreferences,
  UpdateCustomerPreferencesInput,
} from "@/modules/preferences/types";

const PREFERENCES_URL = "/api/v1/account/preferences";

export async function getCustomerPreferencesRequest(
  signal?: AbortSignal,
): Promise<CustomerPreferences> {
  const response = await apiRequest<CustomerPreferences>(PREFERENCES_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function updateCustomerPreferencesRequest(
  input: UpdateCustomerPreferencesInput,
): Promise<CustomerPreferences> {
  const response = await apiRequest<CustomerPreferences>(PREFERENCES_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

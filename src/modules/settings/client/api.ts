import { err, ok, type Result } from "@/lib/errors";
import { apiRequest, ApiClientError } from "@/lib/http/client";
import type {
  SaveStoreSettingsInput,
  SettingsSection,
  SettingsValidationIssue,
  StoreSettings,
  StoreSettingsActionError,
  StoreSettingsActionSuccess,
} from "@/modules/settings/types";

const SETTINGS_URL = "/api/v1/admin/settings";

export async function getStoreSettingsRequest(signal?: AbortSignal) {
  const response = await apiRequest<StoreSettings>(SETTINGS_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function saveStoreSettingsRequest(
  input: SaveStoreSettingsInput,
): Promise<Result<StoreSettingsActionSuccess, StoreSettingsActionError>> {
  try {
    const response = await apiRequest<StoreSettingsActionSuccess>(SETTINGS_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return err({
        code: error.code === "SETTINGS_NOT_AVAILABLE" ? "settings-not-available" : "invalid-settings",
        message: error.message,
        issues: toSettingsIssues(error.fieldErrors),
      });
    }
    throw error;
  }
}

function toSettingsIssues(fieldErrors: Record<string, string> | undefined): SettingsValidationIssue[] {
  return Object.entries(fieldErrors ?? {}).map(([path, message]) => ({
    path,
    message,
    section: settingsSection(path.split(".")[0]),
  }));
}

function settingsSection(value: string | undefined): SettingsSection {
  if (
    value === "identity" ||
    value === "selling" ||
    value === "delivery" ||
    value === "payments" ||
    value === "notifications"
  ) {
    return value;
  }
  return "identity";
}

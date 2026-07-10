import type { FieldErrors, FieldPath } from "react-hook-form";
import type {
  SaveStoreSettingsInput,
  SettingsSection,
} from "@/lib/control-room/types";

export function getSettingsFieldError(
  errors: FieldErrors<SaveStoreSettingsInput>,
  name: FieldPath<SaveStoreSettingsInput> | string,
) {
  let current: unknown = errors;
  for (const segment of name.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  if (
    current &&
    typeof current === "object" &&
    "message" in current &&
    typeof current.message === "string"
  ) {
    return current.message;
  }

  return undefined;
}

export function countSettingsSectionErrors(
  errors: FieldErrors<SaveStoreSettingsInput>,
  section: SettingsSection,
) {
  return countMessages(errors[section]);
}

export function getFirstSettingsErrorSection(
  errors: FieldErrors<SaveStoreSettingsInput>,
): SettingsSection | null {
  const sections: SettingsSection[] = [
    "identity",
    "selling",
    "delivery",
    "payments",
    "notifications",
    "team",
  ];
  return sections.find((section) => countSettingsSectionErrors(errors, section) > 0) ?? null;
}

function countMessages(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  if (
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return 1;
  }
  return Object.values(value).reduce(
    (total, item) => total + countMessages(item),
    0,
  );
}

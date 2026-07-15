import type { FieldErrors, FieldPath } from "react-hook-form";
import type { SaveStoreSettingsInput, SettingsSection } from "@/lib/admin/types";

export function getSettingsFieldError(
  errors: FieldErrors<SaveStoreSettingsInput>,
  name: FieldPath<SaveStoreSettingsInput> | string,
) {
  let current: unknown = errors;
  for (const segment of name.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return findDirectMessage(current) ?? findDirectMessage(getRootError(current));
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

function findDirectMessage(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return undefined;
}

function getRootError(value: unknown) {
  if (value && typeof value === "object" && "root" in value) {
    return value.root;
  }
  return undefined;
}

function countMessages(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  if (findDirectMessage(value)) return 1;
  return Object.values(value).reduce((total, item) => total + countMessages(item), 0);
}

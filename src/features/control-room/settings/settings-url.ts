import type { SettingsSection } from "@/lib/control-room/types";

export function buildSettingsHref(
  pathname: string,
  section: SettingsSection,
) {
  return section === "identity"
    ? pathname
    : `${pathname}?section=${encodeURIComponent(section)}`;
}

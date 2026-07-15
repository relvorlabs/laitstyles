import type { SettingsSection } from "@/lib/admin/types";

export function buildSettingsHref(pathname: string, section: SettingsSection) {
  return section === "identity" ? pathname : `${pathname}?section=${encodeURIComponent(section)}`;
}

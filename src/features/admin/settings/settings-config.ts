import type { SettingsSection } from "@/lib/admin/types";

export type SettingsSectionDefinition = {
  value: SettingsSection;
  label: string;
  shortLabel: string;
  description: string;
  outcome: string;
};

export const settingsSections: readonly SettingsSectionDefinition[] = [
  {
    value: "identity",
    label: "Store identity",
    shortLabel: "Identity",
    description: "Name, story and customer contact details.",
    outcome: "How customers recognise and reach the store.",
  },
  {
    value: "selling",
    label: "Selling preferences",
    shortLabel: "Selling",
    description: "Defaults for holds, stock and product setup.",
    outcome: "How everyday selling decisions behave by default.",
  },
  {
    value: "delivery",
    label: "Delivery",
    shortLabel: "Delivery",
    description: "Zones, pickup points, rates and timing.",
    outcome: "What customers can choose at checkout.",
  },
  {
    value: "payments",
    label: "Payments",
    shortLabel: "Payments",
    description: "Accepted methods, instructions and refunds.",
    outcome: "How customers pay and receive approved refunds.",
  },
  {
    value: "notifications",
    label: "Notifications",
    shortLabel: "Alerts",
    description: "The operating events that need attention.",
    outcome: "Which store changes should be surfaced promptly.",
  },
  {
    value: "team",
    label: "Team",
    shortLabel: "Team",
    description: "People, roles and responsibility boundaries.",
    outcome: "Who is expected to handle each part of the store.",
  },
] as const;

export const settingsSectionValues = new Set<SettingsSection>(
  settingsSections.map((section) => section.value),
);

export function getSettingsSectionDefinition(section: SettingsSection) {
  return settingsSections.find((item) => item.value === section) ?? settingsSections[0];
}

export function isSettingsSection(value: string | undefined): value is SettingsSection {
  return Boolean(value && settingsSectionValues.has(value as SettingsSection));
}

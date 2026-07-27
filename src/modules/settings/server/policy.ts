import type { StaffCapability } from "@/modules/auth/permissions";

export const settingsCapabilities = {
  read: "settings:read",
  update: "settings:update",
} as const satisfies Record<string, StaffCapability>;

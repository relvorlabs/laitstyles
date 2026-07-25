import type { StaffCapability } from "@/lib/auth/permissions";

export const settingsCapabilities = {
  read: "settings:read",
  update: "settings:update",
} as const satisfies Record<string, StaffCapability>;

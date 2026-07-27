import type { StaffCapability } from "@/modules/auth/permissions";

export const overviewCapabilities = {
  read: "admin:access",
} as const satisfies Record<string, StaffCapability>;

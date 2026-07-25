import type { StaffCapability } from "@/lib/auth/permissions";

export const overviewCapabilities = {
  read: "admin:access",
} as const satisfies Record<string, StaffCapability>;

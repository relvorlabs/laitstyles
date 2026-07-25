import type { StaffCapability } from "@/lib/auth/permissions";

export const overviewCapabilities = {
  read: "overview:read",
} as const satisfies Record<string, StaffCapability>;

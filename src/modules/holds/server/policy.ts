import type { StaffCapability } from "@/lib/auth/permissions";

export const holdCapabilities = {
  read: "holds:read",
  update: "holds:update",
} as const satisfies Record<string, StaffCapability>;

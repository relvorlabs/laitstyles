import type { StaffCapability } from "@/modules/auth/permissions";

export const holdCapabilities = {
  read: "holds:read",
  update: "holds:update",
} as const satisfies Record<string, StaffCapability>;

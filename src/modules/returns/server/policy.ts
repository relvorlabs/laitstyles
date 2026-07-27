import type { StaffCapability } from "@/modules/auth/permissions";

export const returnCapabilities = {
  read: "returns:read",
  update: "returns:update",
} as const satisfies Record<string, StaffCapability>;

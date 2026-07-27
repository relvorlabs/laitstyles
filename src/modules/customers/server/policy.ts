import type { StaffCapability } from "@/modules/auth/permissions";

export const customerCapabilities = {
  read: "customers:read",
  note: "customers:note",
} as const satisfies Record<string, StaffCapability>;

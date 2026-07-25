import type { StaffCapability } from "@/lib/auth/permissions";

export const customerCapabilities = {
  read: "customers:read",
  note: "customers:note",
} as const satisfies Record<string, StaffCapability>;

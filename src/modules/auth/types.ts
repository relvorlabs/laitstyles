export const ACCOUNT_ROLES = ["consumer", "admin", "manager"] as const;
export const STAFF_ROLES = ["admin", "manager"] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ACCOUNT_ROLE_LABELS = {
  consumer: "Consumer",
  admin: "Admin / store owner",
  manager: "Store manager",
} satisfies Record<AccountRole, string>;

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === "string" && (ACCOUNT_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

// P7-T03: session.ts now lives in this module, so this is a same-module
// re-export (no legacy-exception edge needed, unlike the T02 attempt at
// re-exporting these from the still-legacy src/server/auth/session).
export type {
  ConsumerSession,
  CurrentSession,
  StaffAccess,
  StaffSession,
  VerifiedIdentity,
} from "@/modules/auth/server/session";

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

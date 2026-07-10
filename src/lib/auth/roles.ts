export const STAFF_ROLES = ["owner", "manager", "operator"] as const;

export const CONSUMER_ROLE = "consumer" as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type ConsumerRole = typeof CONSUMER_ROLE;
export type AccountRole = StaffRole | ConsumerRole;

export type MembershipStatus = "invited" | "active" | "suspended";

export const STAFF_ROLE_LABELS = {
  owner: "Owner / CEO",
  manager: "Manager",
  operator: "Operator / sales staff",
} satisfies Record<StaffRole, string>;

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export function isAccountRole(value: unknown): value is AccountRole {
  return value === CONSUMER_ROLE || isStaffRole(value);
}

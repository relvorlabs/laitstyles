import { type AccountRole, STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";

export const STAFF_CAPABILITIES = [
  "admin:access",
  "storefront:read",
  "inventory:read",
  "inventory:create",
  "inventory:update",
  "inventory:archive",
  "inventory:delete",
  "orders:read",
  "orders:update",
  "holds:read",
  "holds:update",
  "sales:record",
  "returns:read",
  "returns:update",
  "customers:read",
  "customers:note",
  "settings:read",
  "settings:update",
  "team:read",
  "team:manage",
  "reports:export",
  "audit:read",
] as const;

export const CONSUMER_CAPABILITIES = [
  "storefront:purchase",
  "consumer:account:update",
  "consumer:orders:read",
  "consumer:saved-products:update",
] as const;

export type StaffCapability = (typeof STAFF_CAPABILITIES)[number];
export type ConsumerCapability = (typeof CONSUMER_CAPABILITIES)[number];
export type AccountCapability = StaffCapability | ConsumerCapability;

const MANAGER_CAPABILITIES = [
  "admin:access",
  "storefront:read",
  "inventory:read",
  "inventory:create",
  "inventory:update",
  "inventory:archive",
  "orders:read",
  "orders:update",
  "holds:read",
  "holds:update",
  "sales:record",
  "returns:read",
  "returns:update",
  "customers:read",
  "customers:note",
  "settings:read",
  "settings:update",
  "team:read",
] as const satisfies readonly StaffCapability[];

const OPERATOR_CAPABILITIES = [
  "admin:access",
  "storefront:read",
  "inventory:read",
  "inventory:update",
  "orders:read",
  "orders:update",
  "holds:read",
  "holds:update",
  "sales:record",
  "returns:read",
  "customers:read",
  "customers:note",
] as const satisfies readonly StaffCapability[];

export const ROLE_CAPABILITIES = {
  owner: STAFF_CAPABILITIES,
  manager: MANAGER_CAPABILITIES,
  operator: OPERATOR_CAPABILITIES,
  consumer: CONSUMER_CAPABILITIES,
} satisfies Record<AccountRole, readonly AccountCapability[]>;

const roleCapabilitySets: Record<AccountRole, ReadonlySet<AccountCapability>> = {
  owner: new Set(ROLE_CAPABILITIES.owner),
  manager: new Set(ROLE_CAPABILITIES.manager),
  operator: new Set(ROLE_CAPABILITIES.operator),
  consumer: new Set(ROLE_CAPABILITIES.consumer),
};

export function hasCapability(role: AccountRole, capability: AccountCapability) {
  return roleCapabilitySets[role].has(capability);
}

export function getCapabilitiesForRole(role: AccountRole) {
  return ROLE_CAPABILITIES[role];
}

export function canAccessAdmin(role: AccountRole) {
  return hasCapability(role, "admin:access");
}

export function canManageStaff(role: StaffRole) {
  return hasCapability(role, "team:manage");
}

export function getStaffRolesByCapability(capability: StaffCapability) {
  return STAFF_ROLES.filter((role) => hasCapability(role, capability));
}

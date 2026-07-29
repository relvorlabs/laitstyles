import type { AccountRole, StaffRole } from "@/modules/auth/types";

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
  "payments:refund",
  "finance:read",
  "finance:transfer",
  "customers:read",
  "customers:note",
  "settings:read",
  "settings:update",
  "team:read",
  "team:invite",
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
  "finance:read",
  "customers:read",
  "customers:note",
  "settings:read",
  "reports:export",
] as const satisfies readonly StaffCapability[];

export const ROLE_CAPABILITIES = {
  admin: STAFF_CAPABILITIES,
  manager: MANAGER_CAPABILITIES,
  consumer: CONSUMER_CAPABILITIES,
} satisfies Record<AccountRole, readonly AccountCapability[]>;

const roleCapabilitySets: Record<AccountRole, ReadonlySet<AccountCapability>> = {
  admin: new Set(ROLE_CAPABILITIES.admin),
  manager: new Set(ROLE_CAPABILITIES.manager),
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

export function canUpdateSettings(role: StaffRole) {
  return hasCapability(role, "settings:update");
}

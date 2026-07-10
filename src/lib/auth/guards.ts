import type { AuthDeniedReason } from "@/lib/auth/auth-errors";
import { type AccountCapability, hasCapability } from "@/lib/auth/permissions";
import type { MembershipStatus, StaffRole } from "@/lib/auth/roles";

export type StoreMembership = {
  storeId: string;
  role: StaffRole;
  status: MembershipStatus;
};

export type AuthPrincipal = {
  profileId: string | null;
  storeMemberships: readonly StoreMembership[];
  consumerCustomerIds?: readonly string[];
};

export type StoreGuardResult =
  | { ok: true; membership: StoreMembership }
  | { ok: false; reason: AuthDeniedReason };

export function getStoreMembership(principal: AuthPrincipal, storeId: string) {
  return principal.storeMemberships.find((membership) => membership.storeId === storeId);
}

export function requireStoreCapability(
  principal: AuthPrincipal,
  storeId: string,
  capability: AccountCapability,
): StoreGuardResult {
  if (!principal.profileId) {
    return { ok: false, reason: "signed-out" };
  }

  const membership = getStoreMembership(principal, storeId);

  if (!membership) {
    return { ok: false, reason: "not-store-member" };
  }

  if (membership.status !== "active") {
    return { ok: false, reason: "inactive-membership" };
  }

  if (!hasCapability(membership.role, capability)) {
    return { ok: false, reason: "missing-capability" };
  }

  return { ok: true, membership };
}

export function canUseStoreCapability(
  principal: AuthPrincipal,
  storeId: string,
  capability: AccountCapability,
) {
  return requireStoreCapability(principal, storeId, capability).ok;
}

export function canAccessOwnCustomerRecord(principal: AuthPrincipal, customerId: string) {
  return Boolean(principal.profileId && principal.consumerCustomerIds?.includes(customerId));
}

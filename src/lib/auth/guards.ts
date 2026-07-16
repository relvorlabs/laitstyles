import type { AuthDeniedReason } from "@/lib/auth/auth-errors";
import { type AccountCapability, hasCapability } from "@/lib/auth/permissions";
import type { AccountRole } from "@/lib/auth/roles";

export type AuthPrincipal = {
  profileId: string | null;
  role: AccountRole | null;
  consumerCustomerIds?: readonly string[];
  authorizationLoaded?: boolean;
  authorizationError?: string;
};

export type AccountGuardResult =
  | { ok: true; role: AccountRole }
  | { ok: false; reason: AuthDeniedReason };

export function requireCapability(
  principal: AuthPrincipal,
  capability: AccountCapability,
): AccountGuardResult {
  if (!principal.profileId) return { ok: false, reason: "signed-out" };
  if (principal.authorizationLoaded === false || !principal.role) {
    return { ok: false, reason: "authorization-unavailable" };
  }
  if (!hasCapability(principal.role, capability)) {
    return { ok: false, reason: "missing-capability" };
  }
  return { ok: true, role: principal.role };
}

export function canUseCapability(principal: AuthPrincipal, capability: AccountCapability) {
  return requireCapability(principal, capability).ok;
}

export function canAccessOwnCustomerRecord(principal: AuthPrincipal, customerId: string) {
  return Boolean(
    principal.profileId &&
      principal.role === "consumer" &&
      principal.consumerCustomerIds?.includes(customerId),
  );
}

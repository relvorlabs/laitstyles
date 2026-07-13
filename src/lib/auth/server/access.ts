import type { AuthDeniedReason } from "@/lib/auth/auth-errors";
import type { AuthPrincipal, StoreMembership } from "@/lib/auth/guards";
import { hasCapability, type StaffCapability } from "@/lib/auth/permissions";

export type ControlRoomAccess =
  | {
      ok: true;
      membership: StoreMembership;
      storeId: string;
    }
  | {
      ok: false;
      reason: AuthDeniedReason;
    };

export function resolveControlRoomAccess(
  principal: AuthPrincipal,
  capability: StaffCapability = "control-room:access",
  preferredStoreId?: string | null,
): ControlRoomAccess {
  if (!principal.profileId) {
    return { ok: false, reason: "signed-out" };
  }

  if (principal.authorizationLoaded === false) {
    return { ok: false, reason: "membership-unavailable" };
  }

  const memberships = preferredStoreId
    ? principal.storeMemberships.filter((membership) => membership.storeId === preferredStoreId)
    : principal.storeMemberships;

  if (!memberships.length) {
    return { ok: false, reason: "not-store-member" };
  }

  const activeMemberships = memberships.filter((membership) => membership.status === "active");

  if (!activeMemberships.length) {
    return { ok: false, reason: "inactive-membership" };
  }

  const membership = activeMemberships.find((candidate) =>
    hasCapability(candidate.role, capability),
  );

  if (!membership) {
    return { ok: false, reason: "missing-capability" };
  }

  return {
    ok: true,
    membership,
    storeId: membership.storeId,
  };
}

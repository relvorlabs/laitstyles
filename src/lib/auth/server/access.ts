import type { AuthDeniedReason } from "@/lib/auth/auth-errors";
import type { AuthPrincipal } from "@/lib/auth/guards";
import { hasCapability, type StaffCapability } from "@/lib/auth/permissions";
import { isStaffRole, type StaffRole } from "@/lib/auth/roles";

export type AdminAccess =
  | { ok: true; role: StaffRole }
  | { ok: false; reason: AuthDeniedReason };

export function resolveAdminAccess(
  principal: AuthPrincipal,
  capability: StaffCapability = "admin:access",
): AdminAccess {
  if (!principal.profileId) return { ok: false, reason: "signed-out" };
  if (principal.authorizationLoaded === false || !principal.role) {
    return { ok: false, reason: "authorization-unavailable" };
  }
  if (!isStaffRole(principal.role) || !hasCapability(principal.role, capability)) {
    return { ok: false, reason: "missing-capability" };
  }
  return { ok: true, role: principal.role };
}

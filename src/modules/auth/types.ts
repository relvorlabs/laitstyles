// P7-T02: temporary re-export while roles still live at @/lib/auth/roles.
// Retired in P7-T07 (owned here directly).
export type { AccountRole, StaffRole } from "@/lib/auth/roles";
export {
  ACCOUNT_ROLE_LABELS,
  ACCOUNT_ROLES,
  isAccountRole,
  isStaffRole,
  STAFF_ROLES,
} from "@/lib/auth/roles";

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

// P7-T02: temporary re-export while roles still live at @/lib/auth/roles.
// Retired in P7-T07 (owned here directly).
//
// Session types (CurrentSession, ConsumerSession, StaffSession, StaffAccess,
// VerifiedIdentity) are intentionally NOT re-exported here yet: they still
// live in the legacy src/server/auth/session.ts, and re-exporting them now
// would add a new src/modules/auth/types.ts -> @/server/auth/session edge
// that the architecture guard correctly flags as undocumented (confirmed via
// `pnpm check:architecture` in this task). Rather than registering a
// short-lived legacy exception for it, that re-export is added in P7-T03,
// once session.ts itself relocates to @/modules/auth/server/session — at
// that point it's a same-module import needing no exception at all.

export type { AccountRole, StaffRole } from "@/lib/auth/roles";
export {
  ACCOUNT_ROLE_LABELS,
  ACCOUNT_ROLES,
  isAccountRole,
  isStaffRole,
  STAFF_ROLES,
} from "@/lib/auth/roles";

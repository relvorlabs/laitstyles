export const ACCOUNT_ROLES = ["consumer", "admin", "manager"] as const;
export const STAFF_ROLES = ["admin", "manager"] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];

const accountRoleSet: ReadonlySet<string> = new Set(ACCOUNT_ROLES);
const staffRoleSet: ReadonlySet<string> = new Set(STAFF_ROLES);

export type ManagerMember = {
  id: string;
  email: string;
  displayName: string;
  state: "invited" | "active";
  invitedAt: string | null;
  lastSeenAt: string | null;
};

export const ACCOUNT_ROLE_LABELS = {
  consumer: "Consumer",
  admin: "Admin / store owner",
  manager: "Store manager",
} satisfies Record<AccountRole, string>;

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === "string" && accountRoleSet.has(value);
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && staffRoleSet.has(value);
}

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

// Account security (email/password/MFA/session management) domain contracts.
// Locked against the installed auth SDK surface — see the account security
// contract documentation for provider-specific implementation details.

/** The minimal, freshly-resolved identity every account-security operation needs. */
export type AccountSecurityIdentity = {
  authUserId: string;
  email: string | null;
  sessionId: string;
  authenticatedAt: string | null;
  assuranceLevel: "aal1" | "aal2" | null;
};

export const ACCOUNT_SECURITY_ERROR_CODES = [
  "PASSWORD_UNCHANGED",
  "INVALID_CURRENT_PASSWORD",
  "REAUTHENTICATION_REQUIRED",
  "EMAIL_UNCHANGED",
  "SESSION_UNAVAILABLE",
  "MFA_FACTOR_NOT_FOUND",
  "MFA_CHALLENGE_REQUIRED",
  "MFA_CHALLENGE_EXPIRED_OR_INVALID",
  "RESOURCE_NOT_OWNED",
  "PROVIDER_UNAVAILABLE",
] as const;

export type AccountSecurityErrorCode = (typeof ACCOUNT_SECURITY_ERROR_CODES)[number];

const accountSecurityErrorCodeSet: ReadonlySet<string> = new Set(ACCOUNT_SECURITY_ERROR_CODES);

const ACCOUNT_SECURITY_ERROR_MESSAGES: Record<AccountSecurityErrorCode, string> = {
  PASSWORD_UNCHANGED: "Choose a password different from your current one.",
  INVALID_CURRENT_PASSWORD: "Your current password is incorrect.",
  REAUTHENTICATION_REQUIRED: "Confirm your identity again before continuing.",
  EMAIL_UNCHANGED: "That is already your account email.",
  SESSION_UNAVAILABLE: "We could not confirm this sign-in. Sign in again and retry.",
  MFA_FACTOR_NOT_FOUND: "This authenticator could not be found on your account.",
  MFA_CHALLENGE_REQUIRED: "Enter a current code from your authenticator app before continuing.",
  MFA_CHALLENGE_EXPIRED_OR_INVALID: "That verification code is invalid or has expired.",
  RESOURCE_NOT_OWNED: "This account cannot access that item.",
  PROVIDER_UNAVAILABLE: "We could not complete that request. Please try again.",
};

export function isAccountSecurityErrorCode(value: unknown): value is AccountSecurityErrorCode {
  return typeof value === "string" && accountSecurityErrorCodeSet.has(value);
}

export class AccountSecurityError extends Error {
  readonly code: AccountSecurityErrorCode;

  constructor(code: AccountSecurityErrorCode, message?: string) {
    super(message ?? ACCOUNT_SECURITY_ERROR_MESSAGES[code]);
    this.name = "AccountSecurityError";
    this.code = code;
  }
}

export function isAccountSecurityError(error: unknown): error is AccountSecurityError {
  return error instanceof AccountSecurityError;
}

export type AccountEmailChangeResult = { status: "confirmation-sent"; email: string };
export type AccountPasswordChangeResult = { status: "updated" };

export type MfaFactorSummary = {
  id: string;
  friendlyName: string | null;
  factorType: string;
  status: "verified" | "unverified";
};

export type MfaFactorList = { factors: MfaFactorSummary[] };

export type MfaEnrollTotpResult = {
  status: "unverified";
  factorId: string;
  totp: { qrCode: string; secret: string; uri: string };
};

export type MfaChallengeResult = { challengeId: string; expiresAt: string };
export type MfaVerifyResult = { status: "verified"; factorId: string };
export type MfaUnenrollResult = { status: "removed"; factorId: string };

export type AccountSessionSummary = {
  current: {
    sessionId: string;
    authenticatedAt: string | null;
    assuranceLevel: string | null;
  };
  otherSessions: { kind: "count-unavailable" };
};

export type SignOutOthersResult = { status: "signed-out" };

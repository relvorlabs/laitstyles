import "server-only";

import { logger } from "@/lib/logger";

export type AuthDeniedReason =
  | "signed-out"
  | "authorization-unavailable"
  | "missing-capability"
  | "account-inactive"
  | "not-consumer-owner";

export const AUTH_DENIED_MESSAGES = {
  "signed-out": "Sign in before continuing.",
  "authorization-unavailable": "We could not verify this account role. Try signing in again.",
  "missing-capability": "This account role cannot perform that action.",
  "account-inactive": "This account is inactive. Contact the store owner to restore access.",
  "not-consumer-owner": "This consumer account can only access its own storefront records.",
} satisfies Record<AuthDeniedReason, string>;

export const authFlowErrorCodes = [
  "invalid-input",
  "invalid-credentials",
  "email-not-confirmed",
  "account-exists",
  "weak-password",
  "rate-limited",
  "signup-disabled",
  "confirmation-failed",
  "recovery-failed",
  "recovery-invalid",
  "password-update-failed",
  "oauth-start-failed",
  "oauth-callback-invalid",
  "provider-unavailable",
  "sign-out-failed",
] as const;

export type AuthFlowErrorCode = (typeof authFlowErrorCodes)[number];

export type AuthFlowFailure = {
  code: AuthFlowErrorCode;
  message: string;
};

export type AuthProviderErrorLike = {
  code?: string | null;
  status?: number | null;
};

const authFlowErrorMessages: Record<AuthFlowErrorCode, string> = {
  "invalid-input": "Check the highlighted fields and try again.",
  "invalid-credentials": "The email or password is incorrect.",
  "email-not-confirmed":
    "Confirm your email before signing in. You can request a new confirmation link.",
  "account-exists": "An account already exists for this email. Sign in instead.",
  "weak-password": "Choose a stronger password that meets the security requirements.",
  "rate-limited": "Too many attempts. Please wait a moment and try again.",
  "signup-disabled": "Account creation is temporarily unavailable.",
  "confirmation-failed": "We could not send a confirmation email. Please try again.",
  "recovery-failed": "We could not send a password-reset email. Please try again.",
  "recovery-invalid": "This password-reset link is invalid or has expired. Request a new one.",
  "password-update-failed":
    "We could not update your password. Request a new reset link and try again.",
  "oauth-start-failed": "Google sign-in could not be started. Please try again.",
  "oauth-callback-invalid": "The sign-in link is incomplete or has expired. Please try again.",
  "provider-unavailable": "We could not complete that request. Please try again.",
  "sign-out-failed": "We could not sign you out. Please try again.",
};

export function getAuthFlowErrorMessage(code: AuthFlowErrorCode): string {
  return authFlowErrorMessages[code];
}

export function isAuthFlowErrorCode(value: string | null | undefined): value is AuthFlowErrorCode {
  return typeof value === "string" && (authFlowErrorCodes as readonly string[]).includes(value);
}

export function authFlowFailure(code: AuthFlowErrorCode): AuthFlowFailure {
  return { code, message: getAuthFlowErrorMessage(code) };
}

export function mapAuthProviderError(
  error: AuthProviderErrorLike | null | undefined,
  fallback: AuthFlowErrorCode = "provider-unavailable",
): AuthFlowFailure {
  switch (error?.code) {
    case "invalid_credentials":
    case "invalid_grant":
      return authFlowFailure("invalid-credentials");
    case "email_not_confirmed":
      return authFlowFailure("email-not-confirmed");
    case "email_exists":
    case "user_already_exists":
    case "identity_already_exists":
      return authFlowFailure("account-exists");
    case "weak_password":
      return authFlowFailure("weak-password");
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "rate_limit_exceeded":
      return authFlowFailure("rate-limited");
    case "signup_disabled":
      return authFlowFailure("signup-disabled");
    default:
      return authFlowFailure(fallback);
  }
}

export type AuthProviderDiagnostic = {
  code?: string | null;
  status?: number | null;
  name?: string | null;
};

export type AuthProviderOperation =
  | "password-sign-in"
  | "password-sign-up"
  | "password-recovery-request"
  | "password-recovery-session"
  | "password-recovery-update"
  | "password-recovery-sign-out"
  | "signup-confirmation-resend"
  | "sign-out"
  | "oauth-start"
  | "oauth-callback"
  | "oauth-callback-user";

export function logAuthProviderFailure(
  operation: AuthProviderOperation,
  error: AuthProviderDiagnostic,
) {
  logger.warn(
    {
      operation,
      providerCode: error.code ?? null,
      providerStatus: error.status ?? null,
      providerErrorName: error.name ?? null,
    },
    "Auth provider request failed",
  );
}

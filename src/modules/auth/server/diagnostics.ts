import "server-only";

import { logger } from "@/lib/logger";
import {
  authFlowErrorCodes,
  getAuthFlowErrorMessage,
  type AuthFlowErrorCode,
  isAuthFlowErrorCode,
} from "@/modules/auth/errors";

export { authFlowErrorCodes, getAuthFlowErrorMessage, isAuthFlowErrorCode };
export type { AuthFlowErrorCode };

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

export type AuthFlowFailure = {
  code: AuthFlowErrorCode;
  message: string;
};

export type AuthProviderErrorLike = {
  code?: string | null;
  status?: number | null;
};

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

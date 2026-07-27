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

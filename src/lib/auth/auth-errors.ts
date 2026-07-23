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

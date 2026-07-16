export type AuthDeniedReason =
  | "signed-out"
  | "authorization-unavailable"
  | "missing-capability"
  | "not-consumer-owner";

export const AUTH_DENIED_MESSAGES = {
  "signed-out": "Sign in before continuing.",
  "authorization-unavailable": "We could not verify this account role. Try signing in again.",
  "missing-capability": "This account role cannot perform that action.",
  "not-consumer-owner": "This consumer account can only access its own storefront records.",
} satisfies Record<AuthDeniedReason, string>;

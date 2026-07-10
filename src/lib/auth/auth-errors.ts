export type AuthDeniedReason =
  | "signed-out"
  | "not-store-member"
  | "inactive-membership"
  | "missing-capability"
  | "not-consumer-owner";

export const AUTH_DENIED_MESSAGES = {
  "signed-out": "Sign in before continuing.",
  "not-store-member": "This account is not a member of this store.",
  "inactive-membership": "This store membership is not active.",
  "missing-capability": "This role cannot perform that action.",
  "not-consumer-owner": "This account can only access its own storefront records.",
} satisfies Record<AuthDeniedReason, string>;

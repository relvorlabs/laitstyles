export type AuthDeniedReason =
  | "signed-out"
  | "membership-unavailable"
  | "not-store-member"
  | "inactive-membership"
  | "missing-capability"
  | "not-consumer-owner";

export const AUTH_DENIED_MESSAGES = {
  "signed-out": "Sign in before continuing.",
  "membership-unavailable":
    "We could not verify this store membership. Try again, or ask the owner to confirm the Supabase team setup.",
  "not-store-member": "This account is not a member of this store.",
  "inactive-membership": "This store membership is not active.",
  "missing-capability": "This role cannot perform that action.",
  "not-consumer-owner": "This account can only access its own storefront records.",
} satisfies Record<AuthDeniedReason, string>;

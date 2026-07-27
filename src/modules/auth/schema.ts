// P7-T02: temporary re-export while the schema logic still lives at
// @/lib/auth/auth-schemas. Retired in P7-T07 once the file itself moves here.

export type {
  AuthEmailInput,
  PasswordSignInInput,
  PasswordSignUpInput,
  RecoveredPasswordInput,
} from "@/lib/auth/auth-schemas";
export {
  authEmailFormDataInput,
  authEmailSchema,
  authFieldErrors,
  authFormDataInput,
  passwordSignInSchema,
  passwordSignUpSchema,
  recoveredPasswordFormDataInput,
  recoveredPasswordSchema,
} from "@/lib/auth/auth-schemas";

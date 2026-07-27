"use server";

import { redirect } from "next/navigation";
import { err, type Result } from "@/lib/errors";
import {
  authEmailFormDataInput,
  authEmailSchema,
  authFieldErrors,
  authFormDataInput,
  passwordSignInSchema,
  passwordSignUpSchema,
  recoveredPasswordFormDataInput,
  recoveredPasswordSchema,
} from "@/modules/auth/schema";
import {
  authenticateWithPassword,
  endSession,
  registerWithPassword,
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
  updateRecoveredPassword,
} from "@/modules/auth/server/authenticate";
import {
  type AuthFlowErrorCode,
  type AuthFlowFailure,
  authFlowFailure,
} from "@/modules/auth/server/diagnostics";
import { getSafeNextPath } from "@/modules/auth/server/redirects";

type PasswordAuthFieldErrors = Partial<
  Record<"email" | "password" | "confirmPassword" | "first" | "last" | "terms", string>
>;

export type PasswordAuthSuccess = {
  status: "success" | "check-email";
  email: string;
};

export type PasswordAuthActionError = AuthFlowFailure & {
  fieldErrors?: PasswordAuthFieldErrors;
};

export type PasswordAuthActionResult = Result<PasswordAuthSuccess, PasswordAuthActionError>;
export type AuthEmailActionResult = Result<
  { status: "accepted"; email: string },
  PasswordAuthActionError
>;
export type RecoveredPasswordActionResult = Result<
  { status: "password-updated" },
  PasswordAuthActionError
>;
export type SignOutActionResult = Result<void, AuthFlowFailure>;

export type AuthActionValues = {
  email?: string;
  first?: string;
  last?: string;
  termsAccepted?: boolean;
};

export type AuthPageActionState =
  | { status: "idle"; values?: AuthActionValues }
  | {
      status: "error";
      code: AuthFlowErrorCode;
      message: string;
      fieldErrors?: PasswordAuthFieldErrors;
      values?: AuthActionValues;
    }
  | { status: "success"; message: string; email?: string };

export async function submitPasswordSignIn(formData: FormData): Promise<PasswordAuthActionResult> {
  const input = authFormDataInput(formData);
  const parsed = passwordSignInSchema.safeParse({
    email: input.email,
    password: input.password,
  });
  if (!parsed.success) {
    return err({
      ...authFlowFailure("invalid-input"),
      fieldErrors: authFieldErrors(parsed.error),
    });
  }

  return authenticateWithPassword(parsed.data);
}

export async function submitPasswordSignUp(formData: FormData): Promise<PasswordAuthActionResult> {
  const input = authFormDataInput(formData);
  const parsed = passwordSignUpSchema.safeParse(input);
  if (!parsed.success) {
    return err({
      ...authFlowFailure("invalid-input"),
      fieldErrors: authFieldErrors(parsed.error),
    });
  }

  return registerWithPassword(parsed.data);
}

export async function requestPasswordReset(formData: FormData): Promise<AuthEmailActionResult> {
  const parsed = authEmailSchema.safeParse(authEmailFormDataInput(formData));
  if (!parsed.success) {
    return err({
      ...authFlowFailure("invalid-input"),
      fieldErrors: authFieldErrors(parsed.error),
    });
  }

  return sendPasswordResetEmail(parsed.data.email);
}

export async function resendSignupConfirmation(formData: FormData): Promise<AuthEmailActionResult> {
  const parsed = authEmailSchema.safeParse(authEmailFormDataInput(formData));
  if (!parsed.success) {
    return err({
      ...authFlowFailure("invalid-input"),
      fieldErrors: authFieldErrors(parsed.error),
    });
  }

  return sendSignupConfirmationEmail(parsed.data.email);
}

export async function submitRecoveredPassword(
  formData: FormData,
): Promise<RecoveredPasswordActionResult> {
  const parsed = recoveredPasswordSchema.safeParse(recoveredPasswordFormDataInput(formData));
  if (!parsed.success) {
    return err({
      ...authFlowFailure("invalid-input"),
      fieldErrors: authFieldErrors(parsed.error),
    });
  }

  return updateRecoveredPassword(parsed.data.password);
}

export async function signOutStorefrontSession(): Promise<SignOutActionResult> {
  return endSession();
}

export async function signInWithPassword(
  _previousState: AuthPageActionState,
  formData: FormData,
): Promise<AuthPageActionState> {
  const next = getSafeNextPath(formData.get("next"), "/account");
  const result = await submitPasswordSignIn(formData);
  if (!result.ok) return pageActionError(result.error, formData);
  redirect(next);
}

export async function signUpWithPassword(
  _previousState: AuthPageActionState,
  formData: FormData,
): Promise<AuthPageActionState> {
  const next = getSafeNextPath(formData.get("next"), "/account");
  const result = await submitPasswordSignUp(formData);
  if (!result.ok) return pageActionError(result.error, formData);
  if (result.value.status === "success") redirect(next);

  return {
    status: "success",
    email: result.value.email,
    message:
      "If this address can receive a confirmation email, a secure link is on its way. Check your inbox and spam folder.",
  };
}

export async function requestPasswordResetWithRedirect(
  _previousState: AuthPageActionState,
  formData: FormData,
): Promise<AuthPageActionState> {
  const result = await requestPasswordReset(formData);
  if (!result.ok) return pageActionError(result.error, formData);

  return {
    status: "success",
    email: result.value.email,
    message:
      "If this address can receive a reset email, a secure link is on its way. Check your inbox and spam folder.",
  };
}

export async function resendSignupConfirmationWithRedirect(
  _previousState: AuthPageActionState,
  formData: FormData,
): Promise<AuthPageActionState> {
  const result = await resendSignupConfirmation(formData);
  if (!result.ok) return pageActionError(result.error, formData);

  return {
    status: "success",
    email: result.value.email,
    message:
      "If this address is eligible for confirmation, a fresh link is on its way. Check your inbox and spam folder.",
  };
}

export async function submitRecoveredPasswordWithRedirect(
  _previousState: AuthPageActionState,
  formData: FormData,
): Promise<AuthPageActionState> {
  const result = await submitRecoveredPassword(formData);
  if (!result.ok) return pageActionError(result.error, formData);

  return {
    status: "success",
    message: "Your password has been updated and other sessions have been closed.",
  };
}

function pageActionError(
  error: PasswordAuthActionError,
  formData: FormData,
): AuthPageActionState {
  return {
    status: "error",
    code: error.code,
    message: error.message,
    fieldErrors: error.fieldErrors,
    values: retainedValues(formData),
  };
}

function retainedValues(formData: FormData): AuthActionValues {
  const value = (key: string) => {
    const entry = formData.get(key);
    return typeof entry === "string" ? entry.trim() : undefined;
  };

  return {
    email: value("email"),
    first: value("first"),
    last: value("last"),
    termsAccepted: formData.get("terms") === "true",
  };
}

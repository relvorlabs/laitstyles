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
import { type AuthFlowFailure, authFlowFailure } from "@/modules/auth/server/diagnostics";
import { getSafeNextPath, withAuthErrorPath } from "@/modules/auth/server/redirects";

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

export async function signInWithPassword(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"), "/account");
  const result = await submitPasswordSignIn(formData);
  if (!result.ok) redirect(withAuthErrorPath(result.error.code, next));
  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"), "/account");
  const result = await submitPasswordSignUp(formData);
  if (!result.ok) redirect(withAuthErrorPath(result.error.code, next));
  if (result.value.status === "check-email") redirect("/auth/sign-up?sent=1");
  redirect(next);
}

export async function requestPasswordResetWithRedirect(formData: FormData) {
  const result = await requestPasswordReset(formData);
  if (!result.ok) redirect(`/auth/forgot-password?error=${result.error.code}`);
  redirect("/auth/forgot-password?sent=1");
}

export async function resendSignupConfirmationWithRedirect(formData: FormData) {
  const result = await resendSignupConfirmation(formData);
  if (!result.ok) redirect(`/auth/resend-confirmation?error=${result.error.code}`);
  redirect("/auth/resend-confirmation?sent=1");
}

export async function submitRecoveredPasswordWithRedirect(formData: FormData) {
  const result = await submitRecoveredPassword(formData);
  if (!result.ok) redirect(`/auth/reset-password?error=${result.error.code}`);
  redirect("/auth/reset-password?updated=1");
}

"use server";

import { redirect } from "next/navigation";
import {
  type AuthFlowFailure,
  authFlowFailure,
  mapAuthProviderError,
} from "@/lib/auth/auth-errors";
import {
  authEmailFormDataInput,
  authEmailSchema,
  authFieldErrors,
  authFormDataInput,
  passwordSignInSchema,
  passwordSignUpSchema,
  recoveredPasswordFormDataInput,
  recoveredPasswordSchema,
} from "@/lib/auth/auth-schemas";
import { logAuthProviderFailure } from "@/lib/auth/server/auth-provider-diagnostics";
import { getSafeNextPath, withAuthErrorPath } from "@/lib/auth/server/redirects";
import { getRequestOrigin } from "@/lib/auth/server/request-origin";
import { err, ok, type Result } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    logAuthProviderFailure("password-sign-in", error);
    return err(mapAuthProviderError(error));
  }
  return ok({ status: "success", email: parsed.data.email });
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

  const next = getSafeNextPath(parsed.data.next, "/account");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first,
        last_name: parsed.data.last,
        full_name: `${parsed.data.first} ${parsed.data.last}`.trim(),
      },
      emailRedirectTo: `${await getRequestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    logAuthProviderFailure("password-sign-up", error);
    return err(mapAuthProviderError(error));
  }

  // Supabase may intentionally return an obfuscated user for an existing email.
  // Keep the response enumeration-safe and never promise that an email was sent.
  return ok({
    status: data.session ? "success" : "check-email",
    email: parsed.data.email,
  });
}

export async function requestPasswordReset(formData: FormData): Promise<AuthEmailActionResult> {
  const parsed = authEmailSchema.safeParse(authEmailFormDataInput(formData));
  if (!parsed.success) {
    return err({
      ...authFlowFailure("invalid-input"),
      fieldErrors: authFieldErrors(parsed.error),
    });
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
  });
  if (error) {
    logAuthProviderFailure("password-recovery-request", error);
    return err(mapAuthProviderError(error, "recovery-failed"));
  }

  return ok({ status: "accepted", email: parsed.data.email });
}

export async function resendSignupConfirmation(formData: FormData): Promise<AuthEmailActionResult> {
  const parsed = authEmailSchema.safeParse(authEmailFormDataInput(formData));
  if (!parsed.success) {
    return err({
      ...authFlowFailure("invalid-input"),
      fieldErrors: authFieldErrors(parsed.error),
    });
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/account")}`,
    },
  });
  if (error) {
    logAuthProviderFailure("signup-confirmation-resend", error);
    return err(mapAuthProviderError(error, "confirmation-failed"));
  }

  return ok({ status: "accepted", email: parsed.data.email });
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

  const supabase = await createClient();
  const userResult = await supabase.auth.getUser();
  if (!userResult.data.user || userResult.error) {
    if (userResult.error) logAuthProviderFailure("password-recovery-session", userResult.error);
    return err(authFlowFailure("recovery-invalid"));
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logAuthProviderFailure("password-recovery-update", error);
    return err(mapAuthProviderError(error, "password-update-failed"));
  }

  const signOutResult = await supabase.auth.signOut({ scope: "global" });
  if (signOutResult.error) {
    logAuthProviderFailure("password-recovery-sign-out", signOutResult.error);
  }

  return ok({ status: "password-updated" });
}

export async function signOutStorefrontSession(): Promise<SignOutActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logAuthProviderFailure("sign-out", error);
    return err(authFlowFailure("sign-out-failed"));
  }
  return ok(undefined);
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

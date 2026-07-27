import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { PasswordSignInInput, PasswordSignUpInput } from "@/modules/auth/schema";
import {
  type AuthFlowFailure,
  authFlowFailure,
  logAuthProviderFailure,
  mapAuthProviderError,
} from "@/modules/auth/server/diagnostics";
import { getRequestOrigin, getSafeNextPath } from "@/modules/auth/server/redirects";

export type PasswordAuthSuccess = {
  status: "success" | "check-email";
  email: string;
};

export type PasswordAuthResult = Result<PasswordAuthSuccess, AuthFlowFailure>;
export type AuthEmailResult = Result<{ status: "accepted"; email: string }, AuthFlowFailure>;
export type RecoveredPasswordResult = Result<{ status: "password-updated" }, AuthFlowFailure>;
export type SignOutResult = Result<void, AuthFlowFailure>;

export async function authenticateWithPassword(
  input: PasswordSignInInput,
): Promise<PasswordAuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) {
    logAuthProviderFailure("password-sign-in", error);
    return err(mapAuthProviderError(error));
  }
  return ok({ status: "success", email: input.email });
}

export async function registerWithPassword(
  input: PasswordSignUpInput,
): Promise<PasswordAuthResult> {
  const next = getSafeNextPath(input.next, "/account");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.first,
        last_name: input.last,
        full_name: `${input.first} ${input.last}`.trim(),
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
    email: input.email,
  });
}

export async function sendPasswordResetEmail(email: string): Promise<AuthEmailResult> {
  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
  });
  if (error) {
    logAuthProviderFailure("password-recovery-request", error);
    return err(mapAuthProviderError(error, "recovery-failed"));
  }

  return ok({ status: "accepted", email });
}

export async function sendSignupConfirmationEmail(email: string): Promise<AuthEmailResult> {
  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/account")}`,
    },
  });
  if (error) {
    logAuthProviderFailure("signup-confirmation-resend", error);
    return err(mapAuthProviderError(error, "confirmation-failed"));
  }

  return ok({ status: "accepted", email });
}

export async function updateRecoveredPassword(password: string): Promise<RecoveredPasswordResult> {
  const supabase = await createClient();
  const userResult = await supabase.auth.getUser();
  if (!userResult.data.user || userResult.error) {
    if (userResult.error) logAuthProviderFailure("password-recovery-session", userResult.error);
    return err(authFlowFailure("recovery-invalid"));
  }

  const { error } = await supabase.auth.updateUser({ password });
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

export async function endSession(): Promise<SignOutResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logAuthProviderFailure("sign-out", error);
    return err(authFlowFailure("sign-out-failed"));
  }
  return ok(undefined);
}

import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { PasswordSignInInput, PasswordSignUpInput } from "@/modules/auth/schema";
import { ensureConsumerAccount } from "@/modules/auth/server/account-provisioning";
import {
  type AuthFlowFailure,
  authFlowFailure,
  logAuthProviderFailure,
  mapAuthProviderError,
} from "@/modules/auth/server/diagnostics";
import {
  getAuthRedirectUrl,
  getSafeNextPath,
  withAuthErrorPath,
} from "@/modules/auth/server/redirects";

export type PasswordAuthSuccess = {
  status: "success" | "check-email";
  email: string;
};

export type PasswordAuthResult = Result<PasswordAuthSuccess, AuthFlowFailure>;
export type AuthEmailResult = Result<{ status: "accepted"; email: string }, AuthFlowFailure>;
export type RecoveredPasswordResult = Result<{ status: "password-updated" }, AuthFlowFailure>;
export type SignOutResult = Result<void, AuthFlowFailure>;

type OAuthCallbackInput = {
  code: string | null;
  providerErrorCode: string | null;
  next: string | null;
};

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
  const emailRedirectTo = await getAuthRedirectUrl(
    `/auth/callback?next=${encodeURIComponent(next)}`,
  );
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.first,
        last_name: input.last,
        full_name: `${input.first} ${input.last}`.trim(),
      },
      emailRedirectTo,
    },
  });

  if (error) {
    logAuthProviderFailure("password-sign-up", error);
    return err(mapAuthProviderError(error));
  }

  // Supabase sends the configured confirmation template when email confirmation
  // is enabled. Keep the response enumeration-safe for existing addresses.
  return ok({
    status: data.session ? "success" : "check-email",
    email: input.email,
  });
}

export async function sendPasswordResetEmail(email: string): Promise<AuthEmailResult> {
  const supabase = await createClient();
  const redirectTo = await getAuthRedirectUrl(
    `/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    logAuthProviderFailure("password-recovery-request", error);
    return err(mapAuthProviderError(error, "recovery-failed"));
  }

  return ok({ status: "accepted", email });
}

export async function sendSignupConfirmationEmail(email: string): Promise<AuthEmailResult> {
  const supabase = await createClient();
  const emailRedirectTo = await getAuthRedirectUrl(
    `/auth/callback?next=${encodeURIComponent("/account")}`,
  );
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });
  if (error) {
    logAuthProviderFailure("signup-confirmation-resend", error);
    return err(mapAuthProviderError(error, "confirmation-failed"));
  }

  return ok({ status: "accepted", email });
}

export async function startGoogleOAuth(nextValue: FormDataEntryValue | string | null) {
  const next = getSafeNextPath(nextValue, "/account");
  const supabase = await createClient();
  const redirectTo = await getAuthRedirectUrl(
    `/auth/callback?next=${encodeURIComponent(next)}`,
  );
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    logAuthProviderFailure("oauth-start", error ?? { name: "MissingOAuthRedirectUrl" });
    const failure = error
      ? mapAuthProviderError(error, "oauth-start-failed")
      : authFlowFailure("oauth-start-failed");
    return withAuthErrorPath(failure.code, next);
  }

  return data.url;
}

export async function completeOAuthCallback({
  code,
  providerErrorCode,
  next: nextValue,
}: OAuthCallbackInput) {
  const next = getSafeNextPath(nextValue, "/account");

  if (providerErrorCode) {
    logAuthProviderFailure("oauth-callback", {
      name: "OAuthCallbackProviderError",
      code: providerErrorCode,
    });
    const failure = mapAuthProviderError({ code: providerErrorCode }, "oauth-callback-invalid");
    return withAuthErrorPath(failure.code, next);
  }

  if (!code) {
    logAuthProviderFailure("oauth-callback", { name: "MissingOAuthCallbackCode" });
    return withAuthErrorPath("oauth-callback-invalid", next);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logAuthProviderFailure("oauth-callback", error);
    const failure = mapAuthProviderError(error, "oauth-callback-invalid");
    return withAuthErrorPath(failure.code, next);
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) {
    logAuthProviderFailure("oauth-callback-user", userError);
    const failure = mapAuthProviderError(userError, "oauth-callback-invalid");
    return withAuthErrorPath(failure.code, next);
  }

  if (data.user) {
    await ensureConsumerAccount({
      id: data.user.id,
      email: data.user.email ?? null,
      userMetadata: data.user.user_metadata,
    });
  }

  return next;
}

export async function hasRecoverySession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) logAuthProviderFailure("password-recovery-session", error);
  return Boolean(data.user && !error);
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

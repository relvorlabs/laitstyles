"use server";

import { redirect } from "next/navigation";
import {
  authFlowFailure,
  mapAuthProviderError,
  type AuthFlowFailure,
} from "@/lib/auth/auth-errors";
import {
  authFieldErrors,
  authFormDataInput,
  passwordSignInSchema,
  passwordSignUpSchema,
} from "@/lib/auth/auth-schemas";
import { logAuthProviderFailure } from "@/lib/auth/server/auth-provider-diagnostics";
import { getSafeNextPath, withAuthErrorPath } from "@/lib/auth/server/redirects";
import { getRequestOrigin } from "@/lib/auth/server/request-origin";
import { err, ok, type Result } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

type PasswordAuthFieldErrors = Partial<
  Record<"email" | "password" | "first" | "last" | "terms", string>
>;

export type PasswordAuthSuccess = {
  status: "success" | "check-email";
  email: string;
};

export type PasswordAuthActionError = AuthFlowFailure & {
  fieldErrors?: PasswordAuthFieldErrors;
};

export type PasswordAuthActionResult = Result<PasswordAuthSuccess, PasswordAuthActionError>;
export type SignOutActionResult = Result<void, AuthFlowFailure>;

export async function submitPasswordSignIn(
  formData: FormData,
): Promise<PasswordAuthActionResult> {
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

export async function submitPasswordSignUp(
  formData: FormData,
): Promise<PasswordAuthActionResult> {
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
  return ok({
    status: data.session ? "success" : "check-email",
    email: parsed.data.email,
  });
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
  redirect(next);
}

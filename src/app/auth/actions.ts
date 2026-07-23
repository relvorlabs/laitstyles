"use server";

import { redirect } from "next/navigation";
import { getSafeNextPath, withAuthErrorPath } from "@/lib/auth/server/redirects";
import { getRequestOrigin } from "@/lib/auth/server/request-origin";
import { createClient } from "@/lib/supabase/server";

export type PasswordAuthActionResult =
  | { ok: true; status: "success" | "check-email" }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<"email" | "password" | "first" | "last", string>>;
    };

function authFailureMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) {
    return "The email or password is incorrect.";
  }
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account already exists for this email. Sign in instead.";
  }
  if (normalized.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return "We could not complete that request. Please try again.";
}

function credentialsFrom(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function submitPasswordSignIn(
  formData: FormData,
): Promise<PasswordAuthActionResult> {
  const { email, password } = credentialsFrom(formData);
  const fieldErrors: NonNullable<PasswordAuthActionResult["fieldErrors"]> = {};

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: authFailureMessage(error.message) };
  return { ok: true, status: "success" };
}

export async function submitPasswordSignUp(
  formData: FormData,
): Promise<PasswordAuthActionResult> {
  const { email, password } = credentialsFrom(formData);
  const first = String(formData.get("first") ?? "").trim();
  const last = String(formData.get("last") ?? "").trim();
  const next = getSafeNextPath(formData.get("next"), "/account");
  const fieldErrors: NonNullable<PasswordAuthActionResult["fieldErrors"]> = {};

  if (!first) fieldErrors.first = "Enter your first name.";
  if (!last) fieldErrors.last = "Enter your last name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: first,
        last_name: last,
        full_name: `${first} ${last}`.trim(),
      },
      emailRedirectTo: `${await getRequestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { ok: false, message: authFailureMessage(error.message) };
  return { ok: true, status: data.session ? "success" : "check-email" };
}

export async function signInWithPassword(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"), "/account");
  const result = await submitPasswordSignIn(formData);
  if (!result.ok) redirect(withAuthErrorPath(result.message, next));
  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"), "/account");
  const result = await submitPasswordSignUp(formData);
  if (!result.ok) redirect(withAuthErrorPath(result.message, next));
  redirect(next);
}

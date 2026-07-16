"use server";

import { redirect } from "next/navigation";
import { getSafeNextPath, withAuthErrorPath } from "@/lib/auth/server/redirects";
import { getRequestOrigin } from "@/lib/auth/server/request-origin";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"), "/account");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(withAuthErrorPath("Enter your email and password to continue.", next));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(withAuthErrorPath(error.message, next));
  }

  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"), "/account");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    redirect(withAuthErrorPath("Use a valid email and a password of at least 8 characters.", next));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await getRequestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(withAuthErrorPath(error.message, next));
  }

  redirect(next);
}

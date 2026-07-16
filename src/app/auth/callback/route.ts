import { type NextRequest, NextResponse } from "next/server";
import { getSafeNextPath, withAuthErrorPath } from "@/lib/auth/server/redirects";
import { ensureConsumerProfile } from "@/lib/auth/server/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"), "/account");

  if (!code) {
    return NextResponse.redirect(
      new URL(withAuthErrorPath("Missing OAuth callback code.", next), requestUrl),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(withAuthErrorPath(error.message, next), requestUrl));
  }
  const { data } = await supabase.auth.getUser();
  if (data.user) await ensureConsumerProfile(data.user.id, data.user.email ?? null);

  return NextResponse.redirect(new URL(next, requestUrl));
}

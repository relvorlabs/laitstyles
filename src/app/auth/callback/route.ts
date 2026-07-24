import { type NextRequest, NextResponse } from "next/server";
import { mapAuthProviderError } from "@/lib/auth/auth-errors";
import { getSafeNextPath, withAuthErrorPath } from "@/lib/auth/server/redirects";
import { createClient } from "@/lib/supabase/server";
import { ensureConsumerProfile } from "@/server/auth/profile";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"), "/account");

  if (!code) {
    return NextResponse.redirect(
      new URL(withAuthErrorPath("oauth-callback-invalid", next), requestUrl),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failure = mapAuthProviderError(error, "oauth-callback-invalid");
    return NextResponse.redirect(new URL(withAuthErrorPath(failure.code, next), requestUrl));
  }
  const { data } = await supabase.auth.getUser();
  if (data.user) await ensureConsumerProfile(data.user.id, data.user.email ?? null);

  return NextResponse.redirect(new URL(next, requestUrl));
}

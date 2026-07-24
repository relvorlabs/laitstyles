import { type NextRequest, NextResponse } from "next/server";
import { authFlowFailure, mapAuthProviderError } from "@/lib/auth/auth-errors";
import { logAuthProviderFailure } from "@/lib/auth/server/auth-provider-diagnostics";
import { getSafeNextPath, withAuthErrorPath } from "@/lib/auth/server/redirects";
import { createClient } from "@/lib/supabase/server";

async function startGoogleOAuth(request: NextRequest, value: FormDataEntryValue | string | null) {
  const next = getSafeNextPath(value, "/account");
  const supabase = await createClient();
  const redirectTo = `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    logAuthProviderFailure("oauth-start", error ?? { name: "MissingOAuthRedirectUrl" });
    const failure = error
      ? mapAuthProviderError(error, "oauth-start-failed")
      : authFlowFailure("oauth-start-failed");
    return NextResponse.redirect(new URL(withAuthErrorPath(failure.code, next), request.url), {
      status: 303,
    });
  }

  return NextResponse.redirect(data.url, { status: 303 });
}

export async function GET(request: NextRequest) {
  return startGoogleOAuth(request, request.nextUrl.searchParams.get("next"));
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return startGoogleOAuth(request, formData.get("next"));
}

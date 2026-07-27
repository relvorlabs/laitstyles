import { type NextRequest, NextResponse } from "next/server";
import { mapAuthProviderError } from "@/lib/auth/auth-errors";
import { logAuthProviderFailure } from "@/lib/auth/server/auth-provider-diagnostics";
import { getSafeNextPath, withAuthErrorPath } from "@/lib/auth/server/redirects";
import { createClient } from "@/lib/supabase/server";
import { ensureConsumerAccount } from "@/modules/auth/server/account-provisioning";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerErrorCode =
    requestUrl.searchParams.get("error_code") ?? requestUrl.searchParams.get("error");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"), "/account");

  if (providerErrorCode) {
    logAuthProviderFailure("oauth-callback", {
      name: "OAuthCallbackProviderError",
      code: providerErrorCode,
    });
    const failure = mapAuthProviderError({ code: providerErrorCode }, "oauth-callback-invalid");
    return NextResponse.redirect(new URL(withAuthErrorPath(failure.code, next), requestUrl));
  }

  if (!code) {
    logAuthProviderFailure("oauth-callback", { name: "MissingOAuthCallbackCode" });
    return NextResponse.redirect(
      new URL(withAuthErrorPath("oauth-callback-invalid", next), requestUrl),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logAuthProviderFailure("oauth-callback", error);
    const failure = mapAuthProviderError(error, "oauth-callback-invalid");
    return NextResponse.redirect(new URL(withAuthErrorPath(failure.code, next), requestUrl));
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) {
    logAuthProviderFailure("oauth-callback-user", userError);
    const failure = mapAuthProviderError(userError, "oauth-callback-invalid");
    return NextResponse.redirect(new URL(withAuthErrorPath(failure.code, next), requestUrl));
  }

  if (data.user) {
    await ensureConsumerAccount({
      id: data.user.id,
      email: data.user.email ?? null,
      userMetadata: data.user.user_metadata,
    });
  }

  return NextResponse.redirect(new URL(next, requestUrl));
}

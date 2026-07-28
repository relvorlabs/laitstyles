import { type NextRequest, NextResponse } from "next/server";
import { completeOAuthCallback } from "@/modules/auth/server/authenticate";
import { getRequestOrigin } from "@/modules/auth/server/redirects";

export async function GET(request: NextRequest) {
  const target = await completeOAuthCallback({
    code: request.nextUrl.searchParams.get("code"),
    providerErrorCode:
      request.nextUrl.searchParams.get("error_code") ?? request.nextUrl.searchParams.get("error"),
    next: request.nextUrl.searchParams.get("next"),
    returnTo: request.nextUrl.searchParams.get("returnTo"),
  });

  const origin = await getRequestOrigin();

  if (request.nextUrl.searchParams.get("popup") === "1") {
    const popupTarget = new URL("/auth/oauth-complete", origin);
    popupTarget.searchParams.set("target", target);
    return NextResponse.redirect(popupTarget);
  }

  return NextResponse.redirect(new URL(target, origin));
}

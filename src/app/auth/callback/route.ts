import { type NextRequest, NextResponse } from "next/server";
import { completeOAuthCallback } from "@/modules/auth/server/authenticate";

export async function GET(request: NextRequest) {
  const target = await completeOAuthCallback({
    code: request.nextUrl.searchParams.get("code"),
    providerErrorCode:
      request.nextUrl.searchParams.get("error_code") ?? request.nextUrl.searchParams.get("error"),
    next: request.nextUrl.searchParams.get("next"),
  });

  return NextResponse.redirect(new URL(target, request.url));
}

import { type NextRequest, NextResponse } from "next/server";
import { startGoogleOAuth } from "@/modules/auth/server/authenticate";

function redirectToAuthTarget(request: NextRequest, target: string) {
  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}

export async function GET(request: NextRequest) {
  const target = await startGoogleOAuth(request.nextUrl.searchParams.get("next"));
  return redirectToAuthTarget(request, target);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const target = await startGoogleOAuth(formData.get("next"));
  return redirectToAuthTarget(request, target);
}

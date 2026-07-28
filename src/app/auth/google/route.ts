import { type NextRequest, NextResponse } from "next/server";
import {
  getRequestOrigin,
  getSafeNextPath,
  withAuthErrorState,
} from "@/modules/auth/server/redirects";

function browserOnlyTarget(
  nextValue: FormDataEntryValue | string | null,
  returnToValue: FormDataEntryValue | string | null,
) {
  const next = getSafeNextPath(nextValue, "/account");
  const fallback = next.startsWith("/admin")
    ? `/auth/sign-in?next=${encodeURIComponent(next)}`
    : `/?auth=signin&next=${encodeURIComponent(next)}`;
  const returnTo = getSafeNextPath(returnToValue, fallback);
  return withAuthErrorState(returnTo, "oauth-start-failed", fallback);
}

async function redirectToAuthTarget(target: string) {
  const origin = await getRequestOrigin();
  return NextResponse.redirect(new URL(target, origin), { status: 303 });
}

export async function GET(request: NextRequest) {
  return redirectToAuthTarget(
    browserOnlyTarget(
      request.nextUrl.searchParams.get("next"),
      request.nextUrl.searchParams.get("returnTo"),
    ),
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return redirectToAuthTarget(browserOnlyTarget(formData.get("next"), formData.get("returnTo")));
}

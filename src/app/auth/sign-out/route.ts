import { type NextRequest, NextResponse } from "next/server";
import { endSession } from "@/modules/auth/server/authenticate";
import { getSafeNextPath, withAuthErrorPath } from "@/modules/auth/server/redirects";

// Sign-out mutates auth state, so it remains POST-only. A 303 redirect makes
// the browser follow with GET instead of replaying the POST.
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const next = getSafeNextPath(formData?.get("next") ?? null, "/auth/sign-in");
  const result = await endSession();
  const target = result.ok ? next : withAuthErrorPath(result.error.code, next);

  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}

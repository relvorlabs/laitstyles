import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/modules/auth/server/redirects";

// Sign-out mutates auth state, so it is POST-only: a GET handler here would let
// any prefetched link or crawler end the session. 303 makes the browser follow
// the redirect with GET instead of replaying the POST.
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const next = getSafeNextPath(formData?.get("next") ?? null, "/auth/sign-in");
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}

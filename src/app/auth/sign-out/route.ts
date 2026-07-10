import { type NextRequest, NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/auth/server/redirects";
import { createClient } from "@/lib/supabase/server";

async function signOut(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = request.method === "POST" ? await request.formData().catch(() => null) : null;
  const next = getSafeNextPath(
    formData?.get("next") ?? requestUrl.searchParams.get("next"),
    "/auth/sign-in",
  );
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(next, requestUrl));
}

export async function POST(request: NextRequest) {
  return signOut(request);
}

export async function GET(request: NextRequest) {
  return signOut(request);
}

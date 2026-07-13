import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { requireSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = requireSupabasePublicConfig();

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
}

export const updateSession = updateSupabaseSession;

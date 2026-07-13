import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const cookieStore = await cookies();
  const config = requireSupabasePublicConfig();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. The Phase 10 proxy hook will
          // own refresh writes once auth routes are activated.
        }
      },
    },
  });
}

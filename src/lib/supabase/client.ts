"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  const config = requireSupabasePublicConfig();

  browserClient = createBrowserClient<Database>(config.url, config.publishableKey);
  return browserClient;
}

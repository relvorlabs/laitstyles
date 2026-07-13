"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export function createClient() {
  const config = requireSupabasePublicConfig();

  return createBrowserClient<Database>(config.url, config.publishableKey);
}

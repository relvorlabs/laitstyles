"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  const config = requireSupabasePublicConfig();

  browserClient = createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}

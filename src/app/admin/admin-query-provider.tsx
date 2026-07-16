"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { createQueryClient } from "@/lib/query/create-query-client";

/**
 * Admin server-state boundary.
 *
 * One stable browser QueryClient is created per browser session with a lazy
 * `useState` initializer so React never recreates it across renders. This is a
 * client-only, browser-scoped client; a fresh per-request server QueryClient is
 * only introduced if SSR prefetch/hydration is added later.
 *
 * Domains are migrated onto this boundary one at a time. Until a domain's reads
 * are colocated as query options, it continues to use the deterministic in-memory
 * repository through `AdminRepositoryProvider`. No Supabase-backed adapter is
 * wired yet because generated types and RLS remain prerequisites.
 */
function createAdminQueryClient() {
  return createQueryClient({
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function AdminQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAdminQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

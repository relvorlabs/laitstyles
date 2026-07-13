"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

/**
 * Control Room server-state boundary (Phase 12).
 *
 * One stable browser QueryClient is created per browser session with a lazy
 * `useState` initializer so React never recreates it across renders. This is a
 * client-only, browser-scoped client; a fresh per-request server QueryClient is
 * only introduced if SSR prefetch/hydration is added later.
 *
 * Domains are migrated onto this boundary one at a time. Until a domain's reads
 * are colocated as query options, it continues to use the existing deterministic
 * in-memory repository through `ControlRoomRepositoryProvider`. No Supabase-backed
 * adapter is wired yet — that depends on the Phase 11 generated types and RLS,
 * which remain blocked.
 */
function createControlRoomQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prototype-safe defaults: cached data stays usable during background
        // refetch, and we do not retry deterministic in-memory reads.
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function ControlRoomQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createControlRoomQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

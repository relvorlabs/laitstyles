import type { QueryClient } from "@tanstack/react-query";
import { defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/create-query-client";

// Per-request QueryClient on the server, stable singleton in the browser — the
// official TanStack Query App Router hydration pattern. Never reuse a server
// client across requests. See docs/storefront-v2/04 §8.
export function makeQueryClient(): QueryClient {
  return createQueryClient({
    staleTime: 30_000,
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) || query.state.status === "pending",
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server: always a fresh client so requests never share cache.
    return makeQueryClient();
  }
  // Browser: reuse one client so React suspensions don't recreate it.
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

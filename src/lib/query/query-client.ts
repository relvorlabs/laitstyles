import { defaultShouldDehydrateQuery, isServer, QueryClient } from "@tanstack/react-query";

// Per-request QueryClient on the server, stable singleton in the browser — the
// official TanStack Query App Router hydration pattern. Never reuse a server
// client across requests. See docs/storefront-v2/04 §8.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Conservative default; per-domain stale times are set at the
        // query-options level (catalogue ~30s, PDP ~15s, cart 0, etc.).
        staleTime: 30_000,
      },
      dehydrate: {
        // Include still-pending queries so streamed prefetches hydrate.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
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

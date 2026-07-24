import type { QueryClient } from "@tanstack/react-query";
import { defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/create-query-client";

// One QueryClient contract for every route. The server still receives a fresh
// client per request, while the browser reuses one client for the app session.
export function makeQueryClient(): QueryClient {
  return createQueryClient({
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) || query.state.status === "pending",
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}

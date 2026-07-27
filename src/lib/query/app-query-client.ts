import type { QueryClient } from "@tanstack/react-query";
import { defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/create-query-client";

export const APP_QUERY_DEFAULTS = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export function makeAppQueryClient(): QueryClient {
  return createQueryClient({
    ...APP_QUERY_DEFAULTS,
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) || query.state.status === "pending",
  });
}

let browserQueryClient: QueryClient | undefined;

export function getAppQueryClient(): QueryClient {
  if (isServer) {
    return makeAppQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeAppQueryClient();
  }

  return browserQueryClient;
}

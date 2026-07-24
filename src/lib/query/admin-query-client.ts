import type { QueryClient } from "@tanstack/react-query";
import { defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/create-query-client";

export const ADMIN_QUERY_DEFAULTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export function makeAdminQueryClient(): QueryClient {
  return createQueryClient({
    ...ADMIN_QUERY_DEFAULTS,
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) || query.state.status === "pending",
  });
}

let browserQueryClient: QueryClient | undefined;

export function getAdminQueryClient(): QueryClient {
  if (isServer) {
    return makeAdminQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeAdminQueryClient();
  }

  return browserQueryClient;
}

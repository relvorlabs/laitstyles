import { defaultShouldDehydrateQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/create-query-client";

export const STOREFRONT_QUERY_DEFAULTS = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export function makeStorefrontQueryClient(): QueryClient {
  return createQueryClient({
    ...STOREFRONT_QUERY_DEFAULTS,
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) || query.state.status === "pending",
  });
}

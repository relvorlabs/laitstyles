import type { Query } from "@tanstack/react-query";
import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";

export interface CreateQueryClientOptions {
  /** Milliseconds before a query is considered stale. Required — no silent default. */
  staleTime: number;
  /** Defaults to TanStack's own default (3) if omitted. */
  retry?: number | false;
  /** Defaults to TanStack's own default (true) if omitted. */
  refetchOnWindowFocus?: boolean;
  /** Overrides the dehydrate predicate; omit to use TanStack's own default. */
  shouldDehydrateQuery?: (query: Query) => boolean;
}

export function createQueryClient(options: CreateQueryClientOptions): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: options.staleTime,
        ...(options.retry !== undefined ? { retry: options.retry } : {}),
        ...(options.refetchOnWindowFocus !== undefined
          ? { refetchOnWindowFocus: options.refetchOnWindowFocus }
          : {}),
      },
      ...(options.shouldDehydrateQuery
        ? { dehydrate: { shouldDehydrateQuery: options.shouldDehydrateQuery } }
        : {}),
    },
  });
}

export { defaultShouldDehydrateQuery };

# Phase 3 — Remote Cache and Invalidation Contract

This document fixes the cache rules that Phase 4 and later domain migrations must follow. It does
not migrate any current product, inventory or storefront consumer.

## Ownership

- Prisma remains the persistent source of truth.
- Server Components call domain server queries directly and use Next.js cache controls only when a
  real freshness and invalidation rule exists.
- TanStack Query owns remote browser cache on the admin surface.
- URL search parameters own navigable filters, sorting, pagination and search.
- Zustand and React context must not receive copies of TanStack Query business records.

## Admin QueryClient defaults

The admin-scoped QueryClient uses:

```text
staleTime: 30 seconds
gcTime: 5 minutes
retry: disabled globally
refetchOnWindowFocus: disabled
refetchOnReconnect: enabled
```

Global retries remain disabled because admin mutations and stock-sensitive reads require explicit,
domain-specific retry decisions. An idempotent read may opt into a bounded retry in its own hook.

Every query function must consume the `AbortSignal` supplied by TanStack Query and pass it to the
typed API client.

## Query keys

A query key includes every value that can change the result:

```text
domain + resource + identifier + filters + sort + page + pageSize
```

Do not create a key that omits a server-side filter or pagination input.

## Mutation completion order

After a successful mutation:

1. Prefer replacing the exact authoritative resource returned by the server.
2. Invalidate only lists or projections that can now be stale.
3. Await required invalidations before presenting the mutation as settled when the UI depends on
   the refreshed result.
4. Do not manually copy the same record into AdminStore, context or Zustand.

Optimistic updates require deterministic rollback and are not the default for inventory,
reservations, orders, payments, returns or unique-item ownership.

## Server cache invalidation

A domain command that changes server-cached reads must own its corresponding `revalidateTag` or
`revalidatePath` decision. Route Handlers and Server Actions may both call that command; they must
not duplicate the invalidation policy independently.

Cache tags are domain implementation details, not a second data owner.

## Polling

Polling is allowed only for genuinely asynchronous remote state with a documented interval, stop
condition, background/visibility behaviour and error strategy. Static catalogue, product,
category, settings and completed-order reads do not poll by default.

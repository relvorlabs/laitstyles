# Laitstyle Control Room V2 — Phase 12 TanStack Query Server-State Foundation

## Status

**Planned — deferred until after Phases 10 and 11.**

Some repository interfaces, in-memory adapters and initial query-key factories were already started when TanStack Query was the old Phase 9. That work is paused. Phase 12 must reconcile it against the Supabase Auth, organization permission, database and RLS contracts created in Phases 10 and 11.

## Goal

Create a replaceable, tested TanStack Query v5 server-state boundary over authenticated Supabase-backed resource contracts without pretending that prototype seed data is a production backend.

## Required prerequisites

- Phase 9 codebase/auth/data boundary review is complete.
- Phase 10 Supabase Auth, Google OAuth, staff roles and consumer auth are implemented.
- Phase 11 Supabase schema, storage, RLS policies and generated database types are implemented.
- The existing in-memory repository boundary has been reviewed for compatibility with the Supabase adapters.

## Core scope

- Install `@tanstack/react-query` with pnpm and regenerate `pnpm-lock.yaml`.
- Review TanStack Query's current lint recommendations. Because Phase 9 moved the repository to Biome, only add `@tanstack/eslint-plugin-query` as a narrow compatibility check if the team accepts a query-specific ESLint runner; do not restore repo-wide ESLint by default.
- Add Devtools only when development-only and excluded from production.
- Mount one stable browser QueryClient at the narrow Control Room boundary.
- Use a fresh per-request QueryClient only if server prefetch/hydration is introduced.
- Define domain query-key factories for Overview, Inventory, Products, Orders, Holds, Returns, Customers and Settings.
- Colocate query options, query functions and mutations with each domain.
- Read through Supabase-backed repositories or browser-safe API/RPC adapters, not seed arrays.
- Preserve URL state, dialog/sheet state, unsaved forms, local selection and theme outside the query cache.
- Add targeted invalidation and exact cache reconciliation.
- Use optimistic updates only for reversible low-conflict actions with cancellation, snapshot, rollback and settlement reconciliation.
- Keep stock, payment, refund, fulfilment and unique-item ownership operations pessimistic until concurrency safety is proven.
- Represent initial loading, error without data, empty, success, stale, background refetch, mutation pending and mutation error states.

## Explicit exclusions

- Fake API routes around local seed data.
- Artificial latency, random failures or fake background jobs.
- Persisted/offline query cache.
- Realtime subscriptions unless a later phase explicitly adds them.
- Cross-tab cache broadcast.
- Infinite scrolling without a real paginated contract.
- Replacing form, overlay, theme or other ephemeral UI state with TanStack Query.

## Structure

```text
src/app/admin/
  query-provider.tsx

src/features/control-room/inventory/data/
  inventory-keys.ts
  inventory-queries.ts
  inventory-mutations.ts

src/features/control-room/orders/data/
src/features/control-room/holds/data/
src/features/control-room/returns/data/
src/features/control-room/customers/data/
src/features/control-room/settings/data/
src/features/control-room/overview/data/

src/lib/control-room/data/
  repositories.ts
  repository-context.tsx
  in-memory/
  supabase/
```

## Acceptance criteria

- QueryClient lifecycle is stable and not recreated on every render.
- Query keys are typed, serializable and include every data-affecting input.
- Query functions and options are colocated with domain adapters.
- Migrated feature components do not import seed arrays directly.
- Queries run under the authenticated store or consumer context established by Supabase Auth and RLS.
- Migrated server-like data is not duplicated in the global Control Room client store.
- Existing cached data remains visible during background refetch.
- Mutations use exact cache updates or targeted invalidation instead of broad root invalidation.
- Every optimistic mutation has cancellation, previous-cache snapshot, rollback and reconciliation.
- Stock-, payment-, refund-, fulfilment- and ownership-sensitive mutations remain pessimistic unless the safety model is proven.
- Query-key, invalidation, rollback, provider lifecycle and state-boundary tests pass.
- Full Phase 4–12 regression passes.
- User-facing copy remains truthful about which data is production-backed and which flows remain prototype boundaries.

## Documentation handoff

Phase 12 must update:

- `docs/control-room-v2/progress.md`
- `docs/control-room-v2/decisions.md`
- the draft PR body
- production adapter notes for endpoint or Supabase repository methods
- invalidation matrix per mutation
- stale-time and retry policy per domain
- SSR/hydration decision notes

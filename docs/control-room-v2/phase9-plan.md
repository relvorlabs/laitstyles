# Laitstyle Control Room V2 — Phase 9 TanStack Query Server-State Foundation

## Status

**Batch 9A started — repository boundary and first typed query keys implemented; package and QueryClient installation pending.**

Phase 9 began under the user's explicit override after the compact Inventory gallery-card correction. Phase 8 remains implemented but unaccepted. Starting this phase does not mark any blocked Phase 4–8 check as passing.

The package/provider portion is intentionally not represented as complete. The current environment cannot safely regenerate the pnpm lockfile, and changing `package.json` without the matching lockfile would break the repository's frozen-lockfile install contract.

## Implemented Phase 9 foundation

- Added typed repository interfaces for Inventory, Orders, Holds, Returns, Customers, Settings and Overview.
- Added a deterministic Promise-based in-memory adapter.
- The adapter reads `ControlRoomStore.getSnapshot()` at call time rather than copying server-like records into a second global state container.
- Repository results are structured clones, preventing feature code from mutating the store by reference.
- Mounted one stable repository composition context at the existing Control Room provider boundary.
- Added tests proving repository isolation, live reads after writes, derived Overview consistency and missing-detail behavior.
- Added typed Inventory and Product key factories with normalized filter, pagination and stable-ID inputs.
- Added query-key tests for equivalent inputs, filter/page separation and detail/media identity.
- Added `docs/control-room-v2/phase9-adapter-boundary.md` for the future production adapter handoff.

## Refined implementation brief

Build a TanStack Query v5 server-state layer for the TypeScript and Next.js application. Model query keys around the Laitstyle product and operations domains, colocate query functions and query options with their domain repositories, and use mutations with targeted invalidation or safe optimistic updates. Represent loading, error, empty, stale and background-refetch states explicitly. Keep server-like records out of global client UI state.

There is no production server integration yet, so introduce a deterministic asynchronous repository contract and an in-memory development adapter that return Promises without artificial latency or network claims. The adapter exists only to prove replaceable server-state boundaries. It must be possible to replace it later with HTTP, RPC or another production data source without rewriting feature components or query keys.

## Architecture principles

### Server state versus client state

TanStack Query will own remote or server-like resource state:

- products and inventory records
- stock summaries and movements
- orders
- holds
- returns
- customers and relationship timelines
- store settings
- Overview snapshots derived from those resources

Local React state or focused providers may continue to own ephemeral UI state:

- whether a dialog or sheet is open
- active tab or step
- unsaved form values
- local selection before submission
- command-menu visibility
- theme preference

A global provider must not duplicate query data merely to make it convenient to access.

### Truthful prototype adapter

- Define repository interfaces by domain capability, not by current seed-file shape.
- Supply deterministic in-memory implementations backed by the existing typed records.
- Repository methods return Promises so the component contract matches future async integrations.
- Do not add `setTimeout`, random failure, random latency or fake background jobs as normal behavior.
- Error and stale-state tests use explicit test adapters or injected failure controls rather than random runtime behavior.
- Do not create internal API routes whose only purpose is to call the same in-memory seed data.
- User-facing copy must continue to state that changes are session-only until a real persistence adapter exists.

### Query-key design

Use one typed key factory per domain. Keys must describe the resource and all inputs that affect its result.

Example shape:

```ts
export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (filters: InventoryQuery) =>
    [...inventoryKeys.lists(), normaliseInventoryQuery(filters)] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (productId: string) =>
    [...inventoryKeys.details(), productId] as const,
};
```

Required domain factories:

- `overviewKeys`
- `inventoryKeys`
- `productKeys`
- `orderKeys`
- `holdKeys`
- `returnKeys`
- `customerKeys`
- `settingsKeys`

Rules:

- Query keys are arrays and serialisable.
- Filter, sort, saved-view and pagination inputs belong in list keys.
- Detail keys use stable business IDs.
- Key factories are the only source used by query options, invalidation and cache writes.
- Do not invalidate a root key when one targeted list or detail key is sufficient.

### Query functions and options

- Colocate repository calls, query options and key factories inside the relevant domain data folder.
- Prefer reusable `queryOptions` factories for list/detail queries.
- Accept an injected repository rather than importing a mutable singleton into every component.
- Normalise adapter errors into typed domain errors before they reach presentation components.
- Configure stale time intentionally per domain; do not copy one global value to every resource.
- Disable or tune retry for expected business errors that will not succeed by repetition.
- Expose `dataUpdatedAt`, `isFetching`, `isRefetching`, `isPending`, `isError` and stale context only where they improve an operator decision.

### Mutations and cache updates

Use the least risky strategy for each write:

1. exact cache replacement from a successful mutation response
2. targeted detail/list invalidation
3. optimistic update only for reversible, low-conflict actions

Safe candidates for optimistic updates may include:

- adding an internal customer note
- extending a hold when the adapter guarantees an immediate reversible result
- updating non-consequential local store preferences

Do not optimistically finalise operations with stock, payment or irreversible inventory consequences unless rollback and concurrency rules are proven:

- recording a sale
- fulfilling or cancelling an order
- releasing stock into availability
- completing a return or refund
- changing unique-item ownership

Every optimistic mutation must implement:

- query cancellation
- previous-cache snapshot
- deterministic optimistic value
- rollback on error
- targeted invalidation or reconciliation on settlement

## Locked scope

### Batch 9A — package, provider and repository boundary

Implemented:

- Typed domain repository contracts.
- Deterministic Promise-based in-memory adapter over the live current store.
- Stable repository provider at the Control Room boundary.
- Production adapter replacement documentation.
- First Inventory and Product key factories and tests.

Pending:

- Add `@tanstack/react-query` using the repository's pnpm package manager.
- Add `@tanstack/eslint-plugin-query` and configure the applicable recommended rules.
- Add React Query Devtools only when it is development-only and does not enter the production bundle; otherwise leave it out.
- Create a stable browser `QueryClient` provider at the narrow Control Room application boundary.
- Ensure a fresh per-request QueryClient is used if server prefetch or hydration is introduced.
- Define shared query defaults for stale time, garbage collection, retry and refetch behavior, then override by domain where necessary.
- Regenerate `package.json` and `pnpm-lock.yaml` together; never leave them inconsistent.

### Batch 9B — Inventory and product server-state migration

- Add colocated list, detail and media query options.
- Move Inventory list/detail reads from the global Control Room client store to TanStack Query.
- Keep URL filter and presentation state outside the query cache while including data-affecting filter values in query keys.
- Preserve grid, table and mobile parity.
- Preserve the shared media viewer.
- Add loading, error, empty, stale and background-refetch indicators without blanking previously useful data.
- Migrate product-editor writes through mutations and reconcile exact product/detail/list caches.
- Keep file previews and unsaved form values local to the editor.

### Batch 9C — Sales, customers, settings and Overview migration

- Add Orders, Holds, Returns, Customers, Settings and Overview key factories and query options.
- Move domain reads from the global data provider into query-backed hooks.
- Keep dialog/sheet state and form state local.
- Connect Overview queries to the same underlying repository records rather than a duplicate Overview seed response.
- Use parallel queries or composed repository methods to avoid sequential client waterfalls.
- Preserve existing cross-domain invariants and typed Result errors.
- Ensure customer timelines and Overview metrics update after connected writes.

### Batch 9D — mutations, invalidation and optimistic behavior

- Create one mutation hook per business action rather than one universal mutation dispatcher.
- Map each mutation to an explicit invalidation/cache-update matrix.
- Use mutation responses to update exact detail caches when authoritative data is available.
- Invalidate only affected lists, summaries and related details.
- Add safe optimistic updates for approved reversible actions.
- Add rollback and concurrent-mutation tests.
- Prevent duplicate submissions and expose contextual pending feedback.
- Do not use optimistic completion for stock- or payment-sensitive actions without a proven rollback and concurrency model.

### Batch 9E — server-state experience, testing and handoff

- Add reusable server-state boundaries for initial loading, recoverable error, empty result and stale-data notice.
- Distinguish first load from background refetch so existing data remains usable.
- Add manual retry where it is meaningful.
- Add a development-only stale-data/testing adapter or deterministic test controls; do not expose fake failure controls in production UI.
- Test query-key stability and filter separation.
- Test targeted invalidation and absence of unrelated invalidation.
- Test optimistic rollback and mutation reconciliation.
- Test provider lifecycle and cache isolation between test cases.
- Test that global UI state no longer duplicates migrated server records.
- Add browser checks for loading, error, empty, stale and background-refetch states.
- Document production adapter requirements, authentication context, SSR/hydration choices and unresolved backend contracts.

## Structure

```text
src/app/admin/
  query-provider.tsx

src/lib/control-room/data/
  repositories.ts
  repository-context.tsx
  in-memory/
    control-room-repositories.ts

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
```

The exact folders may adapt to existing feature boundaries, but query keys, query functions and mutations must remain colocated by domain rather than accumulating in a global `queries.ts` file.

## State requirements

Every migrated server-state screen must distinguish:

- **initial loading** — no usable cached data yet
- **error without data** — recoverable route/section failure
- **empty** — successful response containing no records
- **success** — usable current data
- **stale** — usable data beyond its freshness policy
- **background refetch** — usable data remains visible while refresh occurs
- **mutation pending** — the affected action is visibly in progress
- **mutation error** — contextual failure with preserved operator input where relevant

Do not replace previously visible data with a full skeleton during background refetch.

## Next.js integration rules

- The QueryClient provider is a Client Component, but route composition remains server-first where practical.
- Do not convert every Admin page into a page-wide Client Component merely to access queries.
- Use server prefetch plus `HydrationBoundary` only where it produces a real first-load benefit.
- If hydration is added, create a new QueryClient per server request and a stable browser QueryClient for the client lifecycle.
- Do not use Server Actions as query functions. Future client queries should call a browser-safe API/RPC adapter; Server Actions may be considered for mutations where appropriate.
- Avoid duplicated fetching between a Server Component and an immediately mounted client query unless hydration intentionally shares the result.

## Explicit exclusions

- A real production backend, database or API.
- Fake API routes around local seed arrays.
- Authentication, authorization or multi-user cache partitioning.
- Production persistence across refresh.
- Websocket, SSE or realtime synchronization.
- Offline mutation queues.
- Cross-tab cache broadcast.
- Persisted query cache.
- Infinite scrolling unless a real paginated contract exists.
- Replacing local form state, theme state or overlay state with TanStack Query.

## Acceptance criteria

- `@tanstack/react-query` is installed and provided through one stable Control Room boundary.
- The QueryClient is not recreated on every render.
- Every migrated domain has typed, serialisable query-key factories.
- Query functions and options are colocated with their domain adapter.
- Feature components do not import seed arrays directly after their domain is migrated.
- Migrated server-like data is no longer duplicated in a global client store.
- URL and ephemeral UI state remain outside the query cache.
- Loading, error, empty, stale and background-refetch states are visibly distinct.
- Existing data remains usable during background refetch.
- Mutations use exact cache updates or targeted invalidation rather than broad indiscriminate resets.
- Every optimistic mutation has cancellation, snapshot, rollback and reconciliation.
- Stock-, payment- and ownership-sensitive mutations remain pessimistic unless their safety model is proven.
- Overview, Customers, Orders and Inventory reconcile after connected writes.
- Query-key, invalidation, rollback and state-boundary tests pass.
- Existing business invariants and Phase 4–8 browser flows do not regress.
- User-facing copy remains truthful that the in-memory adapter is session-only.
- Phase 9 remains unaccepted until lint, TypeScript, tests, build, React Doctor and browser validation pass.

## Required documentation

Phase 9 must leave a production integration handoff describing:

- repository methods that need real endpoints
- expected request and response types
- authentication and tenant context
- concurrency/version requirements for stock-sensitive writes
- recommended stale-time policy per domain
- invalidation matrix per mutation
- SSR/hydration decisions
- unresolved production error and retry policy

## Gate

Phase 9 is complete only when the server-state architecture is proven by tests and browser states, migrated records are removed from duplicate global client state, and the full Phase 4–9 regression gate passes. The absence of a production backend is not permission to claim persistence or network guarantees.

# Phase 5 — Admin Dummy Domain Cutover Status

**Branch:** `refactor/phase-5-admin-dummy-domain-cutover`  
**Base merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Predecessor pull request:** #41  
**Phase status:** Bootstrap complete; domain implementation not started  
**UI contract:** No intentional redesign

## Predecessor truth

Phase 4 source implementation was squash-merged as `646ad2942ec2afbdb42e5269bad6d1993b01444b` after the repository owner explicitly requested the merge.

Its exact-head validation remained unavailable at merge time:

```text
Implementation Quality: 30150645155
Playwright UI Contract: 30150645124
```

Both runs were queued before step execution and had no logs or retained artifacts. Phase 5 preserves that as validation debt. A queued, skipped, cancelled or unavailable check is not passing evidence.

## Phase goal

Remove every remaining production admin dependency on seeded or in-memory business data while preserving the existing admin UI, routes, interactions and responsive behaviour.

The completion gate is:

> No production admin screen, hook, provider, repository or mutation reads or writes business records through `activeAdminSeed`, `AdminStore`, `createInMemoryAdminRepositories`, reducer-only persistence or `Promise.resolve` wrappers around local state.

Test fixtures, factories, stories, seed scripts and explicit development fixtures may remain in-memory.

## Current runtime chain

The current production admin path still begins with a complete seeded business snapshot:

```text
src/app/admin/layout.tsx
  -> activeAdminSeed
  -> AdminShell(initialState)
  -> AdminProvider
  -> createAdminStore(initialState)
  -> AdminRepositoryProvider
  -> createInMemoryAdminRepositories(store)
  -> TanStack Query wrappers or useAdmin mutations
  -> reducer-updated browser memory
```

Concrete ownership still present at bootstrap:

- `src/app/admin/layout.tsx` imports `activeAdminSeed` and injects it into the client admin shell;
- `src/features/admin/shell/admin-shell.tsx` wraps all admin routes in `AdminProvider`;
- `src/features/admin/state/admin-provider.tsx` exposes `AdminStore` and nests `AdminRepositoryProvider`;
- `src/features/admin/state/admin-store.ts` owns local mutations for orders, holds, returns, customers, settings and offline sales;
- `src/features/admin/data/admin-repository-context.tsx` constructs `createInMemoryAdminRepositories(store)`;
- `src/lib/admin/data/in-memory/admin-repositories.ts` exposes asynchronous-looking reads through `Promise.resolve` over the browser store;
- domain query-option files read through `AdminRepositories` rather than Prisma-backed module clients;
- domain mutation hooks call `useAdmin()` and wrap synchronous reducers in `Promise.resolve`.

## Remaining runtime dummy domains

### Customers

Current local ownership:

- customer lists and details from `AdminState.customers`;
- customer profile hydration from seed data;
- customer note creation through a reducer;
- customer query cache updated manually after the reducer mutation.

Persistent tables already exist for customers, addresses, notes and saved products.

### Orders and offline sales

Current local ownership:

- order lists and details from `AdminState.orders`;
- fulfilment transitions through the order reducer;
- offline sale creation through the offline-sale reducer;
- stock, customer and overview effects coordinated only through local state and manual cache invalidation.

Persistent order, order-line, timeline, payment-event, payment and delivery relations already exist.

### Holds

Current local ownership:

- hold lists and details from `AdminState.holds`;
- extend, release and convert operations through reducers;
- overview invalidation without durable transactional proof.

The persistent `holds` table already relates customers, products, variants, orders and stock movements.

### Returns

Current local ownership:

- return lists and details from `AdminState.returns`;
- return creation and transitions through reducers;
- stock and overview effects represented in browser state.

Persistent return and return-line structures already exist and relate back to purchased order lines.

### Store settings

Current local ownership:

- default settings created during AdminStore normalization;
- settings read from `AdminState.settings`;
- save performed through a reducer and manual QueryClient replacement.

The persistent `store_settings` model and updater relation already exist.

### Overview

Current local ownership:

- overview metrics derived from the complete seeded `AdminState` through selectors;
- reporting date, sales pulse, activities, open orders, attention, fulfilment and inventory watch supplied from local state.

Overview must migrate last because it projects products, inventory, customers, orders, holds, returns, activities and settings.

## Approved migration order

The domains will move one at a time in dependency order:

1. Customers
2. Orders and offline sales
3. Holds
4. Returns
5. Store settings
6. Overview
7. Admin seed/store/repository deletion

Products and Inventory remain owned by their Phase 4 modules and must not be reimplemented during Phase 5.

## Target data flow

Interactive admin reads and mutations:

```text
Client Component
  -> TanStack Query
  -> typed domain API client
  -> /api/v1/admin/** Route Handler
  -> authenticated domain query or command
  -> Prisma
```

Server-rendered admin reads, where appropriate:

```text
Server Component
  -> authenticated domain server query
  -> Prisma
```

Prohibited:

```text
Client
  -> TanStack Query
  -> AdminRepositories
  -> AdminStore
  -> seeded array
```

```text
Client mutation
  -> Promise.resolve(local reducer)
```

## Task matrix

| ID | Approved task | Status |
| --- | --- | --- |
| P5-T01 | Record the Phase 4 merge and unresolved validation debt | Complete |
| P5-T02 | Freeze the current seed, provider, repository, query and mutation source map | Complete |
| P5-T03 | Create the Customers module with Prisma list/detail/note operations, versioned API, typed client and TanStack hooks | Not started |
| P5-T04 | Cut Customers UI consumers from AdminRepositories/AdminStore without UI changes | Not started |
| P5-T05 | Create the Orders module with list/detail/timeline/status commands and database pagination | Not started |
| P5-T06 | Move offline-sale orchestration into an authenticated transaction that persists order, customer and stock effects | Not started |
| P5-T07 | Cut Orders and record-sale consumers from local reducers and manual server-record cache ownership | Not started |
| P5-T08 | Create the Holds module with list/detail/extend/release/convert operations and stock/order invariants | Not started |
| P5-T09 | Cut Holds consumers from local reducers | Not started |
| P5-T10 | Create the Returns module with list/detail/create/transition operations and stock/refund invariants | Not started |
| P5-T11 | Cut Returns consumers from local reducers | Not started |
| P5-T12 | Create the Settings module with persisted read/update operations | Not started |
| P5-T13 | Cut Settings consumers and remove runtime default-setting hydration | Not started |
| P5-T14 | Create the Overview module as a database-backed operational projection after dependent domains move | Not started |
| P5-T15 | Move list search, filtering, sorting and pagination through URL state, query keys, API requests and database queries | Not started |
| P5-T16 | Remove `AdminRepositories`, `createInMemoryAdminRepositories` and repository context after all consumers move | Not started |
| P5-T17 | Remove production `activeAdminSeed` injection and persistent business records/actions from AdminStore/AdminProvider | Not started |
| P5-T18 | Delete or reduce old `lib/admin/**` implementations to temporary export-only compatibility paths without duplicate logic | Not started |
| P5-T19 | Add architecture guards preventing production seed, in-memory repository and reducer-persistence imports | Not started |
| P5-T20 | Prove persistence, authorization, validation, errors, invalidation and reload parity with focused tests | Not started |
| P5-T21 | Pass static, database, unit, build, React Doctor, HTTP and desktop/tablet/mobile Playwright gates on the final head | Not started |
| P5-T22 | Reconcile inherited Phase 1–4 validation debt only with executed evidence | Not started |

## Domain completion rule

A domain is not complete merely because an API route exists.

Each domain must prove:

- list and detail reads come from Prisma;
- mutations persist and survive reload;
- staff authorization is enforced on the server;
- validation and stable API errors exist;
- TanStack Query invalidation matches the real cross-domain effects;
- no fallback silently restores seed or local reducer data;
- old production consumers are removed before legacy implementation is deleted;
- UI composition and interaction remain unchanged.

## UI preservation contract

Phase 5 must preserve the existing:

- admin header, sidebar, top bar and command menu;
- Overview composition and cards;
- Orders, Holds, Returns, Customers and Settings layouts;
- record-sale dialog and workflow;
- tables, grids, sheets, dialogs, forms, filters and buttons;
- typography, spacing, colours, themes, breakpoints and reduced-motion behaviour.

Changes to JSX or class names require a demonstrated data-boundary need. Architecture cleanup is not permission to redesign.

## Certification rule

Phase 5 must not be called complete, 10/10 or merge-ready until the final head executes and passes:

- architecture guard and Biome;
- TypeScript;
- Prisma validation, migrations and database-backed tests;
- unit, component, integration and API contract tests;
- production build;
- React Doctor;
- HTTP smoke;
- desktop, tablet and mobile Playwright UI contract;
- retained workflow artifacts;
- final review-thread reconciliation.

A queued, skipped, cancelled, superseded or unavailable workflow remains debt rather than evidence.

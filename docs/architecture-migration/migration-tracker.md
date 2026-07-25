# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Phase 2 merge:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Phase 3 merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Phase 4 merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Current branch:** `refactor/phase-5-admin-dummy-domain-cutover`  
**Current phase:** Phase 5 — Remove remaining admin dummy domains  
**Overall status:** Phase 5 bootstrap complete; domain implementation not started

Status values: `Not started`, `In progress`, `Blocked`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language, and permanent validation | Merged with debt | Implementation merged; final private source validation unresolved |
| 2 | Consolidate layouts and provider scope | Merged with debt | Source implementation merged; route and visual parity evidence unresolved |
| 3 | Create HTTP and domain-module foundation | Merged with debt | Source merged; final-head acceptance runs queued without execution at merge time |
| 4 | Cut over products and inventory | Merged with debt | Source merged; exact-head quality and Playwright runs did not start before merge |
| 5 | Remove remaining admin dummy domains | In progress | No runtime in-memory business data |
| 6 | Split storefront state and add Zustand | Not started | State ownership and UI parity |
| 7 | Consolidate authentication | Not started | Auth flow parity |
| 8 | Make checkout and payment server-authoritative | Not started | Idempotent settlement |
| 9 | Delete legacy architecture | Not started | No legacy imports |
| 10 | Final validation and release readiness | Not started | Full gates and visual parity |

## Phase 0 result

Phase 0 completed its evidence checklist and merged through PR #37.

```text
Playwright run: 30099471635
Result: 15 passed, 0 failed, 0 skipped, 0 errors
Artifact ID: 8599046423
Digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
```

The public deployment/source mismatch and excluded authenticated admin mutations remain recorded baseline limitations. They are not hidden passes.

## Phase 1 result

Phase 1 architecture and validation tasks P1-T01 through P1-T13 were squash-merged through PR #38 as `1ca1b184207ea2a36fa41c10162b8a059abe5289`.

The repository owner directed the merge while these private workflows remained queued for the then-unavailable runner:

```text
Implementation Quality: 30103043887
Playwright UI Contract: 30103043857
```

Phase 1 is therefore **Merged with debt**, not privately validated.

## Phase 2 result

Phase 2 source tasks P2-T01 through P2-T08 and P2-T10 were squash-merged through PR #39 as `558e34852f38f0982c7ce9d7c32422f09bbf8775`.

The repository owner directed the merge while these source-backed workflows remained queued:

```text
Implementation Quality: 30106477826
Playwright UI Contract: 30106477740
```

Phase 2 is therefore **Merged with debt**. P2-T09 route, auth, browser and visual parity validation remains unresolved.

The merged composition remains:

```text
RootLayout
  -> AppProvider
     -> ThemeProvider
     -> routes
     -> Toaster

AdminLayout
  -> staff access resolution
  -> QueryProvider
     -> AdminShell

src/app/(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> (home)                  /
     -> products                /products/**
     -> collections             /collections/**
     -> cart                    /cart
     -> checkout                /checkout
     -> order-confirmation      /order-confirmation
     -> account/layout.tsx
        -> AccountShell         /account/**
```

## Phase 3 result

Phase 3 source implementation tasks P3-T01 through P3-T12 were squash-merged through PR #40 as `d7e3149c96f234d7deb41151ac603d6f652ceb4d`.

Delivered contracts:

```text
Success: { data, meta? }
Error:   { error: { code, message, fieldErrors? } }
Page:    { page, pageSize, total, pageCount }
```

```text
src/modules/health/client/api.ts
  -> src/lib/http/client.ts
  -> GET /api/v1/health
  -> src/lib/http/server.ts
  -> src/modules/health/server/queries.ts
```

Phase 3 established typed HTTP transport, request validation, API authentication, staff capability and policy helpers, pagination, request correlation, structured error logging, admin QueryClient defaults and browser cancellation semantics.

Confirmed during repair work:

- database validation, migration deploy and migration status passed on the self-hosted runner;
- the complete Vitest suite reached 460 passing tests on an earlier Phase 3 head;
- the Prisma 7.8 runtime dependency and Docker-host PostgreSQL routing were repaired;
- permanent Implementation Quality and Playwright workflows were restored;
- no unresolved PR review threads remained.

Final-head acceptance was not executed before the repository owner directed the merge:

```text
Implementation Quality: 30118703848
Playwright UI Contract: 30118703866
```

Phase 3 is therefore **Merged with debt**, not complete or 10/10. Queued checks are not passing evidence.

## Phase 4 result

Phase 4 source implementation was squash-merged through PR #41 as `646ad2942ec2afbdb42e5269bad6d1993b01444b` after the repository owner explicitly directed the merge.

Detailed source and acceptance ledgers remain in:

- [`phase-4-implementation-report.md`](phase-4-implementation-report.md)
- [`phase-4-products-inventory-status.md`](phase-4-products-inventory-status.md)

Delivered source architecture:

- canonical Product definition, editor/mutation contracts, lifecycle, taxonomy, public DTO and public-read ownership under `src/modules/products/**`;
- canonical stock, movement, adjustment, committed-stock policy, summary and database-pagination ownership under `src/modules/inventory/**`;
- authenticated versioned product, taxonomy, inventory, movement and stock-adjustment APIs;
- typed product and inventory browser clients with TanStack Query ownership;
- removal of TanStack-to-Server-Action product and Inventory mutations;
- removal of the bespoke Inventory repository, production in-memory Inventory fallback and unversioned Inventory APIs;
- one public catalogue Prisma implementation under the Product module;
- export-only compatibility paths for the old catalogue, product-editor and storefront type locations;
- transactional stock adjustment with immutable movement and audit records.

The exact final-head workflows did not start before merge:

```text
Implementation Quality: 30150645155
Playwright UI Contract: 30150645124
```

All four quality jobs and all three browser jobs remained queued before step execution with no logs or artifacts. Phase 4 is therefore **Merged with debt**, not certified 10/10.

## Phase 5 bootstrap

The controlling status and source map are maintained in [`phase-5-admin-dummy-domain-status.md`](phase-5-admin-dummy-domain-status.md).

The remaining production dummy-data chain is:

```text
AdminLayout
  -> activeAdminSeed
  -> AdminShell(initialState)
  -> AdminProvider
  -> AdminStore
  -> AdminRepositoryProvider
  -> createInMemoryAdminRepositories
  -> local reducers and Promise.resolve wrappers
```

Remaining runtime domains:

1. Customers and notes
2. Orders and offline sales
3. Holds
4. Returns
5. Store settings
6. Overview projections

The approved dependency order is Customers → Orders/offline sales → Holds → Returns → Settings → Overview → deletion of the seed/store/repository layer.

| ID | Approved task | Status |
| --- | --- | --- |
| P5-T01 | Record Phase 4 merge and validation debt | Complete |
| P5-T02 | Freeze the current seed, provider, repository, query and mutation source map | Complete |
| P5-T03 | Migrate Customers reads and note mutations to a Prisma-backed module | Not started |
| P5-T04 | Migrate Orders, timelines, status transitions and offline sales | Not started |
| P5-T05 | Migrate Holds reads and extend/release/convert commands | Not started |
| P5-T06 | Migrate Returns reads, creation and transitions | Not started |
| P5-T07 | Migrate persisted Store settings | Not started |
| P5-T08 | Replace Overview selectors over AdminState with a database-backed projection | Not started |
| P5-T09 | Move list URL state through query keys, API requests and database pagination | Not started |
| P5-T10 | Remove AdminRepositories, in-memory repositories and repository context | Not started |
| P5-T11 | Remove activeAdminSeed and persistent business records/actions from AdminStore/AdminProvider | Not started |
| P5-T12 | Remove duplicate legacy implementations after all consumers move | Not started |
| P5-T13 | Add permanent guards against production seed and in-memory persistence | Not started |
| P5-T14 | Prove persistence, authorization, validation, invalidation and reload parity | Not started |
| P5-T15 | Pass final-head static, DB, test, build, React Doctor, HTTP and Playwright gates | Not started |

## Decision safeguards

- No phase intentionally redesigns the UI.
- Route Handlers do not call Server Actions.
- Server Components do not call internal APIs for their own reads.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- Product owns definition and CRUD; Inventory owns stock; catalogue is a read model.
- URL owns navigable filters, sorting, pagination and search.
- Zustand is limited to browser-owned shared state.
- Storefront and admin share domains, not unrestricted actions.
- Runtime arrays and reducers are not persistence abstractions.
- Queued, skipped, cancelled or unavailable checks remain debt rather than passes.

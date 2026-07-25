# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Phase 2 merge:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Phase 3 merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Current branch:** `refactor/phase-4-products-inventory-cutover`  
**Current phase:** Phase 4 — Products and inventory cutover  
**Overall status:** Source implementation complete; final-head certification pending

Status values: `Not started`, `In progress`, `Blocked`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language, and permanent validation | Merged with debt | Implementation merged; final private source validation unresolved |
| 2 | Consolidate layouts and provider scope | Merged with debt | Source implementation merged; route and visual parity evidence unresolved |
| 3 | Create HTTP and domain-module foundation | Merged with debt | Source merged; final-head acceptance runs queued without execution at merge time |
| 4 | Cut over products and inventory | In progress | Source complete; final static, database, runtime and visual evidence must execute |
| 5 | Remove remaining admin dummy domains | Not started | No runtime in-memory business data |
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

Phase 1 tasks P1-T01 through P1-T13 were implemented and squash-merged through PR #38 as `1ca1b184207ea2a36fa41c10162b8a059abe5289`.

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

## Phase 4 execution

The detailed implementation ledger is maintained in [`phase-4-implementation-report.md`](phase-4-implementation-report.md). The current acceptance state is maintained in [`phase-4-products-inventory-status.md`](phase-4-products-inventory-status.md).

Delivered source architecture:

- canonical product definition, lifecycle, taxonomy and public-read ownership under `src/modules/products/**`;
- canonical stock, stock movement, adjustment, summary and database-pagination ownership under `src/modules/inventory/**`;
- authenticated versioned product, taxonomy, inventory, movement and stock-adjustment APIs;
- typed product and inventory browser clients with TanStack Query ownership, including the stock-adjustment mutation and targeted invalidation;
- removal of TanStack-to-Server-Action mutations and the exact architecture exception;
- removal of the bespoke inventory repository, in-memory fallback and unversioned inventory APIs;
- one public catalogue Prisma implementation under the product module, with legacy server paths reduced to export-only compatibility shims;
- the shared loader, collection page and products page import the product module directly;
- the duplicate storefront product writer was deleted; runtime smoke uses the canonical `saveProduct` command;
- transactional stock adjustment records both an immutable stock movement and an audit event.

| ID | Approved task | Status |
| --- | --- | --- |
| P4-T01 | Record Phase 3 handoff and current products/inventory source map | Complete |
| P4-T02 | Define products and inventory module contracts from existing persisted operations | Complete |
| P4-T03 | Move product definition, lifecycle, taxonomy and public-read ownership into `src/modules/products/**` | Complete |
| P4-T04 | Move stock, stock movement and adjustment ownership into `src/modules/inventory/**` | Complete |
| P4-T05 | Add authenticated versioned product/inventory read endpoints using Phase 3 envelopes | Complete |
| P4-T06 | Replace bespoke browser reads with typed clients and TanStack Query options | Complete |
| P4-T07 | Add versioned mutation endpoints calling transport-neutral domain commands | Complete |
| P4-T08 | Remove TanStack-to-Server-Action mutations and the exact legacy exception | Complete |
| P4-T09 | Remove unversioned endpoints after consumers moved | Complete |
| P4-T10 | Prove persistence, authorization, validation, error and invalidation parity | Implemented; execution pending |
| P4-T11 | Run static, database, unit, build, React Doctor, HTTP and Playwright parity gates | Pending execution |
| P4-T12 | Reconcile outstanding Phase 3 validation debt when executed evidence exists | Pending execution |

## Decision safeguards

- No phase intentionally redesigns the UI.
- Route Handlers do not call Server Actions.
- Server Components do not call internal APIs for their own reads.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- Product owns definition and CRUD; inventory owns stock; catalogue is a read model.
- URL owns navigable filters, sorting, pagination and search.
- Zustand is limited to browser-owned shared state.
- Storefront and admin share domains, not unrestricted actions.
- Queued, skipped, cancelled or unavailable checks remain debt rather than passes.

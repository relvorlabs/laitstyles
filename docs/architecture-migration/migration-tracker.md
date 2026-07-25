# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Phase 2 merge:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Phase 3 merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Phase 4 merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Current branch:** `refactor/phase-5-admin-dummy-domain-cutover`  
**Current phase:** Phase 5 — Remove remaining admin dummy domains  
**Overall status:** Orders source cutover implemented; exact-head validation pending; Holds blocked

Status values: `Not started`, `In progress`, `Blocked`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language, and permanent validation | Merged with debt | Implementation merged; final private source validation unresolved |
| 2 | Consolidate layouts and provider scope | Merged with debt | Source implementation merged; route and visual parity evidence unresolved |
| 3 | Create HTTP and domain-module foundation | Merged with debt | Source merged; final-head acceptance runs queued without execution at merge time |
| 4 | Cut over products and inventory | Merged with debt | Source merged; exact-head quality and Playwright runs did not start before merge |
| 5 | Remove remaining admin dummy domains | In progress | Orders gates must pass before Holds; no runtime in-memory business data at completion |
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

## Phase 5 — Orders-first admin cutover

The controlling status and source maps are maintained in:

- [`phase-5-mission.md`](phase-5-mission.md)
- [`phase-5-admin-dummy-domain-status.md`](phase-5-admin-dummy-domain-status.md)

The owner-supplied architecture decision defines the dependency order:

1. Orders
2. Holds and reservations
3. Returns
4. Customers
5. Settings
6. Overview/reporting projections
7. deletion of the seed/store/repository layer

The earlier Customers-first bootstrap is superseded. Holds is blocked until the Orders final-head gates execute successfully.

### Current remaining global chain

```text
AdminLayout
  -> activeAdminSeed
  -> AdminShell(initialState)
  -> AdminProvider
  -> AdminStore
  -> AdminRepositoryProvider
  -> createInMemoryAdminRepositories
```

This chain still supports Holds, Returns, Customers, Settings and Overview. The Orders page, workspace, details, transitions and in-person checkout no longer use it.

### Orders implementation

The implemented source path is:

```text
Orders Client Component
  -> TanStack Query
  -> typed Orders API client
  -> /api/v1/admin/orders/**
  -> authenticated Orders query/command
  -> Prisma
```

Delivered source work includes:

- canonical Orders schemas, types, transition rules and self-contained read models;
- Prisma list/detail reads with database filtering, search, sort, saved-view counts, summaries and pagination;
- URL-owned view, search, channel, payment, sort, page, page size and selected order;
- authenticated list/detail/transition/in-person-sale APIs;
- typed clients, complete query keys and TanStack invalidation;
- removal of Orders page/workspace/record-sale mutation dependencies on seed, AdminStore and reducer persistence;
- exact available/reserved/committed/sold/returned stock transitions;
- focused architecture, Paystack and API tests.

### In-person Paystack sale decision

“Offline sale” means a customer and staff member are physically together. It does not mean cash, POS or an untracked/manual transfer.

```text
Admin selects product + customer
  -> validate all product/variant/quantity/price input before customer creation
  -> create pending Prisma order and Paystack attempt
  -> reserve exact stock against exact order ID
  -> initialize one-time Paystack Checkout server-side
  -> persist access code/reference/authorization result
  -> open InlineJS Checkout or recover through the authorization URL
```

Enforced rules:

- in-person channels only: physical store, pop-up, staff-assisted;
- customer email required;
- no cash/POS/manual transfer or client-declared paid/deposit state;
- strict transport rejects legacy payment fields;
- Checkout owns the enabled Paystack channel choice;
- popup completion is not authoritative;
- in-person Paystack orders cannot be manually moved to payment-confirmed;
- initialization failure compensates the exact draft and reservation;
- after Paystack creates a live transaction, later local reconciliation failure retains the reservation rather than releasing stock that may still be paid for;
- no broad time-window stock-movement relinking.

Phase 8 retains verification, signed webhook settlement, idempotency, reference/amount/currency checks, reserved-to-committed stock, committed-to-sold handoff, abandoned-checkout expiry and refund/reversal reconciliation.

### Phase 5 task ledger

| ID | Approved task | Source status | Evidence status |
| --- | --- | --- | --- |
| P5-T01 | Record Phase 4 merge and validation debt | Complete | Recorded |
| P5-T02 | Freeze the current seed/provider/repository/query/mutation map | Complete | Recorded |
| P5-T03 | Implement Orders module, API reads/commands and database pagination | Implemented | Awaiting exact-head execution |
| P5-T04 | Repair in-person sales with exact stock reservation and tracked Paystack attempt | Implemented | Awaiting exact-head execution |
| P5-T05 | Cut Orders page/workspace/record-sale mutation from legacy ownership | Implemented | Awaiting exact-head execution |
| P5-T06 | Implement Holds reads and extend/release/convert commands | Blocked | Requires successful Orders gates |
| P5-T07 | Cut Holds consumers from local reducers | Blocked | Requires Holds module |
| P5-T08 | Implement Returns reads, creation and transitions | Not started | Follows Holds |
| P5-T09 | Cut Returns consumers from local reducers | Not started | Follows Returns module |
| P5-T10 | Implement Customers reads/details/notes | Not started | Follows Returns |
| P5-T11 | Cut Customers consumers from legacy repositories | Not started | Follows Customer module |
| P5-T12 | Implement persisted Store settings | Not started | Follows Customers |
| P5-T13 | Cut Settings consumers/default hydration | Not started | Follows Settings module |
| P5-T14 | Replace Overview selectors with a database projection | Not started | Runs after dependencies |
| P5-T15 | Remove AdminRepositories/repository context | Not started | Runs after all consumers move |
| P5-T16 | Remove activeAdminSeed and persistent AdminStore records/actions | Not started | Runs after all consumers move |
| P5-T17 | Remove duplicate legacy implementations | Not started | Runs after consumer cutover |
| P5-T18 | Add permanent seed/in-memory/reducer guards | In progress | Orders guards added |
| P5-T19 | Prove persistence/auth/validation/error/invalidation/reload parity | In progress | Tests authored; final head not executed |
| P5-T20 | Pass static, DB, unit, build, React Doctor, HTTP and Playwright gates | Not complete | Exact-head evidence required |

## Decision safeguards

- No phase intentionally redesigns the UI, except an explicitly owner-requested functional UI change recorded in the phase mission.
- Route Handlers do not call Server Actions.
- Server Components do not call internal APIs for their own reads.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- Product owns definition and CRUD; Inventory owns stock; catalogue is a read model.
- URL owns navigable filters, sorting, pagination and search.
- Zustand is limited to browser-owned shared state.
- Storefront and admin share domains, not unrestricted actions.
- Runtime arrays and reducers are not persistence abstractions.
- Queued, skipped, cancelled, superseded or unavailable checks remain debt rather than passes.

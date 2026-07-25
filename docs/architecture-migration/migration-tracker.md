# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Phase 2 merge:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Phase 3 merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Phase 4 merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Current branch:** `refactor/phase-5-admin-dummy-domain-cutover`  
**Current phase:** Phase 5 — Remove remaining admin dummy domains  
**Overall status:** Orders blockers repaired and Holds source cut over; exact-head certification pending

Status values: `Not started`, `In progress`, `Blocked`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language and validation | Merged with debt | Final private source validation unresolved |
| 2 | Consolidate layouts and provider scope | Merged with debt | Route and visual parity debt recorded |
| 3 | Create HTTP and domain-module foundation | Merged with debt | Final-head workflows did not execute before merge |
| 4 | Cut over products and inventory | Merged with debt | Exact-head quality and Playwright runs did not execute before merge |
| 5 | Remove remaining admin dummy domains | In progress | Orders and Holds exact-head gates must pass before Returns |
| 6 | Split storefront state and add Zustand | Not started | State ownership and UI parity |
| 7 | Consolidate authentication | Not started | Auth flow parity |
| 8 | Make checkout and payment server-authoritative | Not started | Idempotent settlement |
| 9 | Delete legacy architecture | Not started | No legacy imports |
| 10 | Final validation and release readiness | Not started | Full gates and visual parity |

## Phase 0 result

Phase 0 merged through PR #37 with the recorded baseline evidence:

```text
Playwright run: 30099471635
Result: 15 passed, 0 failed, 0 skipped, 0 errors
Artifact ID: 8599046423
Digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
```

The public deployment/source mismatch and excluded authenticated admin mutations remain recorded baseline limitations.

## Phase 1 result

Phase 1 merged through PR #38 as `1ca1b184207ea2a36fa41c10162b8a059abe5289` while these workflows were queued:

```text
Implementation Quality: 30103043887
Playwright UI Contract: 30103043857
```

Phase 1 is **Merged with debt**, not privately validated.

## Phase 2 result

Phase 2 merged through PR #39 as `558e34852f38f0982c7ce9d7c32422f09bbf8775` while these workflows were queued:

```text
Implementation Quality: 30106477826
Playwright UI Contract: 30106477740
```

The merged provider/layout composition remains one root layout, one storefront route-group layout and one admin layout with QueryProvider scoped to admin. Phase 2 remains **Merged with debt** because route/auth/browser/visual parity evidence was unresolved.

## Phase 3 result

Phase 3 merged through PR #40 as `d7e3149c96f234d7deb41151ac603d6f652ceb4d`.

Delivered contracts:

```text
Success: { data, meta? }
Error:   { error: { code, message, fieldErrors? } }
Page:    { page, pageSize, total, pageCount }
```

It established typed HTTP transport, validation, API authentication, staff capabilities, pagination, request correlation, structured error logging, QueryClient defaults and cancellation semantics.

Earlier repair evidence reached database validation and 460 passing Vitest tests, but the final-head runs did not execute before merge:

```text
Implementation Quality: 30118703848
Playwright UI Contract: 30118703866
```

Phase 3 remains **Merged with debt**.

## Phase 4 result

Phase 4 merged through PR #41 as `646ad2942ec2afbdb42e5269bad6d1993b01444b`.

Detailed ledgers:

- [`phase-4-implementation-report.md`](phase-4-implementation-report.md)
- [`phase-4-products-inventory-status.md`](phase-4-products-inventory-status.md)

Delivered source architecture includes canonical Product and Inventory ownership, versioned APIs, typed clients, TanStack ownership, database pagination, transactional stock adjustments and removal of the production Inventory fallback and duplicate catalogue persistence.

The exact final-head workflows did not start before merge:

```text
Implementation Quality: 30150645155
Playwright UI Contract: 30150645124
```

Phase 4 remains **Merged with debt**, not certified 10/10.

## Phase 5 — Orders-first admin cutover

Controlling documents:

- [`phase-5-mission.md`](phase-5-mission.md)
- [`phase-5-admin-dummy-domain-status.md`](phase-5-admin-dummy-domain-status.md)

Dependency order:

1. Orders
2. Holds and reservations
3. Returns
4. Customers
5. Settings
6. Overview/reporting projections
7. deletion of the seed/store/repository layer

The repository owner explicitly directed implementation of the identified Orders repairs and Holds while Orders checks remained queued. This authorized source work only; it did not mark the acceptance gate passed.

### Remaining global compatibility chain

```text
AdminLayout
  -> activeAdminSeed
  -> AdminShell(initialState)
  -> AdminProvider
  -> AdminStore
  -> AdminRepositoryProvider
  -> createInMemoryAdminRepositories
```

This chain now serves Returns, Customers, Settings and Overview. Orders and Holds repositories and mutation actions were removed. The legacy aggregate snapshot still contains read-only order/hold records for the not-yet-migrated Overview projection; that compatibility debt is removed with Overview.

### Orders status

```text
Orders Client Component
  -> TanStack Query
  -> typed Orders API client
  -> /api/v1/admin/orders/**
  -> authenticated Orders query/command
  -> Prisma
```

Implemented and repaired:

- canonical Orders schemas, types, rules and read models;
- Prisma list/detail reads with database filtering, search, sort, summaries and pagination;
- URL-owned navigation/query state;
- authenticated list/detail/transition/offline-sale/sale-customer APIs;
- persisted Paystack-ready customer options;
- exact pending-order and reservation linkage for in-person Paystack checkout;
- no browser-authoritative payment status;
- pre-delivery returns prohibited;
- delivery/cancellation stock transitions corrected;
- distinct concurrent stock conflicts;
- hold and quantity metadata retained through HTTP;
- reducer-backed Orders mutations and order/offline-sale reducers deleted;
- one shared admin pagination component.

Phase 8 retains Paystack verification, signed webhook settlement, idempotency and final reserved/committed/sold reconciliation.

### Holds status

```text
Holds Client Component
  -> TanStack Query
  -> typed Holds API client
  -> /api/v1/admin/holds/**
  -> authenticated Holds query/command
  -> Prisma
```

Implemented:

- canonical Holds schemas, types and read models;
- Prisma list/detail reads with database filters, search, sort, summaries and pagination;
- exact UUID hold search and URL-owned query state;
- authenticated list/detail/extend/release/convert APIs;
- transactional expiry extension and audit;
- exact reserved-stock release;
- pending-payment conversion that preserves the reservation;
- no manual paid/cash/POS/transfer control;
- UI table, mobile cards, detail sheet and dialogs cut from AdminState joins;
- legacy Holds repositories, query wrappers, mutations and reducer deleted.

### Phase 5 task ledger

| ID | Approved task | Source status | Evidence status |
| --- | --- | --- | --- |
| P5-T01 | Record Phase 4 merge and validation debt | Complete | Recorded |
| P5-T02 | Freeze seed/provider/repository/query/mutation map | Complete | Recorded |
| P5-T03 | Implement Orders module, APIs and database pagination | Implemented | Awaiting exact-head execution |
| P5-T04 | Repair in-person Paystack sale and exact reservation | Implemented and repaired | Awaiting exact-head execution |
| P5-T05 | Cut Orders consumers from legacy ownership | Implemented | Awaiting exact-head execution |
| P5-T06 | Implement Holds reads and transactional commands | Implemented | Awaiting exact-head execution |
| P5-T07 | Cut Holds consumers from local reducers/repositories | Implemented | Awaiting exact-head execution |
| P5-T08 | Implement Returns reads, creation and transitions | Not started | Locked until current gates pass |
| P5-T09 | Cut Returns consumers from local reducers | Not started | Follows Returns module |
| P5-T10 | Implement Customers reads/details/notes | Not started | Follows Returns |
| P5-T11 | Cut Customers consumers from legacy repositories | Not started | Follows Customers module |
| P5-T12 | Implement persisted Store settings | Not started | Follows Customers |
| P5-T13 | Cut Settings consumers/default hydration | Not started | Follows Settings module |
| P5-T14 | Replace Overview selectors with database projections | Not started | Runs after dependencies |
| P5-T15 | Remove remaining AdminRepositories/context | In progress | Orders/Holds entries removed |
| P5-T16 | Remove activeAdminSeed and persistent AdminStore records/actions | In progress | Orders/Holds actions removed; Overview snapshot debt remains |
| P5-T17 | Remove duplicate legacy implementations | In progress | Orders/Holds duplicates deleted |
| P5-T18 | Add permanent seed/in-memory/reducer guards | In progress | Orders/Holds guards authored |
| P5-T19 | Prove persistence/auth/error/invalidation/reload parity | In progress | Tests authored; execution pending |
| P5-T20 | Pass static, DB, unit, build, React Doctor, HTTP and Playwright gates | Not complete | Exact-head evidence required |

## Decision safeguards

- UI remains unchanged except owner-approved functional payment controls.
- Route Handlers do not call Server Actions.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- URL owns navigable filters, sorting, pagination and search.
- Runtime arrays and reducers are not persistence abstractions.
- Queued, skipped, cancelled, superseded or unavailable checks remain debt rather than passes.

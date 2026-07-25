# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Phase 2 merge:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Phase 3 merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Phase 4 merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Current branch:** `refactor/phase-5-admin-dummy-domain-cutover`  
**Current phase:** Phase 5 — Remove remaining admin dummy domains  
**Overall status:** Phase 5 source scope implemented; exact-head certification pending

Status values: `Not started`, `In progress`, `Source complete`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language and validation | Merged with debt | Final private source validation unresolved |
| 2 | Consolidate layouts and provider scope | Merged with debt | Route and visual parity debt recorded |
| 3 | Create HTTP and domain-module foundation | Merged with debt | Final-head workflows did not execute before merge |
| 4 | Cut over products and inventory | Merged with debt | Exact-head workflows did not execute before merge |
| 5 | Remove remaining admin dummy domains | Source complete | Exact-head static, DB, runtime and visual evidence required |
| 6 | Split storefront state and add Zustand | Not started | State ownership and UI parity |
| 7 | Consolidate authentication | Not started | Auth flow parity |
| 8 | Make checkout and payment server-authoritative | Not started | Idempotent settlement |
| 9 | Delete remaining legacy architecture | Not started | No undocumented legacy imports |
| 10 | Final validation and release readiness | Not started | Full gates and visual parity |

## Historical evidence state

### Phase 0

Phase 0 merged through PR #37 with recorded baseline evidence:

```text
Playwright run: 30099471635
Result: 15 passed, 0 failed, 0 skipped, 0 errors
Artifact ID: 8599046423
Digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
```

### Phase 1

Phase 1 merged through PR #38 while its final workflows remained queued:

```text
Implementation Quality: 30103043887
Playwright UI Contract: 30103043857
```

Phase 1 remains **Merged with debt**.

### Phase 2

Phase 2 merged through PR #39 while its final workflows remained queued:

```text
Implementation Quality: 30106477826
Playwright UI Contract: 30106477740
```

Phase 2 remains **Merged with debt**.

### Phase 3

Phase 3 merged through PR #40. Earlier repair evidence reached database validation and 460 passing Vitest tests, but final-head workflows did not execute before merge:

```text
Implementation Quality: 30118703848
Playwright UI Contract: 30118703866
```

Phase 3 remains **Merged with debt**.

### Phase 4

Phase 4 merged through PR #41. It delivered canonical Product and Inventory ownership, versioned APIs, typed clients, TanStack ownership, database pagination, transactional stock adjustments and duplicate persistence removal.

Final-head workflows did not execute before merge:

```text
Implementation Quality: 30150645155
Playwright UI Contract: 30150645124
```

Phase 4 remains **Merged with debt**.

## Phase 5 result

Controlling documents:

- [`phase-5-mission.md`](phase-5-mission.md)
- [`phase-5-admin-dummy-domain-status.md`](phase-5-admin-dummy-domain-status.md)

Approved dependency order:

1. Orders
2. Holds and reservations
3. Returns
4. Customers
5. Settings
6. Overview/reporting projections
7. seed/store/repository deletion

Every source workstream in this order is implemented.

### Canonical runtime paths

```text
Orders UI    -> modules/orders/client    -> /api/v1/admin/orders/**    -> modules/orders/server    -> Prisma
Holds UI     -> modules/holds/client     -> /api/v1/admin/holds/**     -> modules/holds/server     -> Prisma
Returns UI   -> modules/returns/client   -> /api/v1/admin/returns/**   -> modules/returns/server   -> Prisma
Customers UI -> modules/customers/client -> /api/v1/admin/customers/** -> modules/customers/server -> Prisma
Settings UI  -> modules/settings/client  -> /api/v1/admin/settings     -> modules/settings/server  -> Prisma
Overview UI  -> modules/overview/client  -> /api/v1/admin/overview     -> modules/overview/server  -> Prisma
```

### Source outcomes

- Orders database reads, transitions and in-person Paystack initialization implemented and repaired.
- Holds database reads, expiry, release and pending-payment conversion implemented.
- Returns database reads, creation, transitions, stock disposition and refund accounting implemented.
- Customers database segmentation, relationship projection, detail and persisted notes implemented.
- Settings singleton and normalized delivery persistence implemented; first-read bootstrap is transaction-locked and idempotent.
- Overview database projections replace aggregate seed selectors.
- Admin command menu and record-sale consumers use canonical bounded queries.
- AdminStore, repository context, repository contracts and in-memory repository implementation are deleted.
- `activeAdminSeed`, `newStoreAdminSeed` and all physical `src/lib/admin/shared/seed/**` business records are deleted.
- Legacy reducer/query/mutation ownership for the migrated domains is deleted.
- One permanent Phase 5 architecture guard protects all migrated domains.
- Canonical route tests cover Returns, Customers, Settings and Overview.
- HTTP smoke covers the four new domain APIs.

### Phase 5 task ledger

| ID | Approved task | Source status | Evidence status |
| --- | --- | --- | --- |
| P5-T01 | Record Phase 4 merge and validation debt | Complete | Recorded |
| P5-T02 | Freeze legacy ownership map | Complete | Recorded |
| P5-T03 | Implement Orders module, APIs and database pagination | Complete | Exact-head execution pending |
| P5-T04 | Repair in-person Paystack sale and exact reservation | Complete | Exact-head execution pending |
| P5-T05 | Cut Orders consumers from legacy ownership | Complete | Exact-head execution pending |
| P5-T06 | Implement Holds reads and transactional commands | Complete | Exact-head execution pending |
| P5-T07 | Cut Holds consumers from reducers/repositories | Complete | Exact-head execution pending |
| P5-T08 | Implement Returns reads, creation and transitions | Complete | Exact-head execution pending |
| P5-T09 | Cut Returns consumers from reducers/repositories | Complete | Exact-head execution pending |
| P5-T10 | Implement Customer reads, details and notes | Complete | Exact-head execution pending |
| P5-T11 | Cut Customer consumers from legacy repositories | Complete | Exact-head execution pending |
| P5-T12 | Implement persisted Store settings | Complete | Exact-head execution pending |
| P5-T13 | Cut Settings consumers and browser defaults | Complete | Exact-head execution pending |
| P5-T14 | Replace Overview selectors with database projections | Complete | Exact-head execution pending |
| P5-T15 | Remove AdminRepositories/context | Complete | Guard execution pending |
| P5-T16 | Remove active seed and AdminStore business records | Complete | Guard execution pending |
| P5-T17 | Remove duplicate Phase 5 implementations | Complete | Guard execution pending |
| P5-T18 | Add permanent seed/store/repository/reducer guards | Complete | Test execution pending |
| P5-T19 | Add persistence/auth/error/invalidation/reload evidence | Source tests and HTTP smoke authored | DB/runtime execution pending |
| P5-T20 | Pass static, DB, tests, build, React Doctor, HTTP and Playwright | Requested | Exact-head runs required |

## Validation truth

Phase 5 is not certified until the exact final head executes and passes:

- architecture guard and Biome;
- TypeScript;
- Prisma validation, migration deployment/status and database integrity;
- unit, component, integration and API tests;
- production build;
- React Doctor;
- HTTP smoke;
- desktop, tablet and mobile Playwright contract;
- retained artifacts and review reconciliation.

Queued, cancelled, skipped, superseded or unavailable checks remain validation debt. PR #43 remains draft and unmerged until explicitly directed otherwise.

## Decision safeguards

- UI remains unchanged except the approved payment-control correction.
- Route Handlers do not call Server Actions.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- URL owns navigable filters, sorting, pagination and search.
- Production fixtures and reducer arrays are not persistence abstractions.
- Source implementation and executed certification are reported separately.

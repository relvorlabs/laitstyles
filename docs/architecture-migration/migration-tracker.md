# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Phase 2 merge:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Phase 3 merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Phase 4 merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Phase 5 merge:** `cd12b89e9ec2eb9210704e200e30731d864646e1`  
**Current branch:** `refactor/phase-6-storefront-state-zustand`  
**Current phase:** Phase 6 — Storefront state and Zustand migration  
**Overall status:** Phase 6 bootstrap complete; runtime implementation not started

Status values: `Not started`, `In progress`, `Source complete`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language and validation | Merged with debt | Final private source validation unresolved |
| 2 | Consolidate layouts and provider scope | Merged with debt | Route and visual parity debt recorded |
| 3 | Create HTTP and domain-module foundation | Merged with debt | Final-head workflows did not execute before merge |
| 4 | Cut over products and inventory | Merged with debt | Exact-head workflows did not execute before merge |
| 5 | Remove remaining admin dummy domains | Merged with debt | Source scope merged; exact-head gates did not execute |
| 6 | Split storefront state and add Zustand | In progress | State ownership, storage migration, hydration and UI parity |
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

Phase 5 was squash-merged through PR #43 as `cd12b89e9ec2eb9210704e200e30731d864646e1` at the repository owner’s explicit direction.

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

Every source workstream in this order was implemented before merge.

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

### Merge-time validation debt

The squash commit explicitly records that the exact Phase 5 head had no executed final evidence:

```text
Implementation Quality: 30164712987 — queued at merge
Playwright UI Contract: 30164712918 — queued at merge
```

Phase 5 is therefore **Merged with debt**, not exact-head certified.

## Phase 6 bootstrap

Controlling document:

- [`phase-6-storefront-state-status.md`](phase-6-storefront-state-status.md)

### Current runtime composition

```text
StorefrontRouteBoundary
  -> StorefrontClientBoundary
     -> StorefrontClientStateProvider
        -> StorefrontAuthProvider
           -> SiteChrome
              -> StorefrontProvider
                 -> SiteHeader / route / SiteFooter / StorefrontOverlays
```

### Confirmed ownership map

- `StorefrontClientStateProvider` owns persisted cart lines, saved IDs, local hold intents, hydration and the hold clock.
- `StorefrontProvider` owns complete shell product records plus broad catalogue, overlay, cart projection, viewer, search, measurement, newsletter, delivery and header state.
- `StorefrontAuthProvider` owns the session projection and auth-dialog state; Phase 7 retains auth transport consolidation.
- `ProductCatalogue` copies parsed URL filters into provider state and serializes provider changes back into the URL through synchronization effects.
- Zustand is not yet installed.

### Phase 6 target ownership

```text
cart.store.ts            -> cart browser intents and actions
saved-items.store.ts     -> saved product IDs and actions
storefront-ui.store.ts   -> genuinely shared browser UI state only
URL search parameters    -> catalogue filters, sort, search and page
local component state    -> viewer, quick view, forms, header scroll and temporary controls
Prisma/TanStack Query     -> persistent and remote business data
```

### Bootstrap outcomes

- Phase 6 branch created from the exact Phase 5 squash merge.
- Current provider, persistence and URL synchronization ownership recorded.
- Implementation sequence and rollback triggers documented.
- A non-expansion architecture test permits only the three approved store files.
- The guard blocks Zustand definitions outside `src/stores`, server imports, complete Product records and new storefront provider layers.
- No runtime state or UI behaviour has changed.
- No unused Zustand dependency has been added.

### Phase 6 task ledger

| ID | Approved task | Source status | Evidence status |
| --- | --- | --- | --- |
| P6-T00 | Record Phase 5 merge and validation debt | Complete | Recorded |
| P6-T00A | Map provider, persistence and URL ownership | Complete | Source-audited |
| P6-T00B | Add storefront-state non-expansion guard | Complete | Test execution pending |
| P6-T01 | Add Zustand | Not started | — |
| P6-T02 | Create cart store | Not started | — |
| P6-T03 | Create saved-items store | Not started | — |
| P6-T04 | Create storefront UI store | Not started | — |
| P6-T05 | Preserve versioned storage migration | Not started | — |
| P6-T06 | Add hydration-safe selectors | Not started | — |
| P6-T07 | Prevent complete product persistence | Guard authored | Execution pending |
| P6-T08 | Move catalogue filters to URL ownership | Not started | — |
| P6-T09 | Keep pagination in URL ownership | Existing server path; cutover audit pending | — |
| P6-T10 | Keep sorting in URL ownership | Compatibility sync remains | — |
| P6-T11 | Keep navigational search in URL ownership | Compatibility sync remains | — |
| P6-T12 | Remove URL/context synchronization effects | Not started | — |
| P6-T13 | Move image viewer state locally | Not started | — |
| P6-T14 | Move measurements to PDP boundary | Not started | — |
| P6-T15 | Move newsletter state locally | Not started | — |
| P6-T16 | Move delivery-estimate state locally | Not started | — |
| P6-T17 | Move header scroll state into header | Not started | — |
| P6-T18 | Separate auth-dialog local state | Not started; Phase 7 transport preserved | — |
| P6-T19 | Remove migrated values from StorefrontProvider | Not started | — |
| P6-T20 | Remove unused context selectors | Not started | — |
| P6-T21 | Delete final provider after last consumer | Not started | — |
| P6-T22 | Pass static, unit, build, React Doctor and browser gates | Not started | Exact-head evidence required |

## Phase 6 validation truth

Phase 6 is not complete until its exact final head executes and passes:

- storefront-state architecture guard and Biome;
- TypeScript;
- storage migration and hydration tests;
- cart, saved-items and URL-history unit/component tests;
- production build;
- React Doctor;
- storefront HTTP/server smoke where affected;
- desktop, tablet and mobile Playwright contract;
- light and dark visual comparison;
- retained artifacts and review reconciliation.

Queued, cancelled, skipped, superseded or unavailable checks remain validation debt.

## Decision safeguards

- UI remains unchanged unless a verified defect requires a correction.
- Zustand owns browser state only and never becomes a remote-data cache.
- Complete Product records are not persisted in Zustand.
- URL owns navigable filters, sorting, pagination and search.
- TanStack Query owns remote browser data; Prisma owns persistent data.
- Local state moves to the narrowest useful component boundary.
- Phase 6 does not absorb Phase 7 auth consolidation or Phase 8 payment settlement.
- Source implementation and executed certification are reported separately.

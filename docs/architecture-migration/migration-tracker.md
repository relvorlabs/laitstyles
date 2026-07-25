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
**Overall status:** Phase 6 architecture corrections implemented; dependency-lock repair and exact-head certification remain

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
| 6 | Split storefront state and add Zustand | In progress | Lockfile, runtime, storage, history and UI parity |
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

### Phase 5

Phase 5 was squash-merged through PR #43 as `cd12b89e9ec2eb9210704e200e30731d864646e1` at the repository owner’s explicit direction.

Source outcomes:

- Orders, Holds, Returns, Customers, Settings and Overview moved to Prisma-backed domain/API/TanStack paths.
- AdminStore business-record ownership was removed.
- Admin repository context, contracts and in-memory implementation were removed.
- Runtime seed and reducer ownership for migrated domains was removed.
- A permanent persistence boundary protects the migrated domains.

Merge-time validation debt:

```text
Implementation Quality: 30164712987 — queued at merge
Playwright UI Contract: 30164712918 — queued at merge
```

Phase 5 remains **Merged with debt**.

## Phase 6 current state

Controlling document:

- [`phase-6-storefront-state-status.md`](phase-6-storefront-state-status.md)

### Current runtime composition

```text
StorefrontRouteBoundary
  -> StorefrontClientBoundary
     -> StorefrontQueryProvider
        -> StorefrontStateHydrator
           -> StorefrontHoldClockBoundary
           -> StorefrontAuthProvider
              -> SiteChrome
                 -> SiteHeader / route / SiteFooter / StorefrontOverlays
           -> StorefrontAuthDialogHost
```

### Implemented ownership

- `cart.store.ts` owns minimal cart-line intents and actions.
- `saved-items.store.ts` owns saved product IDs and actions.
- `storefront-ui.store.ts` owns shared overlay identity, recent IDs, utility dismissal and non-authoritative hold intents.
- One `StorefrontHoldClockBoundary` serves all mounted countdown consumers and expires stale hold intents.
- The storefront catalogue remains TanStack-backed and is not copied into Zustand.
- `STOREFRONT_QUERY_DEFAULTS` is the single storefront cache-policy definition.
- The hydration boundary preserves the version-3 cart/saved/hold migration and persists minimal identifiers only.
- Catalogue filters, sorting, search, quick links, chip removal and pagination mutate the URL through `useCatalogueNavigation()` only.
- Quick view, image viewer, auth and Zustand overlays transition through one coordinator so they cannot remain stacked.
- Product catalogue contracts and projection code are owned by the Products module.
- The public client and API contract uses British `catalogue` naming throughout.
- The original cart empty-state copy and storefront presentation contract are preserved.
- `StorefrontProvider` and `StorefrontClientStateProvider` are deleted.
- Architecture tests reject retired providers, American catalogue paths/symbols, duplicate router ownership and reversed server dependencies.
- Focused store, clock, overlay, catalogue-projection, API and Playwright contracts are authored.

### Confirmed dependency blocker

`package.json` declares `zustand@^5.0.14`, but `pnpm-lock.yaml` does not contain a Zustand importer entry or package snapshot.

The repository installs dependencies with:

```bash
pnpm install --frozen-lockfile
```

The lockfile must be regenerated with pnpm 11.13.0 and committed without unrelated dependency drift. Frozen-lockfile enforcement must remain enabled, and the lockfile must not be fabricated manually.

### Phase 6 task ledger

| ID | Approved task | Source status | Evidence status |
| --- | --- | --- | --- |
| P6-T00 | Record Phase 5 merge and validation debt | Complete | Recorded |
| P6-T00A | Map original provider, persistence and URL ownership | Complete | Source-audited |
| P6-T00B | Add storefront-state non-expansion guards | Complete | Execution pending |
| P6-T01 | Add Zustand | Blocked | Package declared; lockfile not reconciled |
| P6-T02 | Create cart store | Source complete | Unit execution pending |
| P6-T03 | Create saved-items store | Source complete | Unit execution pending |
| P6-T04 | Create storefront UI store | Source complete | Unit execution pending |
| P6-T05 | Preserve versioned storage migration | Source complete | Migration/hydration execution pending |
| P6-T06 | Add hydration-safe selectors | Source complete | Runtime execution pending |
| P6-T07 | Prevent complete product persistence | Source complete | Guard/browser execution pending |
| P6-T08 | Move catalogue filters to URL ownership | Source complete | Browser execution pending |
| P6-T09 | Keep pagination in URL ownership | Source complete | Browser execution pending |
| P6-T10 | Keep sorting in URL ownership | Source complete | Browser execution pending |
| P6-T11 | Keep navigational search in URL ownership | Source complete | Browser execution pending |
| P6-T12 | Remove URL/context synchronisation effects | Source complete | Architecture/browser execution pending |
| P6-T13 | Move image viewer state locally | Source complete | Browser execution pending |
| P6-T14 | Move measurement state to narrow shared boundary | Source complete | Browser execution pending |
| P6-T15 | Move newsletter state locally | Source complete | Browser execution pending |
| P6-T16 | Move delivery-estimate state locally | Source complete | Browser execution pending |
| P6-T17 | Move header scroll state into header | Source complete | Browser execution pending |
| P6-T18 | Separate auth-dialog local state | Source complete | Auth/browser execution pending |
| P6-T19 | Remove migrated values from `StorefrontProvider` | Complete | Provider deleted |
| P6-T20 | Remove unused context selectors and consumers | Source complete | TypeScript/guard execution pending |
| P6-T21 | Delete final legacy provider after consumer cutover | Complete | Both providers deleted |
| P6-T22 | Pass static, unit, build, React Doctor and browser gates | Pending | Exact-head evidence required |

### Exact-head evidence state

The PR workflows remain queued or pending. Queued, cancelled, skipped, superseded or unavailable checks remain validation debt and are never reported as passes.

## Phase 6 remaining order

1. Regenerate and commit the pnpm 11.13.0 lockfile with Zustand.
2. Prove frozen installation on the resulting exact head.
3. Run architecture guards, Biome and TypeScript.
4. Run focused and full Vitest suites.
5. Run production build and React Doctor.
6. Run desktop, tablet and mobile Playwright plus light/dark visual comparison.
7. Inspect artifacts, logs, traces and screenshots.
8. Repair only evidenced failures.
9. Reconcile the final task ledger, PR body and review state.

## Decision safeguards

- UI remains unchanged unless a verified defect requires correction.
- Zustand owns browser state only and never becomes a remote-data cache.
- Complete Product records are not persisted in Zustand.
- URL owns navigable filters, sorting, pagination and search.
- TanStack Query owns remote browser data; Prisma owns persistent data.
- Local state moves to the narrowest useful component boundary.
- Phase 6 does not absorb Phase 7 auth consolidation or Phase 8 payment settlement.
- Source implementation and executed certification are reported separately.

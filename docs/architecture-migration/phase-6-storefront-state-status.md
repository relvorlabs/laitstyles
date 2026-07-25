# Phase 6 — Storefront State and Zustand Migration Status

**Branch:** `refactor/phase-6-storefront-state-zustand`  
**Base merge:** `cd12b89e9ec2eb9210704e200e30731d864646e1`  
**Pull request:** #45  
**Current workstream:** dependency-lock repair and exact-head certification  
**Phase status:** architecture corrections implemented; runtime certification blocked  
**UI contract:** preserve the storefront shell, homepage, product cards, catalogue, PDP, cart, checkout, account surfaces, themes, typography, spacing, overlays and responsive behaviour.

## Authority

Phase 6 follows this ownership contract:

| State | Owner |
| --- | --- |
| Persistent business data | Prisma |
| Remote browser cache | TanStack Query |
| Navigable filters, sort, search and pagination | URL search parameters |
| Shared browser-owned state | Focused Zustand stores |
| Component-local interaction state | `useState` or a narrow local reducer |
| Authentication and permissions | Server session and policy |

Zustand must not become a second cache for products, inventory, orders, customers, payments or permissions.

## Current runtime composition

```text
app/(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> loadStorefrontShellCatalogue()
     -> getCurrentSession()
     -> StorefrontClientBoundary
        -> StorefrontQueryProvider
           -> StorefrontStateHydrator
              -> StorefrontHoldClockBoundary
              -> StorefrontAuthProvider
                 -> SiteChrome
                    -> SiteHeader
                    -> route content
                    -> SiteFooter
                    -> StorefrontOverlays
              -> StorefrontAuthDialogHost
```

The legacy `StorefrontClientStateProvider` and `StorefrontProvider` are deleted. Architecture tests reject either path or import from returning.

## Implemented ownership

### Focused Zustand stores

```text
src/stores/cart.store.ts
src/stores/saved-items.store.ts
src/stores/storefront-ui.store.ts
```

- `cart.store.ts` owns minimal cart-line intents and actions.
- `saved-items.store.ts` owns saved product IDs and actions.
- `storefront-ui.store.ts` owns shared overlay identity, recent IDs, utility dismissal and non-authoritative browser hold intents.
- Complete Product records are not persisted in Zustand.
- Product joins are composed from the TanStack-backed storefront catalogue outside the stores.

### Persistence and hydration

`StorefrontStateHydrator` owns the browser hydration and persistence boundary.

It:

- loads and migrates the existing version-3 cart, saved and hold snapshot;
- restores cart intents against the canonical storefront catalogue;
- hydrates the three focused stores;
- persists only product IDs, variant IDs, quantities, saved IDs and hold expiry timestamps;
- keeps recent IDs and utility dismissal as browser preferences;
- keeps Inventory, payment and reservation authority on the server.

## Corrective architecture work completed

### 1. One shared hold clock

The repeated one-second intervals were removed from `useStorefrontHolds()` and `StorefrontHoldAlertRuntime`.

`StorefrontHoldClockBoundary` now owns one timer for the storefront. Countdown consumers derive remaining seconds from the same timestamp, and expiry cleanup happens on that shared tick.

Focused tests assert that multiple countdown consumers create only one interval and that expired intents are removed by the shared clock.

### 2. Exclusive overlay coordination

`storefront-overlay-events.ts` now coordinates transitions across:

- Zustand-owned drawers and information overlays;
- quick view;
- image viewer;
- authentication dialog.

Opening any destination closes the current Zustand and transient overlay first. Search and saved items therefore cannot remain mounted under quick view, and quick view cannot remain mounted under the image viewer or another information surface.

Focused tests cover both transient-to-Zustand and Zustand-to-transient transitions.

### 3. One catalogue-navigation implementation

`useCatalogueNavigation()` is the single URL mutation boundary for:

- quick collections;
- category, condition and inventory filters;
- active-filter removal;
- clearing;
- sorting;
- search;
- pagination.

`ProductCatalogue`, filter controls, sort overlay and search overlay consume this hook. The catalogue component no longer imports `catalogueHref` or calls the Next router directly.

### 4. One TanStack query-default policy

`STOREFRONT_QUERY_DEFAULTS` remains the single cache-policy definition. The storefront catalogue query spreads those defaults instead of repeating stale time, garbage-collection time, retry and refetch options.

### 5. British `catalogue` naming restored

The American-spelled Phase 6 entry points were replaced and deleted:

```text
src/app/api/v1/storefront/catalog/route.ts
src/app/api/v1/storefront/catalog/route.test.ts
src/modules/products/client/storefront-catalog.ts
src/features/storefront/shared/catalog-adapter.ts
src/features/storefront/shared/catalog-adapter.test.ts
src/features/storefront/shared/catalog-loader.ts
src/features/storefront/shared/catalog-loader.test.ts
src/features/storefront/shared/catalog-types.ts
```

The active contract now uses:

```text
/api/v1/storefront/catalogue
storefrontCatalogueQueryKey
StorefrontShellCataloguePayload
useStorefrontCatalogue()
useStorefrontCatalogueData()
loadStorefrontShellCatalogue()
```

Architecture tests reject the retired paths, imports, endpoint and symbols.

### 6. Product-module dependency direction restored

The Products module now owns:

```text
src/modules/products/storefront/catalogue-contract.ts
src/modules/products/server/storefront/catalogue-projection.ts
src/modules/products/client/storefront-catalogue.ts
```

`src/modules/products/server/storefront/shell-query.ts` depends only on Product-module contracts, projection code and server queries. It no longer imports mapper or transport types from `features/storefront/shared`.

Projection coverage was consolidated into one Product-module test suite rather than retaining overlapping adapter and loader tests.

### 7. UI copy contract restored

The cart empty-state message was returned to its pre-Phase-6 wording:

> Add something from the drop and it will appear here and in the header bag.

No copy change remains as an incidental consequence of the state migration.

### 8. Mechanical JSX churn cleaned

Quick view, image viewer, search and saved-items overlays were reformatted into reviewable JSX without changing their classes, labels, visual composition or responsive contract.

## Source evidence authored

- focused cart-store tests;
- focused saved-items-store tests;
- focused storefront-UI-store tests;
- one shared hold-clock test;
- exclusive overlay-transition tests;
- storage migration and hydration boundary tests;
- architecture tests preventing provider resurrection, duplicate navigation ownership, American catalogue naming and reversed module dependencies;
- consolidated Product-module catalogue-projection tests;
- catalogue search-parameter and URL-history tests;
- public `/api/v1/storefront/catalogue` contract test;
- Phase 6 Playwright coverage for cart/saved persistence, hydration warnings, URL back/forward, search, sorting, shell overlays, overflow, theme and mobile navigation.

Authored tests are not passing evidence until they execute on the exact head.

## Remaining blocker 1 — dependency lock mismatch

`package.json` declares:

```json
"zustand": "^5.0.14"
```

The current `pnpm-lock.yaml` does not contain the corresponding importer entry or package snapshot.

CI installs with:

```bash
pnpm install --frozen-lockfile
```

The lockfile must be regenerated with pnpm 11.13.0 and committed without unrelated dependency drift. Frozen-lockfile enforcement must not be weakened, and the lockfile must not be fabricated by hand.

## Remaining blocker 2 — exact-head execution

The latest workflows are still queued or pending. Until they execute, there is no passing evidence for:

- frozen dependency installation;
- architecture guards;
- Biome;
- TypeScript;
- Vitest;
- production build;
- React Doctor;
- desktop, tablet and mobile Playwright;
- light/dark and responsive UI parity.

Queued work is not treated as passing evidence.

## Task matrix

| ID | Task | Source status | Evidence status |
| --- | --- | --- | --- |
| P6-T00 | Record Phase 5 merge and validation debt | Complete | Recorded |
| P6-T00A | Map original provider, persistence and URL ownership | Complete | Source-audited |
| P6-T00B | Add storefront-state non-expansion guards | Complete | Execution pending |
| P6-T01 | Add Zustand | Blocked | Package declared; lockfile not reconciled |
| P6-T02 | Create `cart.store.ts` | Source complete | Unit execution pending |
| P6-T03 | Create `saved-items.store.ts` | Source complete | Unit execution pending |
| P6-T04 | Create `storefront-ui.store.ts` | Source complete | Unit execution pending |
| P6-T05 | Preserve versioned persistence | Source complete | Migration/hydration execution pending |
| P6-T06 | Add hydration-safe selectors | Source complete | Runtime execution pending |
| P6-T07 | Prevent complete product persistence | Source complete | Guard/browser execution pending |
| P6-T08 | Move catalogue filters to URL ownership | Source complete | Browser execution pending |
| P6-T09 | Keep pagination URL-owned | Source complete | Browser execution pending |
| P6-T10 | Keep sorting URL-owned | Source complete | Browser execution pending |
| P6-T11 | Keep navigational search URL-owned | Source complete | Browser execution pending |
| P6-T12 | Remove URL/context synchronisation effects | Source complete | Architecture/browser execution pending |
| P6-T13 | Move image-viewer state locally | Source complete | Browser execution pending |
| P6-T14 | Move measurement state to the narrow shared boundary | Source complete | Browser execution pending |
| P6-T15 | Move newsletter state locally | Source complete | Browser execution pending |
| P6-T16 | Move delivery-estimate state locally | Source complete | Browser execution pending |
| P6-T17 | Move header scroll state into the header | Source complete | Browser execution pending |
| P6-T18 | Separate auth-dialog local state | Source complete | Auth/browser execution pending |
| P6-T19 | Remove migrated values from `StorefrontProvider` | Complete | Provider deleted |
| P6-T20 | Remove unused context selectors and consumers | Source complete | TypeScript/guard execution pending |
| P6-T21 | Delete final legacy provider after consumer cutover | Complete | Both legacy providers deleted |
| P6-T22 | Run static, unit, build, React Doctor and browser gates | Pending | Exact-head workflows not complete |

## Remaining order

1. Regenerate `pnpm-lock.yaml` with pnpm 11.13.0.
2. Prove `pnpm install --frozen-lockfile` on the exact resulting head.
3. Run architecture guards, Biome and TypeScript.
4. Run focused and complete Vitest suites.
5. Run the production build and React Doctor.
6. Run desktop, tablet and mobile Playwright with light/dark visual comparison and retained artifacts.
7. Inspect logs, screenshots, traces and every failure before marking a gate complete.
8. Reconcile the final task matrix, PR body and review state.

## Acceptance gate

Phase 6 is complete only when:

- the dependency lock is consistent and frozen installation succeeds;
- cart and saved items survive navigation and intended storage lifetime;
- storage migration works without data loss;
- hydration produces no warning or first-paint state corruption;
- catalogue back/forward restores exact filters, sort, search and page;
- no complete Product record or remote server collection is duplicated into Zustand;
- one shared hold clock serves all countdown consumers;
- at most one storefront overlay owns focus and body lock at a time;
- catalogue URL mutation has one implementation;
- the Product server module does not depend backwards on storefront feature code;
- the British `catalogue` naming contract remains enforced;
- desktop, tablet, mobile, light and dark UI contracts remain unchanged;
- exact-head architecture, Biome, TypeScript, Vitest, build, React Doctor and Playwright gates execute successfully.

## Current verdict

The ten reviewed blockers have been implemented in source except for the lockfile and exact-head execution blockers, which cannot be truthfully marked complete yet.

Phase 6 remains **in progress** and must stay draft until the dependency lock is reconciled and every required validation gate passes on the same exact head.

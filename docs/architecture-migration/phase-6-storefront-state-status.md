# Phase 6 — Storefront State and Zustand Migration Status

**Branch:** `refactor/phase-6-storefront-state-zustand`  
**Base merge:** `cd12b89e9ec2eb9210704e200e30731d864646e1`  
**Pull request:** #45  
**Audited source head:** `8ce12fb73a0e087e1ba2077e0bdfbf55c30ef5d2`  
**Current workstream:** dependency-lock repair and exact-head certification  
**Phase status:** Source migration implemented; runtime certification blocked  
**UI contract:** Preserve the storefront shell, homepage, product cards, catalogue, PDP, cart, checkout, account surfaces, themes, typography, spacing, overlays and responsive behaviour.

## Authority

The repository-owner architecture decision remains the governing contract.

Phase 6 establishes this ownership:

| State | Owner |
| --- | --- |
| Persistent business data | Prisma |
| Remote browser cache | TanStack Query |
| Navigable filters, sort, search and pagination | URL search parameters |
| Shared browser-owned state | Focused Zustand stores |
| Component-local interaction state | `useState` or a local reducer |
| Authentication and permissions | Server session and policy |

Zustand must not become a second cache for products, inventory, orders, customers, payments or permissions.

## Phase 5 inheritance

Phase 5 was squash-merged as `cd12b89e9ec2eb9210704e200e30731d864646e1` at the repository owner’s explicit direction.

The merge retained unresolved validation debt:

```text
Implementation Quality: 30164712987 — queued at merge
Playwright UI Contract: 30164712918 — queued at merge
```

Phase 6 begins from that exact merge. Queued work is not retroactively treated as passing evidence.

## Exact current runtime composition

```text
app/(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> loadStorefrontShellCatalog()
     -> getCurrentSession()
     -> StorefrontClientBoundary
        -> StorefrontQueryProvider
           -> StorefrontStateHydrator
              -> StorefrontAuthProvider
                 -> SiteChrome
                    -> SiteHeader
                    -> route content
                    -> SiteFooter
                    -> StorefrontOverlays
              -> StorefrontAuthDialogHost
```

The legacy `StorefrontClientStateProvider` and `StorefrontProvider` are deleted. Architecture tests now reject either path or import from returning.

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

`StorefrontStateHydrator` now owns the one browser hydration boundary.

It:

- loads and migrates the existing version-3 cart, saved and hold snapshot;
- restores cart intents against the canonical storefront catalogue;
- hydrates the three focused stores;
- persists only product IDs, variant IDs, quantities, saved IDs and hold expiry timestamps;
- keeps recent IDs and utility dismissal as browser preferences;
- derives countdown display from expiry timestamps rather than storing a global one-second clock in Zustand.

The browser hold remains explicitly non-authoritative. Inventory, payment and reservation authority remain server-owned.

### TanStack storefront catalogue

The storefront shell catalogue is seeded into a storefront-scoped QueryClient and consumed through the typed Product module client boundary.

Zustand does not duplicate the product collection.

### URL-owned catalogue navigation

Catalogue category, collection, conditions, inventory modes, stock, price, sort, search and page are now read from URL search parameters.

Controls write through Next navigation helpers. The former URL → provider → URL synchronisation loop has been removed.

Pagination, sorting and navigational search remain URL-owned and are covered by source tests plus a browser-history Playwright contract.

### Local interaction ownership

- Quick-view product, image, variant and error state live in `QuickViewOverlay`.
- Image-viewer request, index and zoom live in `ImageViewerOverlay`.
- Measurement-unit state lives in the shared measurement overlay because both PDP and quick view invoke that surface.
- Delivery-estimate status lives in the delivery form overlay.
- Newsletter status lives in `NewsletterSection`.
- Header scroll state lives in `SiteHeader`.
- Catalogue density and sidebar visibility live in `ProductCatalogue`.
- Auth-dialog fields, visibility, reveal, terms and local errors live in `StorefrontAuthDialogHost`; Phase 7 still owns auth transport consolidation.

### Provider retirement

Deleted:

```text
src/features/storefront/shared/storefront-provider.tsx
src/features/storefront/shared/storefront-client-state-provider.tsx
src/features/storefront/shared/overlays/legacy-cart-drawer.tsx
src/features/storefront/home/components/home-shop-view.tsx
```

Consumers now use focused Zustand selectors, TanStack catalogue hooks, URL state, local component state or explicit props.

## Source evidence authored

- focused cart-store tests;
- focused saved-items-store tests;
- focused storefront-UI-store tests;
- storage migration and hydration boundary tests;
- architecture tests preventing provider resurrection and forbidden store ownership;
- catalogue search-parameter and URL-history tests;
- public shell-catalogue API contract test;
- Phase 6 Playwright coverage for cart/saved persistence, hydration warnings, URL back/forward, search, sorting, shell overlays, overflow, theme and mobile navigation.

Authored tests are not passing evidence until they execute on the exact head.

## Confirmed blocker — dependency lock mismatch

`package.json` declares:

```json
"zustand": "^5.0.14"
```

The current `pnpm-lock.yaml` does not contain a Zustand importer entry or package snapshot.

CI installs with:

```bash
pnpm install --frozen-lockfile
```

Therefore the exact head cannot pass installation until the lockfile is regenerated with pnpm 11.13.0 and committed. This is a source-completion blocker, not merely missing test evidence.

Do not weaken or remove frozen-lockfile enforcement as a workaround.

## Task matrix

| ID | Task | Source status | Evidence status |
| --- | --- | --- | --- |
| P6-T00 | Record Phase 5 merge and validation debt | Complete | Recorded |
| P6-T00A | Map original provider, persistence and URL ownership | Complete | Source-audited |
| P6-T00B | Add storefront-state non-expansion guard | Complete | Execution pending |
| P6-T01 | Add Zustand | Blocked | Package declared; lockfile not reconciled |
| P6-T02 | Create `cart.store.ts` | Source complete | Unit execution pending |
| P6-T03 | Create `saved-items.store.ts` | Source complete | Unit execution pending |
| P6-T04 | Create `storefront-ui.store.ts` | Source complete | Unit execution pending |
| P6-T05 | Preserve versioned persistence | Source complete | Migration/hydration execution pending |
| P6-T06 | Add hydration-safe selectors | Source complete | Runtime execution pending |
| P6-T07 | Prevent complete product persistence | Source complete | Guard and browser execution pending |
| P6-T08 | Move catalogue filters to URL ownership | Source complete | Browser execution pending |
| P6-T09 | Keep pagination in URL ownership | Source complete | Browser execution pending |
| P6-T10 | Keep sorting in URL ownership | Source complete | Browser execution pending |
| P6-T11 | Keep navigational search in URL ownership | Source complete | Browser execution pending |
| P6-T12 | Remove URL/context synchronisation effects | Source complete | Architecture/browser execution pending |
| P6-T13 | Move image-viewer state locally | Source complete | Browser execution pending |
| P6-T14 | Move measurement state to the narrow shared boundary | Source complete | Browser execution pending |
| P6-T15 | Move newsletter state locally | Source complete | Browser execution pending |
| P6-T16 | Move delivery-estimate state locally | Source complete | Browser execution pending |
| P6-T17 | Move header scroll state into header | Source complete | Browser execution pending |
| P6-T18 | Separate auth-dialog local state | Source complete | Auth/browser execution pending |
| P6-T19 | Remove migrated values from `StorefrontProvider` | Complete | Provider deleted |
| P6-T20 | Remove unused context selectors and consumers | Source complete | TypeScript/guard execution pending |
| P6-T21 | Delete final legacy provider after last consumer | Complete | Both legacy providers deleted |
| P6-T22 | Run static, unit, build, React Doctor and browser gates | Not started | Exact-head workflows queued |

## Exact-head workflow state

For source head `8ce12fb73a0e087e1ba2077e0bdfbf55c30ef5d2`:

```text
Implementation Quality: 30169398436 — queued
Playwright UI Contract: 30169398438 — queued
```

Queued jobs are not passing evidence. There are no submitted reviews and no unresolved review threads.

## Remaining work

1. Regenerate `pnpm-lock.yaml` with pnpm 11.13.0 so Zustand is represented without unrelated dependency drift.
2. Run the frozen install on the exact resulting head.
3. Run architecture guard and Biome.
4. Run TypeScript.
5. Run storage, store, catalogue, API and complete Vitest suites.
6. Run the production build and React Doctor.
7. Run desktop, tablet and mobile Playwright with light/dark visual comparison and retained artifacts.
8. Inspect runtime logs, screenshots, traces and every failure before marking any gate complete.
9. Reconcile the final task matrix, PR body and review state.

## Acceptance gate

Phase 6 is complete only when:

- the dependency lock is consistent and frozen installation succeeds;
- cart and saved items survive navigation and intended storage lifetime;
- storage migration works without data loss;
- hydration produces no warning or first-paint state corruption;
- catalogue back/forward restores exact filters, sort, search and page;
- no complete Product record is persisted in Zustand;
- no remote server collection is duplicated into Zustand;
- unrelated local interactions no longer depend on a whole-storefront provider;
- the retired provider paths remain absent;
- storefront desktop, tablet, mobile, light and dark UI contracts remain unchanged;
- exact-head architecture, Biome, TypeScript, Vitest, build, React Doctor and Playwright gates execute successfully.

## Rollback triggers

Rollback or narrow the workstream if it causes:

- cart or saved-item loss;
- storage migration failure;
- hydration mismatch;
- filter synchronisation loops;
- broken browser history;
- duplicate or stale cart projections;
- authoritative hold, inventory or payment state in Zustand;
- product-card, catalogue, PDP, cart, checkout, overlay, theme or responsive screenshot differences.

## Current verdict

The Phase 6 ownership migration is implemented in source, including retirement of both legacy providers.

Phase 6 is not source-complete or certified because the dependency lock is inconsistent and no exact-head verification gate has executed.
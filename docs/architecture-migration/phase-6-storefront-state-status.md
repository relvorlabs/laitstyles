# Phase 6 — Storefront State and Zustand Migration Status

**Branch:** `refactor/phase-6-storefront-state-zustand`  
**Base merge:** `cd12b89e9ec2eb9210704e200e30731d864646e1`  
**Phase 5 pull request:** #43  
**Current workstream:** Bootstrap, source ownership map and non-expansion guard  
**Phase status:** Active; implementation not started  
**UI contract:** Preserve the existing storefront shell, homepage, product cards, catalogue, PDP, cart, checkout, account surfaces, themes, typography, spacing, overlays and responsive behaviour

## Authority

The repository-owner architecture decision remains the governing contract.

Phase 6 must establish this state ownership:

| State | Owner |
| --- | --- |
| Persistent business data | Prisma |
| Remote browser cache | TanStack Query |
| Navigable filters, sort, search and pagination | URL search parameters |
| Shared browser-owned state | Focused Zustand stores |
| Component-local interaction state | `useState` or a local reducer |
| Authentication and permissions | Server session and policy |

Zustand must not become a second cache for products, inventory, orders, customers, payments or permissions.

## Phase 5 merge truth

Phase 5 was squash-merged as `cd12b89e9ec2eb9210704e200e30731d864646e1` at the repository owner’s explicit direction.

The merge commit records unresolved validation debt:

```text
Implementation Quality: 30164712987 — queued at merge
Playwright UI Contract: 30164712918 — queued at merge
```

Phase 6 begins from that exact merge. The Phase 5 source cutover is merged, but queued runs are not retroactively treated as passing evidence.

## Current storefront runtime composition

```text
app/(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> loadStorefrontShellCatalog()
     -> loadStorefrontAuthSession()
     -> StorefrontClientBoundary
        -> StorefrontClientStateProvider
           -> StorefrontAuthProvider
              -> SiteChrome
                 -> StorefrontProvider
                    -> SiteHeader
                    -> route content
                    -> SiteFooter
                    -> StorefrontOverlays
```

### `StorefrontClientStateProvider`

Current ownership:

- hydration readiness;
- cart lines;
- saved product IDs;
- local hold intents and expiry timestamps;
- one-second hold clock;
- hold-expiry cleanup;
- hold alert dismissal;
- session/local storage migration and persistence.

The provider persists the version-3 snapshot through `storefront-client-state.ts` and restores cart lines by joining stored IDs with the shell catalogue.

### `StorefrontProvider`

The current provider is a broad compatibility boundary. It owns or derives:

- complete shell product records, categories, measurements and variant options;
- cart and saved projections;
- recently viewed IDs and utility dismissal;
- global overlay identity and focus management;
- active full product record;
- quick-view variant state;
- image-viewer index and zoom;
- search-overlay input and results;
- measurement unit;
- newsletter and delivery-estimate statuses;
- header scroll state;
- catalogue category, collection, condition, inventory, stock, price, search and sort state;
- derived filtered products, breadcrumbs, filter chips, cart lines and saved lists.

This provider is the Phase 6 migration target. It must shrink by moving state to its correct owner, not by recreating the same god object in Zustand.

### `StorefrontAuthProvider`

The auth boundary currently owns the authenticated session projection and all auth-dialog form/open/error state. Phase 6 may separate dialog-local state from the general storefront boundary, but Phase 7 retains auth transport and server-ownership consolidation.

Phase 6 must not opportunistically redesign authentication or move auth business logic beyond the approved local-dialog boundary work.

## Confirmed ownership defects

### 1. URL state duplicated in React context

`ProductCatalogue` receives parsed server-owned URL values, copies them into `StorefrontProvider`, then runs a second effect that serializes context changes back into the URL.

Current compatibility flow:

```text
URL search params
  -> server parser
  -> ProductCatalogue props
  -> synchronization effect
  -> StorefrontProvider filter state
  -> second synchronization effect
  -> router.replace(...)
```

Target flow:

```text
URL search params
  -> parsed catalogue state
  -> controls update router
  -> server query receives URL state
```

The URL remains authoritative. Phase 6 must remove the synchronization loop without changing filter controls, pagination, history behaviour or visual presentation.

### 2. Browser state split across two providers

Cart and saved IDs are persisted by `StorefrontClientStateProvider`, while mutations and derived projections live in `StorefrontProvider`. This causes broad context updates and divided ownership.

Target:

- `cart.store.ts` owns cart intents and cart actions;
- `saved-items.store.ts` owns saved product IDs and actions;
- `storefront-ui.store.ts` owns only genuinely shared browser UI state;
- product joins remain selectors/read-model composition and full product records are not persisted.

### 3. Local state is mounted globally

Image viewer, quick-view selection, newsletter feedback, delivery estimate, header scrolling and other local interactions are mounted at the whole-storefront provider boundary.

These values must move to the narrowest component or domain boundary that uses them.

### 4. Complete catalogue records cross global providers

The shell catalogue is passed through multiple client boundaries. Phase 6 must prevent new product-record persistence and reduce provider dependence without changing the already-established server product query path.

Phase 6 is a state-ownership migration, not a Product persistence rewrite.

### 5. Zustand is not installed

`package.json` currently has no Zustand dependency. Installation belongs to P6-T01 and must be accompanied by focused stores, selectors, persistence versioning and tests. Bootstrap does not add an unused dependency.

## Approved implementation order

### Workstream A — Foundation and preservation

1. Add Zustand as an intentional runtime dependency.
2. Create `src/stores/cart.store.ts`, `saved-items.store.ts` and `storefront-ui.store.ts` only.
3. Preserve and test the existing version-3 storage migration before changing hydration.
4. Add store factories or reset helpers for deterministic tests without creating production repositories.
5. Capture the current cart, saved, hold, drawer, catalogue history and hydration behaviour.

### Workstream B — Cart ownership

1. Move cart intents and actions into `cart.store.ts`.
2. Persist IDs, variant identity, quantity and required price snapshot only.
3. Do not persist complete Product records.
4. Preserve quantity limits, one-of-one rules, variant selection, undo and clear behaviour.
5. Preserve cart drawer and cart-page presentation.

### Workstream C — Saved items ownership

1. Move saved product IDs and actions into `saved-items.store.ts`.
2. Preserve the existing storage migration and signed-out behaviour.
3. Join IDs to canonical product read models outside the store.
4. Preserve saved-page and product-card behaviour.

### Workstream D — Hold intent decision

The current browser hold timer is not authoritative inventory state.

Before moving it, classify it explicitly as either:

- a temporary browser checkout intent owned by a focused store; or
- a persisted remote reservation owned by the existing Holds/Inventory APIs and TanStack Query.

Do not place authoritative reservation state in Zustand. Keep the countdown display local and derive it from an expiry timestamp rather than storing a global one-second clock where possible.

### Workstream E — URL-owned catalogue state

1. Remove category, collection, conditions, inventory modes, stock, price, search and sort from `StorefrontProvider`.
2. Make filter controls update URL search parameters directly.
3. Keep page, sort and every result-affecting parameter in the URL and server query.
4. Remove URL/context synchronization effects.
5. Preserve browser back/forward, pagination and scroll behaviour.

### Workstream F — Local component ownership

Move:

- image-viewer state to the viewer/PDP boundary;
- quick-view selection and errors to the quick-view boundary;
- measurement unit to the PDP boundary unless verified cross-route sharing requires otherwise;
- newsletter state to the newsletter form;
- delivery-estimate state to its form;
- header scroll state into the header;
- catalogue density/sidebar state to the catalogue boundary;
- auth-dialog fields and reveal/terms state to the auth dialog/form boundary.

### Workstream G — Provider retirement

1. Remove migrated values and derived selectors from `StorefrontProvider`.
2. Remove migrated values from `StorefrontClientStateProvider`.
3. Replace broad context consumers with focused selectors or local props.
4. Delete a provider only after its final consumer is migrated.
5. Keep `StorefrontAuthProvider` limited to the session/actions boundary until Phase 7.

## Task matrix

| ID | Task | Source status | Evidence status |
| --- | --- | --- | --- |
| P6-T00 | Record Phase 5 merge and validation debt | Complete | Recorded |
| P6-T00A | Map current storefront provider and URL ownership | Complete | Source-audited |
| P6-T00B | Add Phase 6 non-expansion guard | Bootstrap | Execution pending |
| P6-T01 | Add Zustand | Not started | — |
| P6-T02 | Create `cart.store.ts` | Not started | — |
| P6-T03 | Create `saved-items.store.ts` | Not started | — |
| P6-T04 | Create `storefront-ui.store.ts` | Not started | — |
| P6-T05 | Add versioned persistence where required | Not started | — |
| P6-T06 | Add hydration-safe selectors | Not started | — |
| P6-T07 | Prevent complete product persistence | Guard designed | Execution pending |
| P6-T08 | Move catalogue filters to URL ownership | Not started | — |
| P6-T09 | Keep pagination in URL ownership | Existing server path; audit during cutover | — |
| P6-T10 | Keep sorting in URL ownership | Compatibility sync exists | — |
| P6-T11 | Keep navigational search in URL ownership | Compatibility sync exists | — |
| P6-T12 | Remove URL/context synchronization effects | Not started | — |
| P6-T13 | Move image-viewer state locally | Not started | — |
| P6-T14 | Move measurements to PDP boundary | Not started | — |
| P6-T15 | Move newsletter state locally | Not started | — |
| P6-T16 | Move delivery-estimate state locally | Not started | — |
| P6-T17 | Move header scroll state into header | Not started | — |
| P6-T18 | Separate auth-dialog local state | Not started; Phase 7 transport preserved | — |
| P6-T19 | Remove migrated values from StorefrontProvider | Not started | — |
| P6-T20 | Remove unused context selectors | Not started | — |
| P6-T21 | Delete final legacy provider after last consumer | Not started | — |
| P6-T22 | Run static, unit, build, React Doctor and browser gates | Not started | Exact-head evidence required |

## Architecture rules

- Zustand stores may own browser intent and UI state only.
- Stores must not import Prisma, server modules, Server Actions or fixture arrays.
- Stores must not persist complete products or other server records.
- Product, inventory, order, payment, customer and permission state remain server-authoritative.
- URL search parameters remain authoritative for catalogue navigation state.
- Local interaction state must move closer to its component instead of being placed in a global store by default.
- Existing JSX, class names, design tokens, labels and responsive behaviour are preserved.
- Phase 6 must not absorb the Phase 7 auth consolidation or Phase 8 payment settlement scope.

## Acceptance gate

Phase 6 is complete only when:

- cart and saved items survive navigation and the intended storage lifetime;
- storage migration works without data loss;
- hydration produces no warning or first-paint state corruption;
- catalogue back/forward restores exact filters, sort, search and page;
- no complete Product record is persisted in Zustand;
- no remote server collection is duplicated into Zustand;
- unrelated local interactions no longer rerender the whole storefront shell;
- all old provider consumers are migrated before deletion;
- storefront desktop, tablet, mobile, light and dark UI contracts remain unchanged;
- exact-head architecture, Biome, TypeScript, Vitest, build, React Doctor and Playwright gates execute successfully.

## Rollback triggers

Rollback or narrow the current workstream if it causes:

- cart or saved-item loss;
- storage migration failure;
- hydration mismatch;
- filter synchronization loops;
- broken browser history;
- duplicate or stale cart projections;
- authoritative hold/payment state in Zustand;
- global rerender regressions;
- product-card, catalogue, PDP, cart, checkout, overlay, theme or responsive screenshot differences.

## Current verdict

Phase 6 is bootstrapped, not implemented.

The current provider architecture and URL synchronization debt are recorded. The next approved implementation task is P6-T01 followed by the cart store and storage-migration tests. No Phase 6 runtime behaviour has been changed by this bootstrap.
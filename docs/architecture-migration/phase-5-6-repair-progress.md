# Phase 5–6 repair progress

**Branch:** `chore/phase-5-certification-reconciliation`  
**Pull request:** #46  
**Status:** active repair; not merge-ready  
**Phase 7:** paused

This ledger is subordinate to `update(3).md`, especially the locked architecture decisions, Target Source Architecture, Phase 5, Phase 6 and the UI preservation contract.

## Execution constraints

- GitHub Actions and workflow runs are intentionally not used for this repair.
- The current agent runtime does not contain a usable repository checkout, cannot resolve GitHub for a clone, and has no usable pnpm installation.
- Therefore Biome, TypeScript, Vitest, build, Prisma validation, React Doctor and Playwright are not represented as passed.
- Source checks and guard scripts are authored in the branch, but executed evidence remains required from a dependency-capable local checkout.

## Ordered repair ledger

### R0 — Rebase the repair branch onto the merged Phase 6 baseline

**Status:** complete

- PR #46 was reset to the current `main` baseline after the previous branch contents became stale.
- Phase 7 remains separate and paused.

### R1 — Repair broken exports and imports

**Status:** source repair substantially complete; execution pending

Implemented:

- added `scripts/checks/module-export-guard.mjs`;
- wired the module-export guard into `pnpm check:architecture`;
- removed the retired American `useStorefrontCatalogData` runtime name from production consumers;
- standardized production consumers on `useStorefrontCatalogueData`;
- repaired the cart-restoration import after the cart-line model moved;
- removed obsolete Products catalogue route and symbol paths;
- kept temporary re-export bridges only where the remaining UI migration is explicit.

Acceptance still required:

- execute the export guard against the complete checkout;
- resolve any remaining missing named/default export reported by execution;
- delete all temporary compatibility bridges after their final UI consumers move.

### R2 — Replace the stale architecture guard

**Status:** source complete; execution pending

Implemented:

- removed workflow-filename assertions;
- removed requirements for already deleted Phase 6 files;
- added target-architecture requirements for stores, providers and domain modules;
- added retired path and American catalogue checks;
- added production fixture checks;
- added Client/Server, TanStack/Server Action and Route Handler/Server Action boundary checks;
- added root `app`, `stores`, `modules` and `server` to legacy `features/storefront` leak checks;
- added top-level `server/**` business ownership checks;
- added `/api/v1/**` machine-readable route checks.

The guard is expected to report remaining migration debt until R3–R6 are complete.

### R3 — Repair storefront non-UI ownership

**Status:** largely complete; compatibility cleanup pending

Moved to target ownership:

- cart model → `src/modules/cart/cart-lines.ts`;
- cart restoration → `src/modules/cart/cart-restoration.ts`;
- cart, saved-items and storefront UI stores remain in `src/stores/**`;
- catalogue URL contract → `src/modules/products/client/catalogue-search-params.ts`;
- catalogue navigation → `src/modules/products/client/use-catalogue-navigation.ts`;
- Products catalogue loader → `src/modules/products/server/storefront/catalogue-loader.ts`;
- Products presentation helpers → `src/modules/products/ui/storefront/catalogue-data.ts`;
- shared storefront runtime → `src/modules/storefront-shell/client/storefront-runtime.ts`;
- hold clock → `src/modules/storefront-shell/client/storefront-hold-clock.tsx`;
- overlay coordinator → `src/modules/storefront-shell/client/storefront-overlay-events.ts`;
- persisted storefront state → `src/modules/storefront-shell/client/storefront-client-state.ts`;
- state hydration → `src/providers/storefront-state-hydrator.tsx`;
- overlay lifecycle → `src/hooks/use-overlay-lifecycle.ts`;
- storefront fonts and feedback UI → `src/modules/storefront-shell/ui/**`.

Remaining:

- delete temporary feature-path re-exports after all UI consumers use module paths;
- move remaining visual feature components under domain UI folders.

### R4 — Move storefront UI to domain modules without visual changes

**Status:** in progress

Completed shell ownership:

- `SiteChrome`, header/footer, account menu, cart sheet, brand mark, shell icons and overlay host now have module-owned implementations under `src/modules/storefront-shell/ui/**`;
- the root storefront client boundary imports module-owned `SiteChrome`;
- the missing `StorefrontOverlays` runtime mount was restored in `SiteChrome`;
- old shell files are compatibility bridges only.

Remaining domain UI migration:

- Products catalogue UI and product-detail UI → `src/modules/products/ui/storefront/**`;
- account order UI → `src/modules/orders/ui/storefront/**`;
- review UI/actions → `src/modules/reviews/ui/storefront/**` with thin app adapters where required;
- cart UI → `src/modules/cart/ui/storefront/**` where it is not route-owned;
- shell overlays must move from generic `features/storefront/shared/overlays` into Products, Auth or storefront-shell ownership;
- home presentation must be placed under a clear storefront-shell or Products composition boundary;
- delete feature compatibility files only after every consumer moves.

The UI preservation contract remains mandatory: move code and change imports without redesigning JSX, classes, labels or responsive behavior.

### R5 — Retire top-level server business ownership

**Status:** in progress

Completed:

- account-order queries and mapping → `src/modules/orders/server/account-orders.ts`;
- account-order contract → `src/modules/orders/storefront/account-order-contract.ts`;
- review contracts, validation, policy, Prisma commands/queries and public review projection → `src/modules/reviews/**`;
- removed the migrated `src/server/commerce/orders/account-orders.ts` implementation;
- removed migrated `src/server/commerce/reviews/**` and `src/lib/commerce/reviews/**` implementations and moved focused tests beside the module.

Remaining:

- enumerate and migrate every other production `src/server/commerce/**` operation into Products, Inventory, Holds, Returns, Orders or another explicit domain;
- leave `src/server/auth/**` for the paused Phase 7 auth consolidation only;
- remove obsolete server directories after final consumer cutover.

### R6 — Reconcile API paths and transport ownership

**Status:** partially complete

Completed:

- public interactive Products catalogue API is `/api/v1/products`;
- Products client query uses the domain endpoint;
- deleted `/api/v1/storefront/catalogue` and American `/api/v1/storefront/catalog` routes;
- Server Components continue to call domain server queries directly rather than internal APIs.

Remaining:

- audit every actual browser remote read/mutation and move it to its owning `/api/v1/<domain>` route;
- do not create unused theoretical endpoints;
- account Server Components may continue direct domain reads as allowed by ADR-03;
- payment and checkout settlement remain outside this repair and must not be falsely implemented before their approved phase.

### R7 — Static local validation

**Status:** not executed

Required from a dependency-capable local checkout:

```bash
pnpm biome
pnpm typecheck
pnpm check:architecture
pnpm prisma:validate
```

Every command requires its complete log and exit code. Fixes must be committed sequentially and the commands rerun after each repair batch.

### R8 — Runtime and UI validation

**Status:** not executed

Required:

```bash
pnpm test
pnpm build
pnpm react-doctor
pnpm test:e2e
```

Playwright must verify desktop, tablet and mobile behavior, light/dark theme, cart persistence, saved items, URL history, overlays, header/footer, product cards, catalogue, PDP and account routes. No screenshot difference is accepted without an explicit approved reason.

## Merge rule

PR #46 must remain draft and unmerged until:

1. R3–R6 have no undocumented ownership bridge;
2. all required static and runtime commands execute successfully on the same exact head;
3. logs and artifacts are inspected rather than inferred;
4. UI preservation is proven;
5. the final architecture guard passes without broad legacy exceptions.

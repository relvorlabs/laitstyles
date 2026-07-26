# Phase 5–6 repair progress

**Branch:** `chore/phase-5-certification-reconciliation`  
**Pull request:** #46  
**Status:** source migration complete for the approved Phase 5–6 repair scope; validation pending  
**Phase 7:** paused  
**Phase 8:** paused

This ledger is subordinate to `update(3).md`, especially the locked architecture decisions, Target Source Architecture, Phase 5, Phase 6 and the UI-preservation contract.

## Execution constraints

- GitHub Actions and workflow runs are intentionally not used for this repair.
- The current agent runtime has no usable repository checkout, cannot resolve GitHub for a clone, and has no usable pnpm installation.
- Biome, TypeScript, architecture checks, Prisma validation, Vitest, build, React Doctor and Playwright are therefore **not represented as passed**.
- Source completion and executable certification remain separate gates.

## Ordered repair ledger

### R0 — Repair branch baseline

**Status:** complete

- PR #46 was repurposed as the Phase 5–6 repair branch against the merged baseline.
- PR remains draft and unmerged.
- Phase 7 authentication and Phase 8 checkout/payment settlement remain separate.

### R1 — Broken exports and imports

**Status:** source complete; execution pending

Implemented:

- added `scripts/checks/module-export-guard.mjs` and wired it into `check:architecture`;
- removed the retired `useStorefrontCatalogData` name and standardized production consumers on `useStorefrontCatalogueData`;
- removed the temporary American compatibility alias after consumer cutover;
- repaired cart-restoration ownership and moved its tests beside `modules/cart`;
- fixed the moved review action test’s stale `./review-actions` import;
- moved ReviewForm tests to the injected action contract rather than mocking a feature-local Server Action.

Acceptance still required:

- execute the export guard on the complete checkout;
- fix any unresolved module or missing named/default export reported by execution.

### R2 — Architecture guard

**Status:** source complete; execution pending

The guard now checks principles rather than workflow filenames or required legacy files:

- unresolved internal modules and missing exports;
- production fixture imports;
- Client/Server boundaries;
- TanStack-to-Server-Action and Route-Handler-to-Server-Action edges;
- app/store/module/server imports from legacy storefront features;
- top-level `server/**` business ownership;
- `/api/v1/**` machine API placement;
- retired paths and American `catalog` naming.

Architecture tests were reconciled to enforce:

- focused Zustand ownership;
- URL-owned catalogue navigation;
- domain modules not importing `features`, `app` or top-level `server`;
- Products browser transport using `/api/v1/products`;
- Product core types owned by `modules/products/storefront-types`;
- exact, bounded future-phase compatibility exceptions.

### R3 — Storefront non-UI ownership

**Status:** complete for Phase 5–6 scope

Target ownership now includes:

- cart model and restoration → `src/modules/cart/**`;
- cart, saved-items and storefront UI state → `src/stores/**`;
- catalogue URL contract and navigation → `src/modules/products/client/**`;
- catalogue loaders, queries, projections and pagination → `src/modules/products/server/storefront/**`;
- storefront Product contracts and presentation helpers → `src/modules/products/**`;
- storefront runtime, persisted client state, hold clock and overlay events → `src/modules/storefront-shell/client/**`;
- hydration → `src/providers/storefront-state-hydrator.tsx`;
- overlay/reveal lifecycle hooks → `src/hooks/**`;
- shell UI, fonts and feedback → `src/modules/storefront-shell/ui/**`.

Deleted completed compatibility bridges for cart restoration, client state, feedback, hold clock, icons, overlay events, state hydration and the legacy shell.

### R4 — Storefront UI domain ownership

**Status:** complete for the requested scope

Moved without intentional visual redesign:

- catalogue pages, collection results, product cards and PDP → `src/modules/products/ui/storefront/**`;
- account order list/detail UI → `src/modules/orders/ui/storefront/**`;
- review form/page UI → `src/modules/reviews/ui/storefront/**`;
- review Server Actions → thin route-local `actions.ts` adapters;
- search, filter, sort, quick-view and image-viewer overlays → Products UI;
- saved-items and information overlays → storefront-shell UI;
- account presentation primitives → storefront-shell UI.

The root storefront composition imports module-owned shell UI and mounts `StorefrontOverlays`.

### R5 — Top-level server business ownership

**Status:** source complete for discovered Phase 5–6 paths; guard execution pending

Moved or removed:

- account-order queries/mapping → `modules/orders/server`;
- review validation, policy, commands, queries and public projection → `modules/reviews`;
- Products catalogue queries, loaders, selection, projections and repositories → `modules/products/server/storefront`;
- deleted `src/server/commerce/orders/account-orders.ts`;
- deleted migrated `src/server/commerce/reviews/**` and `src/lib/commerce/reviews/**`;
- deleted discovered `src/server/commerce/catalogue/**` forwarders and moved their tests beside Products.

`src/server/auth/**` remains intentionally owned by paused Phase 7 and is not counted as a Phase 5–6 server-business exception.

### R6 — API and transport ownership

**Status:** complete for actual Phase 5–6 browser requirements

- interactive storefront Products data uses typed client code and `GET /api/v1/products`;
- old `/api/v1/storefront/catalogue` and American `/api/v1/storefront/catalog` routes are removed;
- Server Component catalogue, collection, PDP and account-order reads call domain server queries directly;
- review create/update/withdraw remains a form-specific thin Server Action transport;
- no speculative account-order API was added for Server Component-only reads;
- checkout/payment APIs remain deliberately outside this repair because Phase 8 owns server-authoritative settlement.

### R7 — Compatibility edges

**Status:** bounded and documented

Only two future-phase edges remain:

1. `src/features/storefront/shared/catalogue-data.ts`
   - Phase 7 auth-dialog type compatibility only;
   - exports only the `Product` type;
   - no runtime values or wildcard export.
2. `src/features/storefront/shared/storefront-runtime.ts`
   - Phase 8 checkout compatibility only;
   - exports only `useStorefrontCart` and `useStorefrontHolds`;
   - no wildcard export.

Adding any other export or consumer is prohibited. These files must be deleted by their owning future phases after those consumers move.

### R8 — Static local validation

**Status:** not executed

Required on the exact PR head:

```bash
pnpm biome
pnpm typecheck
pnpm check:architecture
pnpm prisma:validate
```

Every command requires its complete log and exit code.

### R9 — Runtime and UI validation

**Status:** not executed

Required on the same exact head:

```bash
pnpm test
pnpm build
pnpm react-doctor
pnpm test:e2e
```

Playwright must verify desktop, tablet and mobile behavior; light/dark theme; cart persistence; saved items; URL history; overlays; header/footer; product cards; catalogue; collections; PDP; account orders; and review flows.

## Objective implementation score

### Source architecture: **8.7/10**

The requested domain ownership, API placement, server retirement, overlay ownership and legacy deletion are substantially implemented. The score is not higher because two named future-phase compatibility edges remain and Product UI still consumes the export-only storefront type facade in some type-only imports.

### Validation confidence: **1.0/10**

No dependency-backed static, unit, build, React Doctor or Playwright command has executed in this runtime.

### Overall PR readiness: **7.4/10**

The source direction is strong, but the PR is not merge-ready until exact-head static and runtime validation passes and visual parity is inspected.

## Merge rule

PR #46 must remain draft and unmerged until:

1. the exact-head static commands pass with logs and exit codes;
2. unit/build/React Doctor/Playwright pass on the same head;
3. desktop/tablet/mobile and light/dark parity is inspected;
4. the final architecture guard and module-export guard pass;
5. no new compatibility consumer or broad export has been introduced.

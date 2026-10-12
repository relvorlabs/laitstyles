# Phase 9 Admin Inventory Atomic Cutover Design

**Date:** 2026-08-04  
**Status:** Approved migration-only design; implementation and exact-head acceptance are unexecuted.  
**Baseline:** `69286634` on `main`, with a clean worktree when this design was prepared.  
**Scope:** One atomic Phase 9 ownership cutover for the complete 32-file legacy Admin Inventory presentation tree.

## Context and decision

Phase 9 retires active presentation and composition from `src/features/admin/**`. Admin Inventory is
already backed by the canonical Inventory and Products modules, but its complete staff-facing UI,
URL helper, and two isolated tests remain under:

```text
src/features/admin/inventory/**
```

The tree contains 32 TypeScript files and 3,059 lines at the recorded baseline. Its runtime root is
`inventory-workspace.tsx`; the Admin Inventory route is the only production importer from outside
the tree. Internal imports form one cohesive presentation graph, including the product media
viewer. Moving individual leaves would create temporary mixed ownership, repeated import churn,
and compatibility edges. The approved decision is therefore an atomic directory cutover:

```text
src/features/admin/inventory/**
  -> src/modules/inventory/ui/admin/**
```

All 32 files are retired from legacy ownership in one implementation slice: 30 move, the isolated
obsolete query-key source/test pair is deleted, all internal legacy Inventory imports retarget, and
the route switches directly to the module UI paths. No legacy source, shim, barrel, alias,
forwarding module, or duplicate copy remains.

The two files under `data/` are obsolete query-key experiments used only by their colocated test;
production already uses `src/modules/inventory/client/keys.ts` and Products' canonical client keys.
They are deleted with their test rather than moved. The resulting destination therefore contains
29 moved production files plus the moved `inventory-url.test.ts`.

## Considered approaches

1. Move only `InventoryWorkspace` and leave leaf components in legacy composition: rejected because
   the module UI would continue depending on `src/features/admin/inventory/**`, so the ownership
   boundary would not be retired.
2. Move files incrementally with re-exports or compatibility shims: rejected because the tree has
   one external production consumer and can cut over atomically; temporary compatibility would add
   no user value and would preserve forbidden legacy ownership.
3. Refactor types, query keys, state ownership, components, or presentation during the move:
   rejected because it would mix architecture migration with behaviour change and prevent a clear
   identity/parity review.
4. Chosen approach: move the complete live presentation graph and URL test together, delete the
   isolated obsolete query-key pair, retarget imports, and change only the route's two Inventory
   imports.

## Authoritative ownership after cutover

| Surface | Responsibility after this slice |
| --- | --- |
| `src/app/admin/inventory/page.tsx` | Existing server-side staff authorization, search-parameter parsing, and composition of Inventory module UI. |
| `src/modules/inventory/ui/admin/**` | Staff-facing Inventory workspace, controls, saved views, lists, cards, details, media viewer, export UI, URL serializer, and their presentation-only helpers. |
| `src/modules/inventory/client/**` | Existing typed browser API calls, TanStack Query keys/hooks, stock mutation invalidation, and runtime transport; unchanged. |
| `src/modules/inventory/server/**`, `schema.ts`, `types.ts` | Existing Inventory contracts, reads, stock operations, validation, mapping, and Prisma access; unchanged. |
| `src/modules/products/**` | Existing product detail/taxonomy queries, product editor, lifecycle mutations, and canonical product contracts; unchanged. |
| `src/features/admin/shared/**`, `src/features/admin/state/**` | Existing shared Admin icon and prototype reporting-date state consumed by the moved UI; unchanged and explicitly not retired by this slice. |

The moved module UI may continue consuming deliberate Inventory client/type entry points and the
existing Products client/UI entry points. Its imports of `AdminIcon`, `useAdmin`, Admin formatters,
selectors, and shared presentation types are preserved migration dependencies, not authorization
to broaden this cutover into their ownership. No moved client file may acquire Prisma, a server-only
module, a Server Action, Supabase server/admin access, or a private server operation.

## Exact cutover inventory

Move these 30 files with their contents and relative structure preserved:

```text
inventory-controls.tsx
inventory-detail-media.tsx
inventory-detail-pricing.tsx
inventory-detail-records.tsx
inventory-detail-sheet.tsx
inventory-detail-stock.tsx
inventory-detail-summary.tsx
inventory-empty-state.tsx
inventory-export-alert.tsx
inventory-export.ts
inventory-filter-fields.tsx
inventory-grid.tsx
inventory-intake-queue.tsx
inventory-labels.ts
inventory-mobile-list.tsx
inventory-pagination.tsx
inventory-product-card.tsx
inventory-product-lifecycle-actions.tsx
inventory-saved-views.tsx
inventory-selection-bar.tsx
inventory-status-badge.tsx
inventory-summary-strip.tsx
inventory-table.tsx
inventory-url.test.ts
inventory-url.ts
inventory-workspace-header.tsx
inventory-workspace.tsx
product-media-sidebar.tsx
product-media-stage.tsx
product-media-viewer.tsx
```

Delete these two test-only obsolete files:

```text
data/inventory-keys.ts
data/inventory-keys.test.ts
```

Do not recreate their `inventoryKeys` or `productKeys`. Runtime consumers already use
`@/modules/inventory/client/keys` and `@/modules/products/client/keys`; the obsolete pair has no
production importer and tests a superseded key shape.

Update the two external route imports:

```text
@/features/admin/inventory/inventory-url
  -> @/modules/inventory/ui/admin/inventory-url

@/features/admin/inventory/inventory-workspace
  -> @/modules/inventory/ui/admin/inventory-workspace
```

Retarget every import whose prefix is `@/features/admin/inventory/` inside the moved files and
`inventory-url.test.ts` to `@/modules/inventory/ui/admin/`. Preserve imports from other legacy Admin
surfaces exactly. The stale string
`@/features/admin/inventory/catalogue-taxonomy-manager` in
`src/modules/products/product-module-boundaries.test.ts` is a declared exception value, not a live
module import; it remains outside this slice because changing it would alter the Products boundary
contract without moving a corresponding file.

## Preserved interface and data flow

The route continues to render the same named client component and props:

```text
InventoryWorkspace({
  initialQuery,
  initialPresentation,
  initialOpenProductId,
  initialPage,
  initialPageSize,
})
```

The URL helper retains `defaultInventoryPageSize`, `InventoryUrlState`, and `buildInventoryHref`.
Every other moved file retains its existing exports, directives, props, local state, callbacks,
copy, classes, DOM, keyboard behaviour, and responsive rules.

The unchanged runtime flow is:

```text
InventoryPage
  -> getStaffAccess("inventory:read") and existing search-param validation
  -> InventoryWorkspace initial URL state
  -> inventoryProductPageQueryOptions / productTaxonomyQueryOptions / adminProductQueryOptions
  -> typed Inventory and Products browser APIs
  -> existing versioned Route Handlers
  -> existing module server operations
  -> Prisma
```

The workspace keeps TanStack Query as remote-state owner; local React state continues to own
filters, pagination, presentation, selection, open detail/media state, and export feedback. The
Products editor controller continues to own create/edit UI. `useAdmin().state.reportingDate`
continues to supply the CSV filename date. This cutover introduces no new data source, query key,
request, response, mutation, cache policy, state provider, persistence path, or authorization rule.

## Behaviour and error contract

This is an identity-preserving ownership migration. It must preserve:

- signed-out and insufficient-capability behaviour from the route;
- URL parsing, default omission, filter serialization, page clamping, product deep links, and
  browser history replacement;
- query loading/previous-data behaviour, empty and filtered-empty states, summaries, facets,
  saved views, grid/table/mobile/intake presentations, pagination, and selection;
- product detail tabs, stock movements, lifecycle actions, product editor launch, media navigation,
  zoom and clipboard feedback;
- CSV contents and filename behaviour, labels, formatting, badge tones, copy, classes, DOM,
  accessibility tree, keyboard/focus behaviour, themes, and responsive layout;
- all existing request errors, mutation errors, deferred-domain notices, and route/client error
  boundaries.

No error handling is added, removed, or reclassified. Any runtime, request/response, cache,
authorization, persistence, DOM, accessibility-tree, computed-style, responsive, or user-visible
change is a regression.

## Ordered implementation boundary

1. Reconfirm exact head, clean scoped paths, the 32 source files, absent destination, the route's
   two Inventory imports, internal import graph, and test-only status of `data/inventory-keys*`.
2. Create `src/modules/inventory/ui/admin/` and move the 30 named live/test files there without
   component or helper refactoring.
3. Retarget only the moved tree's internal Inventory imports and the moved URL test import to the
   concrete module UI paths.
4. Change only the two Inventory imports in `src/app/admin/inventory/page.tsx`; preserve route
   semantics and all other imports.
5. Delete the two obsolete `data/inventory-keys*` files. Do not replace them or alter canonical
   module client keys.
6. Prove `src/features/admin/inventory` is absent and no live import, alias, re-export, shim,
   forwarding module, or duplicate copy preserves that ownership.
7. Inspect the scoped diff and run focused, repository, and browser validation on the exact head.

Moves should remain content-identical except for required import-prefix replacements and formatter-
only import ordering. No broad formatting pass is authorized.

## Validation and reviewer gates

Run the repository-owned commands on the declared Node 24.x and pnpm 11.13.0 toolchain and retain
the actual outcomes:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test -- src/modules/inventory/ui/admin/inventory-url.test.ts
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
```

Focused structural evidence must prove:

- all 30 destination files exist and the two obsolete files do not;
- `src/features/admin/inventory` is absent;
- no production or test import resolves through the retired path; the named non-import exception
  string in the Products boundary test is allowed to remain;
- moved files differ from their baseline versions only by approved import-path/order changes;
- `src/app/admin/inventory/page.tsx` differs only by its two import targets and formatter-only import
  ordering if required;
- canonical Inventory and Products client keys, hooks, contracts, server operations, Route Handlers,
  Prisma/Supabase surfaces, dependencies, and configuration are unchanged;
- the scoped diff contains no unrelated work.

The moved URL test must pass from its module location. Existing Inventory client/server tests remain
the contract and persistence regression suite; they do not replace UI parity evidence. A failure
in the moved tree, route, Inventory ownership boundary, URL behaviour, or named cross-module seam
blocks the slice. A broader failure is pre-existing only when it reproduces on an unchanged
comparable baseline. Missing credentials, controlled data, browser runner, database, or supported
toolchain makes the affected gate blocked or skipped, never passed.

## Browser, accessibility, and responsive acceptance

Against an authorized staff session, inspect `/admin/inventory` at 375x812, 768x1024, and 1280x800
in light and dark themes. Compare screenshots with the baseline and inspect console output, failed
requests, and available server logs. Exercise, where controlled data permits:

- signed-out, insufficient-capability, initial loading, populated, empty, filtered-empty, and
  request-error states;
- all saved views and filters, search, sort, grid/table switch, pagination/page-size changes, URL
  restoration, product deep link, and page clamping;
- mobile list, desktop grid/table, intake queue, single/multi-select, CSV export, and reset;
- detail sheet tabs, stock movement loading, lifecycle confirmation/success/error, editor launch,
  and deferred Orders/Holds/Reviews/Activity notices;
- media viewer open/close, thumbnail choice, arrow-key navigation, zoom controls and keyboard
  shortcuts, clipboard success/error feedback, and constrained viewport overflow;
- keyboard traversal, visible focus, labels/names, dialog and sheet focus containment/return,
  touch targets, contrast, responsive transformation, and absence of horizontal overflow.

Any observed difference from the baseline is a regression unless it is solely the non-user-visible
source ownership path.

## Rollback

Rollback is source-only and atomic: move the 30 files back to
`src/features/admin/inventory/`, restore their internal legacy prefixes and the route's two legacy
imports, and restore the obsolete query-key pair only if rolling back to the exact recorded
baseline. Remove the module UI destination only after every importer resolves. Re-run structural,
focused, static, and browser checks. A rollback with files in both owners, forwarding imports,
aliases, shims, or partial route cutover is invalid. Do not use a broad reset or overwrite
concurrent work.

## Roles, dependencies, and exclusions

The Planner freezes this design, file inventory, preservation contract, and evidence boundary. The
Frontend Engineer is the sole producer because this slice changes only route/UI ownership, import
paths, and obsolete UI-local tests; no server contract or persistence producer is required. The
Reviewer independently inspects the exact diff and executes or samples structural, static,
browser, accessibility, responsive, and unrelated-work gates. Completion requires an explicit
Reviewer **Pass** or **Pass with evidenced pre-existing issues** verdict.

Explicitly excluded:

- Any server-side, Route Handler, API, schema, contract, Prisma, Supabase, authorization, audit,
  transaction, cache, query-key, mutation, dependency, package, lockfile, configuration, migration,
  seed, or generated-code change.
- Any component split/merge, rename beyond path ownership, export change, directive change,
  type-domain migration, state/query refactor, dead-code cleanup beyond the named obsolete pair,
  copy/style/DOM/accessibility/responsive change, or new test behaviour.
- Moving `src/lib/admin/inventory/**`, `src/features/admin/shared/**`,
  `src/features/admin/state/**`, the Product editor, Products UI, Admin shell, Overview inventory
  watch, Record Sale, or any other Admin feature.
- Changing the stale Products boundary-test exception string, adding module barrels, tightening
  global architecture guards, or editing the migration tracker in this slice.
- Repairing unrelated Phase 9/10 work or reclassifying earlier validation debt.
- Staging, committing, resetting, deleting, formatting, or overwriting unrelated work.

## Success criteria

- The complete live Admin Inventory presentation graph and URL test exist only under
  `src/modules/inventory/ui/admin/**`; the two obsolete test-only query-key files are absent.
- The Admin Inventory route imports the concrete module UI paths, and no live legacy Inventory
  import or compatibility edge remains.
- All observable route, data, query, mutation, URL, export, visual, responsive, theme,
  accessibility, and error behaviour remains unchanged.
- The scoped diff contains only the approved moves, internal import retargets, two route import
  retargets, obsolete-pair deletion, and necessary formatter-only import ordering.
- Exact-head validation is reported truthfully, no newly introduced failure exists, and the
  independent Reviewer returns Pass before the orchestrator may mark the cutover complete.

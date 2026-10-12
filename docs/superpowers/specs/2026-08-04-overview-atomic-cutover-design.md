# Phase 9 Admin Overview Atomic Cutover Design

**Date:** 2026-08-04  
**Status:** Approved migration-only design; implementation and exact-head acceptance are unexecuted.  
**Baseline:** `69286634` on `main`, with Overview legacy tree verified at 12 files and 1,030 lines when this design was prepared.  
**Scope:** One atomic Phase 9 ownership cutover for the complete 12-file legacy Admin Overview presentation tree.

## Context and decision

Phase 9 retires active presentation and composition from `src/features/admin/**`. Admin Overview is
already backed by the canonical Overview module (client, server, types), but its complete staff-facing
UI remains under:

```text
src/features/admin/overview/**
```

The tree contains 12 TypeScript files and 1,030 lines at the recorded baseline. Its runtime root is
`overview-page.tsx`; the Admin Overview route (`src/app/admin/page.tsx`) is the only production
importer from outside the tree. Internal imports form one cohesive presentation graph:
`overview-page.tsx` composes 8 sibling section components, and `today-strip.tsx` composes
`ledger-lead-figure.tsx`. Moving individual leaves would create temporary mixed ownership, repeated
import churn, and compatibility edges. The approved decision is therefore an atomic directory
cutover:

```text
src/features/admin/overview/**
  -> src/modules/overview/ui/admin/**
```

All 12 files are retired from legacy ownership in one implementation slice: 11 move, the isolated
obsolete query-key source file is deleted, all internal legacy Overview imports retarget, and the
route switches directly to the module UI paths. No legacy source, shim, barrel, alias, forwarding
module, or duplicate copy remains.

The file under `data/` is an obsolete query-key experiment; production already uses
`src/modules/overview/client/keys.ts` whose canonical shape (`detail()`, scoped to
`["admin","overview","detail"]`) is consumed by Orders, Holds, Customers, Returns, Inventory,
Products, and Settings modules for invalidation, and is the shape asserted by
`admin-domain-keys.test.ts`. The obsolete file defines a non-canonical `summary()` shape and has
no live production importer, no colocated test, and no runtime dependency. It is deleted rather
than moved. The resulting destination therefore contains 11 moved production files with no test
companion.

## Considered approaches

1. Move only `OverviewPage` and leave section components in legacy composition: rejected because the
   module UI would continue depending on `src/features/admin/overview/**`, so the ownership boundary
   would not be retired.
2. Move files incrementally with re-exports or compatibility shims: rejected because the tree has
   one external production consumer and can cut over atomically; temporary compatibility would add
   no user value and would preserve forbidden legacy ownership.
3. Refactor types, query keys, state ownership, components, or presentation during the move:
   rejected because it would mix architecture migration with behaviour change and prevent a clear
   identity/parity review.
4. Chosen approach: move the complete live presentation graph together, delete the isolated
   obsolete query-key file, retarget imports, and change only the route's single Overview import.

## Authoritative ownership after cutover

| Surface | Responsibility after this slice |
| --- | --- |
| `src/app/admin/page.tsx` | Existing thin route composition of Overview module UI. No authorization is added here; the Admin layout (`src/app/admin/layout.tsx`) already resolves staff access for the entire `/admin/*` segment. |
| `src/modules/overview/ui/admin/**` | Staff-facing Overview operating desk, header, page shell, section components (attention queue, activity stream, fulfilment lane, continue working, inventory watch, open orders preview, sales pulse, today strip, ledger lead figure), new-store onboarding overview, and their presentation-only helpers. |
| `src/modules/overview/client/**` | Existing typed browser API calls, TanStack Query keys/hooks (`adminOverviewQueryOptions`), invalidation, and runtime transport; unchanged. |
| `src/modules/overview/server/**`, `types.ts` | Existing Overview contracts, reads, policy, aggregated snapshot composition, and Prisma access; unchanged. |
| `src/features/admin/shared/**`, `src/features/admin/state/**` | Existing shared Admin icon and presentation helpers consumed by the moved UI; unchanged and explicitly not retired by this slice. |
| `@/lib/admin/shared/**` | Existing Admin formatters (`formatNaira`, `formatCompactNaira`, `formatReportingDate`, `formatRelativeTime`) and shared presentation types (`ControlRoomState`, `ControlRoomActivity`, `AttentionItem`, `AttentionTone`, `FulfilmentLaneItem`, `ContinueTask`, `SalesPulsePoint`); unchanged. |
| `src/modules/orders/ui/admin/order-status-badge.tsx` | Existing shared Order status badge consumed by `open-orders-preview.tsx`; unchanged. |

The moved module UI may continue consuming deliberate Overview client/type entry points, the
existing Orders UI entry point (`OrderStatusBadge`), Admin shared icon, and the `@/lib/admin/shared/**`
formatters/types. Its imports of `AdminIcon`, Admin formatters, selectors, and shared presentation
types are preserved migration dependencies, not authorization to broaden this cutover into their
ownership. No moved client file may acquire Prisma, a server-only module, a Server Action, Supabase
server/admin access, or a private server operation.

## Exact cutover inventory

Move these 11 files with their contents and relative structure preserved (flat, no subdirectories
in destination):

```text
activity-stream.tsx
attention-queue.tsx
continue-working.tsx
fulfilment-lane.tsx
inventory-watch.tsx
ledger-lead-figure.tsx
new-store-overview.tsx
open-orders-preview.tsx
overview-page.tsx
sales-pulse.tsx
today-strip.tsx
```

Delete this one obsolete unused file and its containing subdirectory:

```text
data/overview-keys.ts
```

Do not recreate its `overviewKeys` shape. Runtime consumers already use
`@/modules/overview/client/keys` which defines the canonical `detail()` shape asserted by
`admin-domain-keys.test.ts` and invalidated across Orders/Holds/Customers/Returns/Inventory/
Products/Settings; the obsolete file has no production importer and uses a non-canonical
`summary()` key shape.

Update the single external route import:

```text
@/features/admin/overview/overview-page
  -> @/modules/overview/ui/admin/overview-page
```

Retarget every import whose prefix is `@/features/admin/overview/` inside the moved files to
`@/modules/overview/ui/admin/`. This applies to:
- `overview-page.tsx` → 8 internal sibling imports (activity-stream, attention-queue,
  continue-working, fulfilment-lane, inventory-watch, open-orders-preview, sales-pulse,
  today-strip)
- `today-strip.tsx` → 1 internal sibling import (ledger-lead-figure)

Preserve imports from other legacy Admin surfaces exactly (`@/features/admin/shared/admin-icon`).
There is no boundary-test literal string exception for Overview; no retained string reference to
the retired prefix is known.

## Preserved interface and data flow

The route continues to render the same named client component with the same empty composition:

```text
OverviewPage()
```

The `overview-page.tsx` retains its `"use client"` directive, `adminOverviewQueryOptions()`
consumer, pending/error/success rendering branches, copy, classes, DOM, accessible names,
`Storefront live` badge tone, and all link-button `data-slot="button"` attributes.

Every other moved file retains its existing exports, props, local state, callbacks, motion
configurations (`motion/react` already present and used only by `ledger-lead-figure.tsx`),
copy, classes, DOM, keyboard behaviour, and responsive rules.

The unchanged runtime flow is:

```text
Admin Layout (src/app/admin/layout.tsx)
  -> getStaffAccess() staff authorization of /admin/* segment
  -> AdminOverviewPage (src/app/admin/page.tsx)
  -> OverviewPage client component
  -> useQuery(adminOverviewQueryOptions())
  -> typed Overview browser API
  -> existing versioned Route Handlers
  -> existing Overview module server operations
  -> Prisma
```

The page keeps TanStack Query as remote-state owner; local React state is not present in the
current Overview tree. This cutover introduces no new data source, query key, request, response,
mutation, cache policy, state provider, persistence path, or authorization rule.

## Behaviour and error contract

This is an identity-preserving ownership migration. It must preserve:

- signed-out and insufficient-capability behaviour from the Admin layout (unchanged);
- Overview query loading, pending, error, and populated rendering branches;
- operating-desk header copy, badge tones, headline, description paragraph, quick-action
  button variants, icons, label copy, and `href` targets;
- Today strip, ledger lead figure animation (`motion/react` springs, `prefers-reduced-motion`
  respected), and all figure bands;
- Attention queue card tone, badge tones, item rows, icons, copy, and `href` deep-links;
- Continue working progress bars, per-task copy, resume links, and item chrome;
- Fulfilment lane horizontal stage strip, item badges, ordering, and copy;
- Open orders preview status badges, relative time, images, `href` targets, and CTAs;
- Inventory watch unpublished/draft/low-stock items, images, badge tones, and CTAs;
- Sales pulse compact Naira formatting, card chrome, description copy, and time series;
- Activity stream relative time formatting, item chrome, and ordering;
- NewStoreOverview export and its full onboarding card surface (preserved verbatim despite
  no current external importer; dead-export removal is not this cutover's scope);
- URL parsing, button `data-slot="button"` attributes, link targets, labels, formatting,
  badge tones, copy, classes, DOM, accessibility tree, keyboard/focus behaviour, themes,
  and responsive layout;
- motion/react behaviour, reduced-motion handling, all computed styles, responsive breakpoints,
  container widths, spacing tokens, theme tokens, and the accessibility tree;
- all existing request errors, mutation errors, hydration warnings, deferred-domain notices,
  and route/client error boundaries.

No error handling is added, removed, or reclassified. Any runtime, request/response, cache,
authorization, persistence, DOM, accessibility-tree, computed-style, responsive, or user-visible
change is a regression.

## Ordered implementation boundary

1. Reconfirm exact head, clean scoped paths, the 12 source files, absent destination, the route's
   single Overview import, internal import graph (8 + 1 internal edges), and unused status of
   `data/overview-keys.ts` (no production importer, no colocated test, canonical module keys
   asserted by `admin-domain-keys.test.ts`).
2. Create `src/modules/overview/ui/admin/` and move the 11 named live files there without
   component or helper refactoring. Do not recreate a `data/` subdirectory.
3. Retarget only the moved tree's internal Overview imports to the concrete module UI paths:
   `overview-page.tsx` (8 sibling imports) and `today-strip.tsx` (1 sibling import).
4. Change only the single Overview import in `src/app/admin/page.tsx`; preserve route semantics
   and all other imports (there are none beyond the OverviewPage import).
5. Delete the obsolete `data/overview-keys.ts` file and remove the now-empty legacy `data/`
   directory. Do not replace it or alter canonical Overview module client keys.
6. Prove `src/features/admin/overview` is absent and no live import, alias, re-export, shim,
   forwarding module, or duplicate copy preserves that ownership.
7. Inspect the scoped diff and run focused, repository, and browser validation on the exact head.

Moves should remain content-identical except for required import-prefix replacements and
formatter-only import ordering. No broad formatting pass is authorized.

## Validation and reviewer gates

Run the repository-owned commands on the declared Node 24.x and pnpm 11.13.0 toolchain and retain
the actual outcomes:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test -- src/features/admin/data/admin-domain-keys.test.ts
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
```

The moved Overview tree contains no colocated unit test. `admin-domain-keys.test.ts` is the
contract regression test because it imports the canonical `overviewKeys` from
`@/modules/overview/client/keys` and asserts its shape; this proves the obsolete key file was
not silently required by runtime.

Focused structural evidence must prove:

- all 11 destination files exist and the obsolete `data/overview-keys.ts` does not;
- `src/features/admin/overview` is absent;
- no production or test import resolves through the retired path (no boundary-test literal
  exception exists for Overview, unlike Inventory's Products-boundary string);
- moved files differ from their baseline versions only by approved import-path/order changes;
- `src/app/admin/page.tsx` differs only by its single import target and formatter-only import
  ordering if required (the file has no other imports to order);
- canonical Overview client keys, hooks, contracts, server operations, Route Handlers,
  Prisma/Supabase surfaces, dependencies, and configuration are unchanged;
- Overview module invalidation consumers (`orders`, `holds`, `customers`, `returns`,
  `inventory`, `products`, `settings` client hooks) continue importing from
  `@/modules/overview/client/keys` unchanged;
- the scoped diff contains no unrelated work.

A failure in the moved tree, route, Overview ownership boundary, canonical keys contract, or
named cross-module seam blocks the slice. A broader failure is pre-existing only when it
reproduces on an unchanged comparable baseline. Missing credentials, controlled data, browser
runner, database, or supported toolchain makes the affected gate blocked or skipped, never
passed.

## Browser, accessibility, and responsive acceptance

Against an authorized staff session, inspect `/admin` (Overview route) at 375x812, 768x1024, and
1280x800 in light and dark themes. Compare screenshots with the baseline and inspect console
output, failed requests, hydration warnings, and available server logs. Exercise, where
controlled data permits:

- signed-out (redirect to `/auth/sign-in?next=/admin`) and insufficient-capability layout behaviour;
- pending loading, populated, and request-error states of the Overview query;
- layout composition: header, today strip, attention queue, continue working, fulfilment lane,
  open orders preview, inventory watch, sales pulse, and activity stream;
- quick-action links: storefront preview, attention anchor, catalogue search, Record Sale CTA;
- attention queue and open-orders preview href deep-links into `/admin/orders/*`,
  `/admin/inventory`, `/admin/customers/*`, and sibling routes;
- ledger lead figure springs and reduced-motion respect;
- motion/react animations and reduced-motion fallback behaviour;
- keyboard traversal, visible focus, labels/names, touch targets, contrast, responsive
  transformation, and absence of horizontal overflow.

Any observed difference from the baseline is a regression unless it is solely the non-user-visible
source ownership path.

## Rollback

Rollback is source-only and atomic: move the 11 files back to
`src/features/admin/overview/`, restore their internal legacy prefixes and the route's single
legacy import, and restore the obsolete query-key file and its `data/` directory only if rolling
back to the exact recorded baseline. Remove the module UI destination only after every importer
resolves. Re-run structural, focused, static, and browser checks. A rollback with files in both
owners, forwarding imports, aliases, shims, or partial route cutover is invalid. Do not use a
broad reset or overwrite concurrent work.

## Roles, dependencies, and exclusions

The Planner freezes this design, file inventory, preservation contract, and evidence boundary.
The Frontend Engineer is the sole producer because this slice changes only route/UI ownership and
import paths; no server contract or persistence producer is required. The Reviewer independently
inspects the exact diff and executes or samples structural, static, browser, accessibility,
responsive, and unrelated-work gates. Completion requires an explicit Reviewer **Pass** or
**Pass with evidenced pre-existing issues** verdict.

Explicitly excluded:

- Any server-side, Route Handler, API, schema, contract, Prisma, Supabase, authorization, audit,
  transaction, cache, query-key, mutation, dependency, package, lockfile, configuration,
  migration, seed, or generated-code change.
- Any component split/merge, rename beyond path ownership, export change, directive change,
  type-domain migration, state/query refactor, dead-code cleanup beyond the named obsolete key,
  copy/style/DOM/accessibility/responsive change, or new test behaviour.
- Moving `@/lib/admin/shared/**`, `src/features/admin/shared/**`, `src/features/admin/state/**`,
  Record Sale, Admin shell, Orders UI status badge, Inventory UI, Products UI, or any other
  Admin/Phase 9 surface.
- Adding module barrels, tightening global architecture guards, retiring Admin shared icon or
  lib formatters, or editing the migration tracker in this slice.
- Repairing unrelated Phase 9/10 work or reclassifying earlier validation debt.
- Staging, committing, resetting, deleting, formatting, or overwriting unrelated work.

## Success criteria

- The complete live Admin Overview presentation graph exists only under
  `src/modules/overview/ui/admin/**`; the one obsolete unused query-key file is absent.
- The Admin Overview route imports the concrete module UI path, and no live legacy Overview
  import or compatibility edge remains.
- All observable route, data, query, URL, visual, responsive, theme, motion, accessibility,
  and error behaviour remains unchanged.
- The scoped diff contains only the approved 11 moves, 9 internal import retargets
  (8 in overview-page + 1 in today-strip), 1 route import retarget, 1 obsolete deletion,
  and necessary formatter-only import ordering.
- Exact-head validation is reported truthfully, no newly introduced failure exists, and the
  independent Reviewer returns Pass before the orchestrator may mark the cutover complete.

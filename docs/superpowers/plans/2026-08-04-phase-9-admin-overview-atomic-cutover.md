# Phase 9 Admin Overview Atomic Cutover Implementation Plan

**Date:** 2026-08-04  
**Status:** Approved design translated into an executable plan; source implementation and exact-head acceptance are unexecuted.  

**Authoritative design:** [2026-08-04 Overview Atomic Cutover Design](c:\Users\olaitan\Dev\laitstyles\docs\superpowers\specs\2026-08-04-overview-atomic-cutover-design.md) (lines 1–326)

**Goal:** Retire the complete 12-file legacy Admin Overview presentation tree in one ownership cutover by moving its 11 live files to Overview-owned admin UI, deleting the one isolated obsolete query-key file, and retargeting only approved imports while preserving every observable behavior.

**Architecture:** [src/app/admin/page.tsx](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx) (lines 1–5) remains the staff-authorized Server Component. `src/modules/overview/ui/admin/**` becomes the sole owner of the existing Overview operating desk and presentation graph. Existing Overview client ([src/modules/overview/client/**](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\client)), contracts ([src/modules/overview/types.ts](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\types.ts)), Route Handlers, server operations ([src/modules/overview/server/**](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\server)), Prisma persistence, Admin shared state, Admin shared icon, and Orders UI status badge remain unchanged. This is a UI-only identity migration with no compatibility layer.

**Workflow:** Planner → Frontend Engineer → Reviewer. The Frontend Engineer is the sole implementation producer. The Reviewer is an independent consumer of the completed implementation handoff and must return **Pass** or **Pass with evidenced pre-existing issues** before the orchestrator may report completion. Shortest complete workflow: [ui-change.md](c:\Users\olaitan\Dev\laitstyles\.agents\workflows\ui-change.md) (lines 1–25), authorized because no server data, authorization, or wire contract changes.

**Toolchain:** The repository declares Node 24.x and pnpm 11.13.0 in [package.json](c:\Users\olaitan\Dev\laitstyles\package.json) (lines 5–8). Run the required aggregate commands, retain the actual mismatch result for any existing runner-version contradictions, and do not call an aggregate Node-version failure introduced by existing contradictions a pass.

**Baseline:** The approved design was prepared against HEAD `69286634` on `main`, recording 12 legacy files and 1,030 lines. Current on-disk verification confirms the 12-file legacy tree exists exactly as specified (Grep inventory 2026-08-04).

---

## Acceptance Contract

- All 11 named files move from `src/features/admin/overview/**` to `src/modules/overview/ui/admin/**` with relative structure flattened exactly as approved; only their Overview-internal import prefix and formatter-required import order may change.
- [src/features/admin/overview/data/overview-keys.ts](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\data\overview-keys.ts) is deleted and not recreated. Its obsolete non-canonical `summary()` key shape has no live production importer.
- [src/app/admin/page.tsx](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx) (lines 1–5) changes only its single Overview import target, plus formatter-only ordering of existing imports if required (the file has no other imports to order).
- `src/features/admin/overview` is absent after the cutover; no import, alias, barrel, re-export, shim, forwarding module, facade, or duplicate copy preserves legacy ownership.
- No boundary-test literal exception exists for Overview (unlike Inventory's Products-boundary string); every retired-prefix match in the full `src/` tree is a live import that must cut over.
- `OverviewPage` retains its exact export, `"use client"` directive, `adminOverviewQueryOptions()` consumption, pending/error/success rendering branches, and JSX composition.
- Route authorization via Admin layout ([src/app/admin/layout.tsx](c:\Users\olaitan\Dev\laitstyles\src\app\admin\layout.tsx) staff access), URL deep-links, TanStack Query ownership, API traffic, cache behavior, local state, copy, directives, DOM, classes, accessibility tree, themes, responsive behavior, keyboard/focus behavior, and error states remain unchanged.
- Canonical Overview keys contract in [src/modules/overview/client/keys.ts](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\client\keys.ts) (asserted at [admin-domain-keys.test.ts](c:\Users\olaitan\Dev\laitstyles\src\features\admin\data\admin-domain-keys.test.ts) lines 15–17) is untouched and remains `overviewKeys.detail() => ["admin","overview","detail"]`.
- No server-side, persistence, authentication, contract, dependency, configuration, generated-code, architecture-guard, or migration-tracker file changes.
- The Reviewer independently validates the exact implementation head and returns a formal verdict.

---

## Exact File Map

| Change | Source (absolute) | Destination (absolute) | Import retargets | Owner |
| --- | --- | --- | --- | --- |
| Move | [src/features/admin/overview/activity-stream.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\activity-stream.tsx) | [src/modules/overview/ui/admin/activity-stream.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\activity-stream.tsx) | 0 internal (leaf) | Frontend Engineer |
| Move | [src/features/admin/overview/attention-queue.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\attention-queue.tsx) | [src/modules/overview/ui/admin/attention-queue.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\attention-queue.tsx) | 0 internal (leaf) | Frontend Engineer |
| Move | [src/features/admin/overview/continue-working.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\continue-working.tsx) | [src/modules/overview/ui/admin/continue-working.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\continue-working.tsx) | 0 internal (leaf) | Frontend Engineer |
| Move | [src/features/admin/overview/fulfilment-lane.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\fulfilment-lane.tsx) | [src/modules/overview/ui/admin/fulfilment-lane.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\fulfilment-lane.tsx) | 0 internal (leaf) | Frontend Engineer |
| Move | [src/features/admin/overview/inventory-watch.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\inventory-watch.tsx) | [src/modules/overview/ui/admin/inventory-watch.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\inventory-watch.tsx) | 0 internal (leaf) | Frontend Engineer |
| Move | [src/features/admin/overview/ledger-lead-figure.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\ledger-lead-figure.tsx) | [src/modules/overview/ui/admin/ledger-lead-figure.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\ledger-lead-figure.tsx) | 0 internal (leaf, uses motion/react) | Frontend Engineer |
| Move | [src/features/admin/overview/new-store-overview.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\new-store-overview.tsx) | [src/modules/overview/ui/admin/new-store-overview.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\new-store-overview.tsx) | 0 internal (dead export preserved per spec lines 178–179) | Frontend Engineer |
| Move | [src/features/admin/overview/open-orders-preview.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\open-orders-preview.tsx) | [src/modules/overview/ui/admin/open-orders-preview.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\open-orders-preview.tsx) | 0 internal (leaf, imports OrderStatusBadge from Orders UI) | Frontend Engineer |
| Move | [src/features/admin/overview/overview-page.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\overview-page.tsx) | [src/modules/overview/ui/admin/overview-page.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\overview-page.tsx) | 8 internal siblings (lines 8–15) | Frontend Engineer |
| Move | [src/features/admin/overview/sales-pulse.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\sales-pulse.tsx) | [src/modules/overview/ui/admin/sales-pulse.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\sales-pulse.tsx) | 0 internal (leaf) | Frontend Engineer |
| Move | [src/features/admin/overview/today-strip.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\today-strip.tsx) | [src/modules/overview/ui/admin/today-strip.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\today-strip.tsx) | 1 internal sibling (line 1: ledger-lead-figure) | Frontend Engineer |
| Delete | [src/features/admin/overview/data/overview-keys.ts](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\data\overview-keys.ts) | None (obsolete unused) | N/A | Frontend Engineer |
| Modify 1 import only | [src/app/admin/page.tsx](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx) (line 1) | Same path | `@/features/admin/overview/overview-page` → `@/modules/overview/ui/admin/overview-page` | Frontend Engineer |

**Internal retarget count:** 9 total (8 in overview-page.tsx lines 8–15 + 1 in today-strip.tsx line 1)

---

## Preserved Interfaces and Dependencies

The route must continue to render this exact component contract:

```ts
OverviewPage()
```

No props are passed; [src/app/admin/page.tsx](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx) (lines 1–5) composes the empty JSX: `<OverviewPage />`.

`OverviewPage` retains its exact export signature and `"use client"` directive ([overview-page.tsx](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\overview-page.tsx) lines 1–20):

```ts
"use client";
export function OverviewPage();
```

Allowed preserved dependencies include:
- `@/features/admin/shared/admin-icon` (shared Admin icon — not retired by this slice)
- `@/lib/admin/shared/**` (formatters: `formatNaira`, `formatCompactNaira`, `formatReportingDate`, `formatRelativeTime`; presentation types: `ControlRoomState`, `ControlRoomActivity`, `AttentionItem`, `AttentionTone`, `FulfilmentLaneItem`, `ContinueTask`, `SalesPulsePoint`)
- `@/modules/overview/client/**` (typed browser API calls, `adminOverviewQueryOptions`, keys, hooks, invalidation — unchanged)
- `@/modules/overview/types` (OverviewSnapshot contract and domain types — unchanged)
- `@/modules/orders/ui/admin/order-status-badge.tsx` (existing shared Order status badge consumed by open-orders-preview.tsx — unchanged)

Forbidden new dependencies include Prisma, any `server-only` or `@/modules/**/server/**` module, Supabase server/admin access, Server Actions, direct Route Handler implementation imports, new HTTP clients, new stores, and replacement query keys. The moved UI must not cross these boundaries (doctrine: [frontend-architecture.md](c:\Users\olaitan\Dev\laitstyles\.agents\doctrine\frontend-architecture.md)).

---

### Task 1: Freeze the exact execution baseline

**Owner:** Frontend Engineer (referenced role: [frontend-engineer.md](c:\Users\olaitan\Dev\laitstyles\.agents\roles\frontend-engineer.md))

**Produces:** A baseline evidence record proving the approved source graph is still executable without scope drift.

- [ ] Load the mandatory frontend skills required by [frontend-engineer.md](c:\Users\olaitan\Dev\laitstyles\.agents\roles\frontend-engineer.md) (lines 28–38): `next-best-practices`, `vercel-react-best-practices`, `vercel-composition-patterns`, and `shadcn`. Use `react-doctor` during final self-review.
- [ ] Record branch, exact HEAD, toolchain, full worktree status, and scoped status.

```powershell
$baseline = '69286634'
$legacy = 'src/features/admin/overview'
$destination = 'src/modules/overview/ui/admin'
$route = 'src/app/admin/page.tsx'

git branch --show-current
git rev-parse HEAD
node --version
pnpm --version
git status --short --untracked-files=all
git status --short -- $legacy $destination $route
$files = Get-ChildItem $legacy -Recurse -File | Sort-Object FullName
"legacy-file-count=$($files.Count)"
"legacy-line-count=$((Get-Content $files.FullName | Measure-Object -Line).Lines)"
Test-Path $destination
git diff -- $legacy $destination $route
git ls-tree -r --name-only HEAD -- $legacy
```

Expected: branch `main`; HEAD matches current tip (the approved $baseline `69286634` is the design-preparation reference; if HEAD advanced, verify the 12-file legacy tree and route import at [page.tsx line 1](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx) remain unmodified); Node 24.x per [package.json engines](c:\Users\olaitan\Dev\laitstyles\package.json) (line 7); pnpm 11.13.0 per [package.json packageManager](c:\Users\olaitan\Dev\laitstyles\package.json) (line 5); 12 legacy files; ~1,030 lines; destination `False`; no scoped diff. Approved designs under `docs/superpowers/` may remain untracked and must not be altered, staged, or classified as implementation output.

- [ ] Prove the route has exactly one live external Overview import, all other live legacy imports are internal to the tree, the obsolete key file has no live production importer, and no server-only dependency exists in the legacy presentation tree.

```powershell
rg -n -g '*.ts' -g '*.tsx' '@/features/admin/overview/' src
rg -n -g '*.ts' -g '*.tsx' 'overviewKeys|overview-keys' src/features/admin/overview src/modules/overview
rg -n -g '*.ts' -g '*.tsx' '@/modules/.*/server|@/lib/prisma|server-only|supabase|"use server"' src/features/admin/overview
```

Expected outcomes:
1. Retired-prefix `@/features/admin/overview/` matches:
   - 1 route import in [src/app/admin/page.tsx line 1](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx)
   - 8 sibling imports in [overview-page.tsx lines 8–15](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\overview-page.tsx)
   - 1 sibling import in [today-strip.tsx line 1](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\today-strip.tsx)
   - (No boundary-test literal exception exists for Overview; every match is a live import.)
2. No production import of obsolete `overview-keys`; only the file's own content may reference its non-canonical shape.
3. No server-only dependency pattern in the legacy presentation tree.

Stop and return to the orchestrator if HEAD, scoped cleanliness, counts, destination, importer graph (expected 1 route + 8 overview-page + 1 today-strip = 10 retired-prefix matches), obsolete-pair isolation, or server-boundary evidence differs. Do not silently rebase the approved design onto a different head.

---

### Task 2: Perform the atomic ownership move

**Owner:** Frontend Engineer

**Consumes:** Task 1 baseline evidence accepted by the orchestrator.

**Produces:** One complete moved tree with no partial legacy/module split.

- [ ] Create the destination and move the 11 approved files without opening, formatting, or refactoring their contents. Do not recreate a `data/` subdirectory.

```powershell
$source = 'src/features/admin/overview'
$destination = 'src/modules/overview/ui/admin'
$moveFiles = @(
  'activity-stream.tsx',
  'attention-queue.tsx',
  'continue-working.tsx',
  'fulfilment-lane.tsx',
  'inventory-watch.tsx',
  'ledger-lead-figure.tsx',
  'new-store-overview.tsx',
  'open-orders-preview.tsx',
  'overview-page.tsx',
  'sales-pulse.tsx',
  'today-strip.tsx'
)

New-Item -ItemType Directory -Force -Path $destination | Out-Null
foreach ($name in $moveFiles) {
  Move-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $destination $name)
}
```

Expected: all 11 destination files exist; only `data/overview-keys.ts` remains under the legacy directory. Do not move the obsolete file into the module.

- [ ] In every moved file, replace only the exact import prefix:

```diff
-@/features/admin/overview/
+@/modules/overview/ui/admin/
```

This replacement applies **only** to import declarations inside `src/modules/overview/ui/admin/**`. It affects exactly 9 import statements:
- 8 sibling imports in [overview-page.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\overview-page.tsx) (original lines 8–15: ActivityStream, AttentionQueue, ContinueWorking, FulfilmentLane, InventoryWatch, OpenOrdersPreview, SalesPulse, TodayStrip)
- 1 sibling import in [today-strip.tsx](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\today-strip.tsx) (original line 1: LedgerLeadFigure)

Preserve all imports from `@/features/admin/shared/**` (AdminIcon at [overview-page.tsx line 16](c:\Users\olaitan\Dev\laitstyles\src\features\admin\overview\overview-page.tsx)) and `@/lib/admin/shared/**` exactly. Preserve imports from `@/modules/overview/client/**`, `@/modules/overview/types`, and `@/modules/orders/ui/admin/order-status-badge.tsx` exactly.

- [ ] In [src/app/admin/page.tsx](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx), make exactly this one import-target replacement:

```diff
-import { OverviewPage } from "@/features/admin/overview/overview-page";
+import { OverviewPage } from "@/modules/overview/ui/admin/overview-page";
```

Preserve the default-export Server Component `AdminOverviewPage()` at lines 3–5, its empty `<OverviewPage />` composition, and its zero-props contract. Do not manually reorder imports (the file has only one import).

- [ ] Delete only the obsolete unused query-key file and remove the now-empty legacy directories.

```powershell
Remove-Item -LiteralPath 'src/features/admin/overview/data/overview-keys.ts'
Remove-Item -LiteralPath 'src/features/admin/overview/data'
Remove-Item -LiteralPath 'src/features/admin/overview'
```

Expected: `src/features/admin/overview` is absent. Do not recreate `overviewKeys` or its `summary()` shape; canonical runtime keys remain in [src/modules/overview/client/keys.ts](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\client\keys.ts) unchanged and are asserted at [admin-domain-keys.test.ts lines 15–17](c:\Users\olaitan\Dev\laitstyles\src\features\admin\data\admin-domain-keys.test.ts).

---

### Task 3: Prove structural identity and scope isolation

**Owner:** Frontend Engineer

**Consumes:** Completed atomic move from Task 2.

**Produces:** Structural and diff evidence for the Reviewer; no commit.

- [ ] Prove exact destination inventory, legacy removal, importer cutover, and absence of compatibility edges.

```powershell
$destination = 'src/modules/overview/ui/admin'
$destinationFiles = Get-ChildItem $destination -Recurse -File | Sort-Object Name
"destination-file-count=$($destinationFiles.Count)"
$destinationFiles.FullName
Test-Path 'src/features/admin/overview'
Test-Path 'src/features/admin/overview/data/overview-keys.ts'
rg -n -g '*.ts' -g '*.tsx' '@/features/admin/overview/' src
rg -n -g '*.ts' -g '*.tsx' '@/modules/overview/ui/admin/' src
rg -n -g '*.ts' -g '*.tsx' 'export .* from "@/features/admin/overview|from "@/features/admin/overview|@/features/admin/overview/.*"' src
```

Expected: 11 destination files; both legacy path checks are `False`; **zero** retired-prefix `@/features/admin/overview/` matches anywhere in `src/` (no boundary-test literal exception exists for Overview); live route import at [page.tsx line 1](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx) and all 9 moved-tree internal imports resolve directly to concrete module paths; no barrel, shim, alias, or forwarding edge exists.

- [ ] Compare every moved file to baseline content after normalizing only the approved import prefix. Compare the route after normalizing only its single approved import target.

```powershell
$HEAD = git rev-parse HEAD
$sourcePrefix = 'src/features/admin/overview/'
$destinationPrefix = 'src/modules/overview/ui/admin/'
$moveFiles = @(
  'activity-stream.tsx',
  'attention-queue.tsx',
  'continue-working.tsx',
  'fulfilment-lane.tsx',
  'inventory-watch.tsx',
  'ledger-lead-figure.tsx',
  'new-store-overview.tsx',
  'open-orders-preview.tsx',
  'overview-page.tsx',
  'sales-pulse.tsx',
  'today-strip.tsx'
)
$failures = @()

foreach ($name in $moveFiles) {
  $baselineText = git show "$HEAD`:$sourcePrefix$name"
  $currentText = Get-Content -Raw "$destinationPrefix$name"
  $normalized = $currentText.Replace('@/modules/overview/ui/admin/', '@/features/admin/overview/')
  if (($baselineText -join "`n").TrimEnd("`r", "`n") -ne $normalized.TrimEnd("`r", "`n")) {
    $failures += $name
  }
}
"identity-failures=$($failures -join ',')"

$baselineRoute = (git show "$HEAD`:src/app/admin/page.tsx") -join "`n"
$currentRoute = Get-Content -Raw 'src/app/admin/page.tsx'
$normalizedRoute = $currentRoute.Replace('@/modules/overview/ui/admin/overview-page', '@/features/admin/overview/overview-page')
"route-normalized-match=$($baselineRoute.TrimEnd("`r", "`n") -eq $normalizedRoute.TrimEnd("`r", "`n"))"
```

Expected: `identity-failures=` is empty and `route-normalized-match=True`. If line-ending handling causes a false mismatch, use `git diff --no-index --ignore-space-at-eol` on a temporary baseline copy and retain that evidence; do not rewrite source to force a hash match.

- [ ] Inspect the complete scoped diff and protected surfaces.

```powershell
git diff --check
git diff --stat -- src/features/admin/overview src/modules/overview/ui/admin src/app/admin/page.tsx
git diff --summary --find-renames=50% -- src/features/admin/overview src/modules/overview/ui/admin src/app/admin/page.tsx
git diff -- src/app/admin/page.tsx
git status --short --untracked-files=all
git diff -- package.json pnpm-lock.yaml prisma src/modules/overview/client src/modules/overview/server src/modules/overview/types.ts src/modules/overview/schema.ts src/app/api scripts docs/architecture-migration/migration-tracker.md
```

Expected: only the 11 moves with approved import changes, one obsolete deletion, and one route import retarget appear. Protected surfaces have no diff. The approved design and plan under `docs/superpowers/` may be untracked/modified documentation, but they are not source implementation and must remain unstaged. Do not stage or commit any file.

---

### Task 4: Run focused and repository validation

**Owner:** Frontend Engineer

**Consumes:** Task 3 structural evidence.

**Produces:** Exact command outcomes and evidence paths in the implementation handoff.

- [ ] Run the canonical keys contract test first (the only scoped regression test for the obsolete-key deletion boundary), then the approved repository gates on Node 24.x and pnpm 11.13.0 per [package.json](c:\Users\olaitan\Dev\laitstyles\package.json) (lines 5–8).

```powershell
pnpm test -- src/features/admin/data/admin-domain-keys.test.ts
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
```

Expected outcomes:
- The canonical keys test ([admin-domain-keys.test.ts](c:\Users\olaitan\Dev\laitstyles\src\features\admin\data\admin-domain-keys.test.ts) lines 1–37) passes from its existing path, proving the obsolete file was not silently required at runtime and that `overviewKeys.detail()` continues to equal `["admin","overview","detail"]`.
- `pnpm check:architecture` (composed of 5 sub-scripts at [package.json lines 22–23](c:\Users\olaitan\Dev\laitstyles\package.json)): retain actual result.
- `pnpm biome` (line 15): retain actual result; if scoped Biome reports import ordering only in moved files or the route, apply only that formatter-only ordering to the reported files, rerun Task 3 identity normalization, and rerun the affected gates. Do **not** run `biome:fix` or a repository-wide write formatter.
- `pnpm typecheck` (line 55): retain actual result.
- `pnpm test` (line 56): retain actual result.
- `pnpm build` (line 13): retain actual result.
- `pnpm react-doctor` (line 24): retain actual result.
- `pnpm validate:full` (line 60): must still run, but any existing verification-runner Node-version contradiction against `package.json`'s Node-24 contract must be reported as the exact outcome. Do not edit scripts or configuration, and do not call the aggregate gate passed.

A broader failure is pre-existing only if the same command reproduces on an unchanged comparable baseline under the same supported environment.

- [ ] Do not continue to browser acceptance if a new moved-tree, route, Overview ownership, canonical-keys, build, or cross-module seam failure remains unresolved. Return the finding to the orchestrator for the Frontend Engineer to correct before review.

---

### Task 5: Exercise browser, responsive, theme, and accessibility parity

**Owner:** Frontend Engineer

**Consumes:** Passing focused/static implementation evidence and an available authorized test environment.

**Produces:** Baseline/candidate screenshots, interaction evidence, console/network/server-log evidence, and a truthful blocked/skipped record for unavailable states.

- [ ] Start the built application and prepare storage states for an authorized staff user and, where available, an insufficient-capability staff user. Never fabricate a pass when credentials, database, data, or runner are unavailable.
- [ ] Run the repository browser gate against the exact implementation worktree/head target.

```powershell
pnpm validate:browser
```

The command requires a reachable `PLAYWRIGHT_BASE_URL`. Existing visual and accessibility matrices cover `/admin` at 375×812, 768×1024, and 1280×800, but require valid staff storage state; visual coverage also requires a 40-character source SHA.

- [ ] Compare baseline and candidate at 375×812, 768×1024, and 1280×800 in light and dark themes. Verify no horizontal overflow and inspect console errors, failed requests, hydration warnings, and available server logs.

- [ ] Exercise authorization states where controlled data permits:
  - Signed-out: redirect to `/auth/sign-in?next=/admin` (layout-level — unchanged)
  - Insufficient-capability: layout-level access-denied surface (unchanged)
  - Authorized staff: full Overview operating desk

- [ ] Exercise Overview query states where controlled data permits:
  - Initial pending loading state (spinner/message at [overview-page.tsx lines 23–29](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\overview-page.tsx))
  - Populated success state (full composition: header + today strip + 7 sections in grid)
  - Request-error state (Alert with error copy at [overview-page.tsx lines 30–41](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\ui\admin\overview-page.tsx))

- [ ] Exercise layout composition and interactions:
  - Header: operating-desk copy, badge tone, headline, description, quick-action links (storefront preview `href="/"`, attention anchor `href="#attention"`, catalogue search icon, Record Sale CTA when applicable), button `data-slot="button"` attributes
  - Today strip: 4 figure bands, 2 channel rows, ledger lead figure animation, `prefers-reduced-motion` respect
  - Attention queue: card tone, badge tones, item rows, `href` deep-links into `/admin/orders/*`, `/admin/customers/*`, sibling routes
  - Continue working: progress bars, per-task copy, resume links
  - Fulfilment lane: horizontal stage strip, item badges, ordering
  - Open orders preview: OrderStatusBadge imports, relative time, images, `href` targets, CTAs
  - Inventory watch: unpublished/draft/low-stock items, images, badge tones, CTAs
  - Sales pulse: compact Naira formatting, card chrome, time series
  - Activity stream: relative time formatting, ordering

- [ ] Verify motion/react behaviour in ledger-lead-figure, reduced-motion fallback behaviour, keyboard traversal, visible focus, labels/accessible names, touch targets, contrast, responsive transformation, and absence of horizontal overflow.

Any baseline/candidate difference beyond non-user-visible source ownership paths is a regression. Report unavailable states as **blocked** or **not run** with the exact missing prerequisite, never as passed.

---

### Task 6: Frontend Engineer formal implementation handoff

**Owner:** Frontend Engineer

**Consumer:** Reviewer, only after the orchestrator accepts the handoff as complete.

The handoff must include:

- exact branch and implementation HEAD/worktree identifier, with explicit confirmation that **no commit was created**;
- exact list of 11 moves, 1 deletion, 9 internal import retargets, and 1 route import change;
- normalized identity evidence (Task 3) and any formatter-only import ordering actually applied;
- explicit confirmation that:
  - `src/features/admin/overview` is absent;
  - no retired-prefix `@/features/admin/overview/` live import, alias, barrel, re-export, shim, forwarding module, or duplicate copy remains anywhere in `src/`;
  - no server-only dependency (`@/modules/**/server/**`, Prisma, Supabase server/admin, Server Actions) was introduced into any moved file;
  - canonical Overview keys at [src/modules/overview/client/keys.ts](c:\Users\olaitan\Dev\laitstyles\src\modules\overview\client\keys.ts) and Overview invalidation consumers (orders, holds, customers, returns, inventory, products, settings) are unchanged;
  - protected surfaces (`package.json`, `pnpm-lock.yaml`, `prisma/`, `src/modules/overview/client`, `src/modules/overview/server`, `src/modules/overview/types.ts`, `src/app/api`, `scripts/`, `docs/architecture-migration/migration-tracker.md`) have zero diff;
- preserved route authorization via Admin layout, Server/Client boundaries (OverviewPage `"use client"`, route default export as Server Component), contracts, Query/API/cache behavior, and Orders UI/Admin-icon/Admin-lib dependencies;
- every command run with **passed**, **failed**, **blocked**, **not run**, or **not applicable** status (per [00-authority.md status language](c:\Users\olaitan\Dev\laitstyles\.agents\doctrine\00-authority.md) lines 38–46) and evidence path or console capture;
- browser states, viewports, themes, interactions, API requests, console/network/server logs, and accessibility checks actually exercised;
- all unrelated dirty/untracked paths preserved without staging, formatting, deletion, or overwrite;
- any blocker requiring correction before Reviewer dispatch.

The orchestrator must reject an incomplete handoff and must **not** dispatch the Reviewer while a new implementation failure remains open.

---

### Task 7: Independent exact-head review and verdict

**Owner:** Reviewer (referenced role: [reviewer.md](c:\Users\olaitan\Dev\laitstyles\.agents\roles\reviewer.md))

**Consumes:** The accepted Frontend Engineer handoff and the exact unchanged implementation worktree/head.

**Produces:** Findings with evidence and a formal **Pass**, **Pass with evidenced pre-existing issues**, or **Block** verdict. The Reviewer makes no source edits.

- [ ] Load the mandatory frontend review skills required by [reviewer.md](c:\Users\olaitan\Dev\laitstyles\.agents\roles\reviewer.md) (lines 39–44): `next-best-practices`, `vercel-react-best-practices`, `vercel-composition-patterns`, and `shadcn`. Inspect the approved design, this plan, implementation handoff, actual diff, and full status.
- [ ] Independently rerun or sample the baseline, 11-file destination, obsolete-file deletion, zero retired-prefix matches under `src/`, no-compatibility-edge, normalized identity, route-only-change, server-boundary, protected-surface-zero-diff, whitespace, and unrelated-work checks from Tasks 1 and 3.
- [ ] Independently rerun at minimum:

```powershell
pnpm test -- src/features/admin/data/admin-domain-keys.test.ts
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
```

- [ ] Sample real `/admin` browser parity at all three required viewports (375×812, 768×1024, 1280×800) and both themes, including authorization redirect/denied, pending/error/populated query states, one remote read, key `href` deep-links, ledger motion/reduced-motion, keyboard/focus, console/network health, and screenshot comparison.
- [ ] Classify every failure using [00-authority.md status language](c:\Users\olaitan\Dev\laitstyles\.agents\doctrine\00-authority.md) (lines 38–46). A failure may be called pre-existing only with same-environment, unchanged-baseline reproduction. Any Node-24/package versus verification-runner Node-version contradiction must be reported explicitly if it affects aggregate validation.
- [ ] Return any Critical or Warning finding to the Frontend Engineer through the orchestrator with exact file/line or runtime evidence and required remediation. After correction, repeat the Frontend Engineer handoff and Reviewer gate; do not review a different unrecorded tree.
- [ ] Issue the formal verdict. Completion is forbidden without **Pass** or **Pass with evidenced pre-existing issues** and no blocking finding.

---

## Explicit Exclusions

Authoritative exclusion list per approved design (lines 298–313):

1. **No server-side or infrastructure changes:** Any edit to `src/modules/overview/client/**`, `src/modules/overview/server/**`, `src/modules/overview/schema.ts`, `src/modules/overview/types.ts`, Overview Route Handlers, Prisma, Supabase, auth policy, audit, transactions, cache behavior, dependencies, `package.json`, `pnpm-lock.yaml`, scripts, configuration, migrations, seeds, generated output, architecture guards, or trackers.
2. **No component or behaviour refactors:** No component split, merge, helper extraction, type-domain migration, state/query refactor, export/directive/prop change, error-handling change, copy/style/class/DOM/accessibility/responsive change, or new test behaviour.
3. **No recreation of obsolete keys or canonical key edits:** No recreation of `overviewKeys` or its non-canonical `summary()` shape; no edit to canonical Overview keys or invalidation consumers in orders/holds/customers/returns/inventory/products/settings.
4. **No other Admin surfaces moved:** No move of `@/lib/admin/shared/**`, `src/features/admin/shared/**`, `src/features/admin/state/**`, Admin shared icon, `@/modules/orders/ui/admin/order-status-badge.tsx`, Record Sale, Admin shell, or any other Admin/Phase 9 surface beyond the named 11 Overview files.
5. **No compatibility layer or mixed ownership:** No barrel, alias, shim, re-export, facade, forwarding module, duplicate source, temporary mixed ownership, or partial rollback with files in both owners.
6. **No unrelated work or broad formatting:** No broad formatting pass (`biome:fix` restricted to import-ordering in only the actually reported files), no unrelated cleanup, no debt repair/reclassification, no migration-tracker update in this slice, no staging, no commit, no reset, no branch switch, no alteration of unrelated work.
7. **No Server-side or Backend dispatch:** Their owned surfaces are entirely unchanged; NestJS is not an active runtime for this task. The workflow is Planner → Frontend Engineer → Reviewer only.

---

## Rollback

Rollback is atomic and source-only (approved design lines 279–288):

1. Move the 11 files back from `src/modules/overview/ui/admin/` to `src/features/admin/overview/` with the exact original flat structure.
2. Restore their normalized legacy import prefixes (`@/modules/overview/ui/admin/` → `@/features/admin/overview/`) in the 9 internally-targeted import statements (8 in overview-page, 1 in today-strip).
3. Restore the route's single legacy import at [src/app/admin/page.tsx line 1](c:\Users\olaitan\Dev\laitstyles\src\app\admin\page.tsx): `@/modules/overview/ui/admin/overview-page` → `@/features/admin/overview/overview-page`.
4. Restore the obsolete query-key file and its `data/` subdirectory from the recorded baseline HEAD (only if rolling back to the exact recorded baseline state).
5. Remove `src/modules/overview/ui/admin` **only after every importer resolves** to the restored legacy owner.
6. Re-run structural (Task 3), focused/static (Task 4), and browser (Task 5) checks.

Do not use a broad reset, preserve files under both owners simultaneously, use forwarding imports during transition, or overwrite unrelated work.

---

## Completion Gate

The orchestrator may report this cutover complete **only when**:

1. The Frontend Engineer's formal handoff (Task 6) is accepted as complete with all required evidence.
2. The Reviewer independently validates the **same exact implementation worktree/head** (no concurrent edits between handoff and review).
3. All new moved-tree, route, Overview ownership, canonical-keys, or cross-module-seam failures introduced by the cutover are resolved.
4. Blocked/not-run evidence is reported truthfully per [00-authority.md status language](c:\Users\olaitan\Dev\laitstyles\.agents\doctrine\00-authority.md) (lines 38–46).
5. The Reviewer returns an explicit **Pass** or **Pass with evidenced pre-existing issues** verdict (Task 7).

Planning alone is not implementation evidence.

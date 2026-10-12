# Phase 9 Admin Inventory Atomic Cutover Implementation Plan

**Status:** Approved design translated into an executable plan; source implementation and exact-head acceptance are unexecuted.

**Authoritative design:** `docs/superpowers/specs/2026-08-04-phase-9-admin-inventory-atomic-cutover-design.md`

**Goal:** Retire the complete 32-file legacy Admin Inventory presentation tree in one ownership cutover by moving its 30 live/test files to Inventory-owned admin UI, deleting the two isolated obsolete query-key files, and retargeting only approved imports while preserving every observable behavior.

**Architecture:** `src/app/admin/inventory/page.tsx` remains the staff-authorized Server Component. `src/modules/inventory/ui/admin/**` becomes the sole owner of the existing Inventory workspace and presentation graph. Existing Inventory and Products clients, contracts, Route Handlers, server operations, Prisma persistence, Supabase authorization, Admin shared state, and product-editor UI remain unchanged. This is a UI-only identity migration with no compatibility layer.

**Workflow:** Planner → Frontend Engineer → Reviewer. The Frontend Engineer is the sole implementation producer. The Reviewer is an independent consumer of the completed implementation handoff and must return **Pass** or **Pass with evidenced pre-existing issues** before the orchestrator may report completion.

**Toolchain:** The repository declares Node 24.x and pnpm 11.13.0 in `package.json`. Planning evidence recorded Node v24.18.1 and pnpm 11.13.0. `scripts/ci/run-local-verification.mjs` currently expects Node 25.x despite the repository declaration; do not change either contract in this slice. Run the required aggregate commands, retain the actual mismatch result, and do not call an aggregate Node-version failure introduced by that existing contradiction a pass.

## Acceptance Contract

- All 30 named files move from `src/features/admin/inventory/**` to `src/modules/inventory/ui/admin/**` with relative structure flattened exactly as approved; only their Inventory-internal import prefix and formatter-required import order may change.
- `src/features/admin/inventory/data/inventory-keys.ts` and `src/features/admin/inventory/data/inventory-keys.test.ts` are deleted and not recreated.
- `src/app/admin/inventory/page.tsx` changes only its two Inventory import targets, plus formatter-only ordering of existing imports if required.
- `src/features/admin/inventory` is absent after the cutover; no import, alias, barrel, re-export, shim, forwarding module, facade, or duplicate copy preserves legacy ownership.
- The literal exception `@/features/admin/inventory/catalogue-taxonomy-manager` in `src/modules/products/product-module-boundaries.test.ts` remains unchanged because it is boundary-test data rather than a live import.
- `InventoryWorkspace`, `defaultInventoryPageSize`, `InventoryUrlState`, and `buildInventoryHref` retain their exact exports and contracts.
- Route authorization, URL state, TanStack Query ownership, API traffic, mutations, cache behavior, local state, CSV export, product editor, copy, directives, DOM, classes, accessibility tree, themes, responsive behavior, keyboard/focus behavior, and error states remain unchanged.
- No server-side, persistence, authentication, contract, dependency, configuration, generated-code, architecture-guard, or migration-tracker file changes.
- The Reviewer independently validates the exact implementation head and returns a formal verdict.

## Exact File Map

| Change | Source | Destination | Owner |
| --- | --- | --- | --- |
| Move | `src/features/admin/inventory/inventory-controls.tsx` | `src/modules/inventory/ui/admin/inventory-controls.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-detail-media.tsx` | `src/modules/inventory/ui/admin/inventory-detail-media.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-detail-pricing.tsx` | `src/modules/inventory/ui/admin/inventory-detail-pricing.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-detail-records.tsx` | `src/modules/inventory/ui/admin/inventory-detail-records.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-detail-sheet.tsx` | `src/modules/inventory/ui/admin/inventory-detail-sheet.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-detail-stock.tsx` | `src/modules/inventory/ui/admin/inventory-detail-stock.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-detail-summary.tsx` | `src/modules/inventory/ui/admin/inventory-detail-summary.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-empty-state.tsx` | `src/modules/inventory/ui/admin/inventory-empty-state.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-export-alert.tsx` | `src/modules/inventory/ui/admin/inventory-export-alert.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-export.ts` | `src/modules/inventory/ui/admin/inventory-export.ts` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-filter-fields.tsx` | `src/modules/inventory/ui/admin/inventory-filter-fields.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-grid.tsx` | `src/modules/inventory/ui/admin/inventory-grid.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-intake-queue.tsx` | `src/modules/inventory/ui/admin/inventory-intake-queue.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-labels.ts` | `src/modules/inventory/ui/admin/inventory-labels.ts` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-mobile-list.tsx` | `src/modules/inventory/ui/admin/inventory-mobile-list.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-pagination.tsx` | `src/modules/inventory/ui/admin/inventory-pagination.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-product-card.tsx` | `src/modules/inventory/ui/admin/inventory-product-card.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-product-lifecycle-actions.tsx` | `src/modules/inventory/ui/admin/inventory-product-lifecycle-actions.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-saved-views.tsx` | `src/modules/inventory/ui/admin/inventory-saved-views.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-selection-bar.tsx` | `src/modules/inventory/ui/admin/inventory-selection-bar.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-status-badge.tsx` | `src/modules/inventory/ui/admin/inventory-status-badge.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-summary-strip.tsx` | `src/modules/inventory/ui/admin/inventory-summary-strip.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-table.tsx` | `src/modules/inventory/ui/admin/inventory-table.tsx` | Frontend Engineer |
| Move and retarget test import | `src/features/admin/inventory/inventory-url.test.ts` | `src/modules/inventory/ui/admin/inventory-url.test.ts` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-url.ts` | `src/modules/inventory/ui/admin/inventory-url.ts` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-workspace-header.tsx` | `src/modules/inventory/ui/admin/inventory-workspace-header.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/inventory-workspace.tsx` | `src/modules/inventory/ui/admin/inventory-workspace.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/product-media-sidebar.tsx` | `src/modules/inventory/ui/admin/product-media-sidebar.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/product-media-stage.tsx` | `src/modules/inventory/ui/admin/product-media-stage.tsx` | Frontend Engineer |
| Move | `src/features/admin/inventory/product-media-viewer.tsx` | `src/modules/inventory/ui/admin/product-media-viewer.tsx` | Frontend Engineer |
| Delete | `src/features/admin/inventory/data/inventory-keys.ts` | None | Frontend Engineer |
| Delete | `src/features/admin/inventory/data/inventory-keys.test.ts` | None | Frontend Engineer |
| Modify two imports only | `src/app/admin/inventory/page.tsx` | Same path | Frontend Engineer |
| Preserve literal exception | `src/modules/products/product-module-boundaries.test.ts` | Same path; no edit | Reviewer evidence only |

## Preserved Interfaces and Dependencies

The route must continue to render this exact component contract:

```ts
InventoryWorkspace({
  initialQuery,
  initialPresentation,
  initialOpenProductId,
  initialPage,
  initialPageSize,
})
```

The URL module must retain:

```ts
export const defaultInventoryPageSize = 15;
export type InventoryUrlState = {
  query: InventoryQuery;
  presentation: InventoryPresentation;
  productId: string | null;
  page: number;
  pageSize: number;
};
export function buildInventoryHref(pathname: string, state: InventoryUrlState): string;
```

Allowed preserved dependencies include `@/features/admin/shared/admin-icon`, `@/features/admin/state/admin-provider`, `@/lib/admin/inventory/**`, `@/lib/admin/shared/**`, `@/modules/inventory/client/**`, `@/modules/inventory/types`, `@/modules/products/client/**`, and `@/modules/products/ui/admin/product-editor/**`. Do not move or rewrite those dependencies.

Forbidden new dependencies include Prisma, any `server-only` or `@/modules/**/server/**` module, Supabase server/admin access, Server Actions, direct Route Handler implementation imports, new HTTP clients, new stores, and replacement query keys.

---

### Task 1: Freeze the exact execution baseline

**Owner:** Frontend Engineer

**Produces:** A baseline evidence record proving the approved source graph is still executable without scope drift.

- [ ] Load the mandatory frontend skills required by `.agents/roles/frontend-engineer.md`: `next-best-practices`, `vercel-react-best-practices`, `vercel-composition-patterns`, and `shadcn`. Use `react-doctor` during final self-review.
- [ ] Record branch, exact HEAD, toolchain, full worktree status, and scoped status.

```powershell
$baseline = '69286634a58b8f1fcd441beaf21aaee0690ea4b0'
$legacy = 'src/features/admin/inventory'
$destination = 'src/modules/inventory/ui/admin'
$route = 'src/app/admin/inventory/page.tsx'

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

Expected: branch `main`; exact HEAD `69286634a58b8f1fcd441beaf21aaee0690ea4b0`; Node 24.x; pnpm 11.13.0; 32 legacy files; 3,059 lines; destination `False`; no scoped diff. The approved design may remain untracked and must not be altered, staged, or classified as implementation output.

- [ ] Prove the route has exactly two live external Inventory imports, all other live legacy imports are internal to the tree, the Products boundary-test literal is the sole declared exception outside the tree, and the obsolete key pair imports only itself.

```powershell
rg -n -g '*.ts' -g '*.tsx' '@/features/admin/inventory/' src
rg -n -g '*.ts' -g '*.tsx' 'inventoryKeys|productKeys' src/features/admin/inventory src/modules/inventory src/modules/products
rg -n -g '*.ts' -g '*.tsx' '@/modules/.*/server|@/lib/prisma|server-only|supabase|"use server"' src/features/admin/inventory
```

Expected: two route imports; internal presentation imports plus the URL test import and obsolete key-test import; one non-import Products boundary-test string; no server-only dependency in the legacy presentation tree. Stop and return to the orchestrator if HEAD, scoped cleanliness, counts, destination, importer graph, obsolete-pair isolation, or server-boundary evidence differs. Do not silently rebase the approved design onto a different head.

---

### Task 2: Perform the atomic ownership move

**Owner:** Frontend Engineer

**Consumes:** Task 1 baseline evidence accepted by the orchestrator.

**Produces:** One complete moved tree with no partial legacy/module split.

- [ ] Create the destination and move the 30 approved files without opening, formatting, or refactoring their contents.

```powershell
$source = 'src/features/admin/inventory'
$destination = 'src/modules/inventory/ui/admin'
$moveFiles = @(
  'inventory-controls.tsx',
  'inventory-detail-media.tsx',
  'inventory-detail-pricing.tsx',
  'inventory-detail-records.tsx',
  'inventory-detail-sheet.tsx',
  'inventory-detail-stock.tsx',
  'inventory-detail-summary.tsx',
  'inventory-empty-state.tsx',
  'inventory-export-alert.tsx',
  'inventory-export.ts',
  'inventory-filter-fields.tsx',
  'inventory-grid.tsx',
  'inventory-intake-queue.tsx',
  'inventory-labels.ts',
  'inventory-mobile-list.tsx',
  'inventory-pagination.tsx',
  'inventory-product-card.tsx',
  'inventory-product-lifecycle-actions.tsx',
  'inventory-saved-views.tsx',
  'inventory-selection-bar.tsx',
  'inventory-status-badge.tsx',
  'inventory-summary-strip.tsx',
  'inventory-table.tsx',
  'inventory-url.test.ts',
  'inventory-url.ts',
  'inventory-workspace-header.tsx',
  'inventory-workspace.tsx',
  'product-media-sidebar.tsx',
  'product-media-stage.tsx',
  'product-media-viewer.tsx'
)

New-Item -ItemType Directory -Force -Path $destination | Out-Null
foreach ($name in $moveFiles) {
  Move-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $destination $name)
}
```

Expected: all 30 destination files exist; only `data/inventory-keys.ts` and `data/inventory-keys.test.ts` remain under the legacy directory. Do not move the obsolete pair into the module.

- [ ] In every moved file, replace only the exact import prefix:

```diff
-@/features/admin/inventory/
+@/modules/inventory/ui/admin/
```

This replacement applies only to import declarations inside `src/modules/inventory/ui/admin/**`, including `inventory-url.test.ts`. Preserve all imports from `@/features/admin/shared/**` and `@/features/admin/state/**` exactly.

- [ ] In `src/app/admin/inventory/page.tsx`, make exactly these two import-target replacements:

```diff
-import { defaultInventoryPageSize } from "@/features/admin/inventory/inventory-url";
-import { InventoryWorkspace } from "@/features/admin/inventory/inventory-workspace";
+import { defaultInventoryPageSize } from "@/modules/inventory/ui/admin/inventory-url";
+import { InventoryWorkspace } from "@/modules/inventory/ui/admin/inventory-workspace";
```

Preserve `getStaffAccess("inventory:read")`, `AdminAccessDenied`, search-parameter parsing, validation, defaults, props, and JSX. Do not manually reorder imports unless a scoped Biome check requires formatter-only ordering.

- [ ] Delete only the obsolete test-local query-key pair and remove the now-empty legacy directories.

```powershell
Remove-Item -LiteralPath 'src/features/admin/inventory/data/inventory-keys.ts'
Remove-Item -LiteralPath 'src/features/admin/inventory/data/inventory-keys.test.ts'
Remove-Item -LiteralPath 'src/features/admin/inventory/data'
Remove-Item -LiteralPath 'src/features/admin/inventory'
```

Expected: `src/features/admin/inventory` is absent. Do not recreate `inventoryKeys` or `productKeys`; canonical runtime keys remain in `src/modules/inventory/client/keys.ts` and `src/modules/products/client/keys.ts` unchanged.

---

### Task 3: Prove structural identity and scope isolation

**Owner:** Frontend Engineer

**Consumes:** Completed atomic move from Task 2.

**Produces:** Structural and diff evidence for the Reviewer; no commit.

- [ ] Prove exact destination inventory, legacy removal, importer cutover, and absence of compatibility edges.

```powershell
$destination = 'src/modules/inventory/ui/admin'
$destinationFiles = Get-ChildItem $destination -Recurse -File | Sort-Object Name
"destination-file-count=$($destinationFiles.Count)"
$destinationFiles.FullName
Test-Path 'src/features/admin/inventory'
Test-Path 'src/features/admin/inventory/data/inventory-keys.ts'
Test-Path 'src/features/admin/inventory/data/inventory-keys.test.ts'
rg -n -g '*.ts' -g '*.tsx' '@/features/admin/inventory/' src
rg -n -g '*.ts' -g '*.tsx' '@/modules/inventory/ui/admin/' src
rg -n -g '*.ts' -g '*.tsx' 'export .* from "@/features/admin/inventory|from "@/features/admin/inventory|@/features/admin/inventory/.*"' src
```

Expected: 30 destination files; all three legacy path checks are `False`; the only retired-prefix match is the unchanged Products boundary-test literal; live route and moved-tree imports resolve directly to concrete module paths; no barrel, shim, alias, or forwarding edge exists.

- [ ] Compare every moved file to baseline content after normalizing only the approved import prefix. Compare the route after normalizing only its two approved import targets.

```powershell
$baseline = '69286634a58b8f1fcd441beaf21aaee0690ea4b0'
$sourcePrefix = 'src/features/admin/inventory/'
$destinationPrefix = 'src/modules/inventory/ui/admin/'
$moveFiles = Get-ChildItem 'src/modules/inventory/ui/admin' -File | ForEach-Object Name
$failures = @()

foreach ($name in $moveFiles) {
  $baselineText = git show "$baseline`:$sourcePrefix$name"
  $currentText = Get-Content -Raw "$destinationPrefix$name"
  $normalized = $currentText.Replace('@/modules/inventory/ui/admin/', '@/features/admin/inventory/')
  if (($baselineText -join "`n").TrimEnd("`r", "`n") -ne $normalized.TrimEnd("`r", "`n")) {
    $failures += $name
  }
}
"identity-failures=$($failures -join ',')"

$baselineRoute = (git show "$baseline`:src/app/admin/inventory/page.tsx") -join "`n"
$currentRoute = Get-Content -Raw 'src/app/admin/inventory/page.tsx'
$normalizedRoute = $currentRoute.Replace('@/modules/inventory/ui/admin/inventory-url', '@/features/admin/inventory/inventory-url').Replace('@/modules/inventory/ui/admin/inventory-workspace', '@/features/admin/inventory/inventory-workspace')
"route-normalized-match=$($baselineRoute.TrimEnd("`r", "`n") -eq $normalizedRoute.TrimEnd("`r", "`n"))"
```

Expected: `identity-failures=` is empty and `route-normalized-match=True`. If line-ending handling causes a false mismatch, use `git diff --no-index --ignore-space-at-eol` on a temporary baseline copy and retain that evidence; do not rewrite source to force a hash match.

- [ ] Inspect the complete scoped diff and protected surfaces.

```powershell
git diff --check
git diff --stat -- src/features/admin/inventory src/modules/inventory/ui/admin src/app/admin/inventory/page.tsx
git diff --summary --find-renames=50% -- src/features/admin/inventory src/modules/inventory/ui/admin src/app/admin/inventory/page.tsx
git diff -- src/app/admin/inventory/page.tsx
git status --short --untracked-files=all
git diff -- package.json pnpm-lock.yaml prisma src/modules/inventory/client src/modules/inventory/server src/modules/inventory/schema.ts src/modules/inventory/types.ts src/modules/products src/app/api scripts
```

Expected: only the 30 moves with approved import changes, two obsolete deletions, and route import retargets appear. Protected surfaces have no diff. The approved design and plan may be untracked/modified documentation, but they are not source implementation and must remain unstaged. Do not stage or commit any file.

---

### Task 4: Run focused and repository validation

**Owner:** Frontend Engineer

**Consumes:** Task 3 structural evidence.

**Produces:** Exact command outcomes and evidence paths in the implementation handoff.

- [ ] Run the moved URL test first, then the approved repository gates on Node 24.x and pnpm 11.13.0.

```powershell
pnpm test -- src/modules/inventory/ui/admin/inventory-url.test.ts
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
```

Expected: the moved URL test passes from its new path; architecture, Biome, typecheck, unit, build, and React Doctor outcomes are retained separately. `pnpm validate:full` must still run, but the current verification runner's Node-25 assertion conflicts with `package.json`'s Node-24 contract and may fail before or alongside its suites. Report that exact outcome; do not edit scripts/configuration or call the aggregate gate passed. A broader failure is pre-existing only if the same command reproduces on an unchanged comparable baseline under the same supported environment.

- [ ] If scoped Biome reports import ordering in moved files or the route, apply only that formatter-required ordering to the reported files, rerun Task 3 identity normalization, and rerun the affected gates. Do not run a repository-wide write formatter.

- [ ] Do not continue to browser acceptance if a new moved-tree, route, Inventory ownership, URL, build, or cross-module seam failure remains unresolved. Return the finding to the orchestrator for the Frontend Engineer to correct before review.

---

### Task 5: Exercise browser, responsive, theme, and accessibility parity

**Owner:** Frontend Engineer

**Consumes:** Passing focused/static implementation evidence and an available authorized test environment.

**Produces:** Baseline/candidate screenshots, interaction evidence, console/network/server-log evidence, and a truthful blocked/skipped record for unavailable states.

- [ ] Start the built application against controlled Inventory data and prepare storage states for an authorized staff user and, where available, an insufficient-capability staff user. Never fabricate a pass when credentials, database, data, or runner are unavailable.
- [ ] Run the repository browser gate against the exact implementation worktree/head target.

```powershell
pnpm validate:browser
```

The command requires a reachable `PLAYWRIGHT_BASE_URL`. Existing visual and accessibility matrices cover `/admin/inventory` at 375×812, 768×1024, and 1280×800, but require valid `PHASE_1_6_STAFF_STORAGE_STATE`; visual coverage also requires a 40-character `PHASE_1_6_SOURCE_SHA`.

- [ ] Compare baseline and candidate at 375×812, 768×1024, and 1280×800 in light and dark themes. Verify no horizontal overflow and inspect console errors, failed requests, hydration warnings, and available server logs.
- [ ] Exercise signed-out and insufficient-capability behavior; initial loading, populated, empty, filtered-empty, and request-error states where controlled data or interception permits.
- [ ] Exercise saved views, search, all filters, sort, grid/table switch, pagination, page-size changes, URL restoration, deep-linked product opening, page clamping, reset, intake queue, mobile list, desktop grid/table, single/multi-select, and CSV export.
- [ ] Exercise detail tabs, stock movement loading, lifecycle confirmation/success/error, product-editor launch, deferred Orders/Holds/Reviews/Activity notices, media open/close, thumbnails, arrow navigation, zoom, shortcuts, and clipboard success/error feedback.
- [ ] Verify keyboard traversal, visible focus, accessible names/labels, sheet/dialog containment and focus return, touch targets, contrast, reduced motion, constrained-height overflow, and unchanged accessibility tree.

Any baseline/candidate difference beyond source ownership is a regression. Report unavailable states as **blocked** or **not run** with the exact missing prerequisite, never as passed.

---

### Task 6: Frontend Engineer formal implementation handoff

**Owner:** Frontend Engineer

**Consumer:** Reviewer, only after the orchestrator accepts the handoff as complete.

The handoff must include:

- exact branch and implementation HEAD/worktree identifier, with confirmation that no commit was created;
- exact list of 30 moves, two deletions, and route import changes;
- normalized identity evidence and any formatter-only import ordering;
- confirmation that no legacy ownership, compatibility edge, server-only dependency, canonical key replacement, or protected-surface diff exists;
- preserved route authorization, Server/Client boundaries, contracts, Query/API/cache/state behavior, and product-editor dependencies;
- every command run with **passed**, **failed**, **blocked**, **not run**, or **not applicable** status and evidence path;
- browser states, viewports, themes, interactions, API requests, console/network/server logs, and accessibility checks actually exercised;
- all unrelated dirty/untracked paths preserved without staging, formatting, deletion, or overwrite;
- any blocker requiring correction before Reviewer dispatch.

The orchestrator must reject an incomplete handoff and must not dispatch the Reviewer while a new implementation failure remains open.

---

### Task 7: Independent exact-head review and verdict

**Owner:** Reviewer

**Consumes:** The accepted Frontend Engineer handoff and the exact unchanged implementation worktree/head.

**Produces:** Findings with evidence and a formal **Pass**, **Pass with evidenced pre-existing issues**, or **Block** verdict. The Reviewer makes no source edits.

- [ ] Load the frontend review skills required by `.agents/roles/reviewer.md` and inspect the approved design, this plan, implementation handoff, actual diff, and full status.
- [ ] Independently rerun or sample the baseline, 30-file destination, obsolete-pair deletion, legacy-prefix, no-compatibility-edge, normalized identity, route-only, server-boundary, protected-surface, whitespace, and unrelated-work checks from Tasks 1 and 3.
- [ ] Independently rerun at minimum:

```powershell
pnpm test -- src/modules/inventory/ui/admin/inventory-url.test.ts
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
```

- [ ] Sample real `/admin/inventory` browser parity at all three required viewports and both themes, including authorization, URL state, one remote read, one available mutation path, detail/media interaction, keyboard/focus behavior, console/network health, and screenshot comparison.
- [ ] Classify every failure using repository doctrine. A failure may be called pre-existing only with same-environment, unchanged-baseline reproduction. The Node-24/package versus Node-25/verification-runner contradiction must be reported explicitly if it affects aggregate validation.
- [ ] Return any Critical or Warning finding to the Frontend Engineer through the orchestrator with exact file/line or runtime evidence and required remediation. After correction, repeat the Frontend Engineer handoff and Reviewer gate; do not review a different unrecorded tree.
- [ ] Issue the formal verdict. Completion is forbidden without **Pass** or **Pass with evidenced pre-existing issues** and no blocking finding.

## Explicit Exclusions

- No edit to `src/modules/inventory/client/**`, `src/modules/inventory/server/**`, `src/modules/inventory/schema.ts`, `src/modules/inventory/types.ts`, Inventory Route Handlers, Products contracts/client/server/UI, Prisma, Supabase, auth policy, audit, transactions, cache behavior, dependencies, `package.json`, `pnpm-lock.yaml`, scripts, configuration, migrations, seeds, generated output, guards, or trackers.
- No move of `src/lib/admin/inventory/**`, `src/features/admin/shared/**`, `src/features/admin/state/**`, Product editor UI, Admin shell, Overview Inventory watch, Record Sale, or any other Admin/Phase 9 surface.
- No component split, merge, helper extraction, type-domain migration, state/query refactor, export/directive/prop change, error-handling change, copy/style/class/DOM/accessibility/responsive change, or new test behavior.
- No recreation of the obsolete query keys, no change to canonical Inventory or Products query keys, and no edit to the Products boundary-test exception string.
- No barrel, alias, shim, re-export, facade, forwarding module, duplicate source, temporary mixed ownership, or partial rollback.
- No broad formatting, unrelated cleanup, debt repair/reclassification, migration-tracker update, staging, commit, reset, branch switch, or alteration of unrelated work.
- No Server-side Engineer or Backend Engineer dispatch; their owned surfaces are unchanged, and NestJS is not an active runtime for this task.

## Rollback

Rollback is atomic and source-only: move the 30 files back to `src/features/admin/inventory/`, restore their normalized legacy import prefixes, restore the route's two legacy imports, and restore the obsolete pair from baseline `69286634a58b8f1fcd441beaf21aaee0690ea4b0`. Remove `src/modules/inventory/ui/admin` only after every importer resolves to the restored owner. Re-run structural, focused, repository, and browser checks. Do not use a broad reset, preserve files under both owners, or overwrite unrelated work.

## Completion Gate

The orchestrator may report this cutover complete only when the Frontend Engineer's formal handoff is accepted, the Reviewer validates the same exact implementation tree, all new failures are resolved, blocked/not-run evidence is reported truthfully, and the Reviewer returns **Pass** or **Pass with evidenced pre-existing issues**. Planning alone is not implementation evidence.

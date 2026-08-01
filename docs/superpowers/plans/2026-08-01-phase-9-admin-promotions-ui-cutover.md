# Phase 9 Admin Promotions UI Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the admin coupon workspace to Promotions-owned UI without changing its bytes, behaviour, presentation, contracts, or route semantics.

**Architecture:** Relocate the existing Client Component from legacy admin composition to `src/modules/promotions/ui/admin`, whose Promotions client contracts it already consumes. Keep `src/app/admin/promotions/page.tsx` as the thin Server Component that authorizes, loads its initial list, derives `canManage`, and composes the moved UI; alter only its workspace import target, with an explicitly pre-authorized Biome-only ordering of the route's five existing imports if Biome requires it. No compatibility edge remains under `src/features/**`.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript 5, Vitest 4.1.10, Playwright 1.61.1, Biome 2.5.3, pnpm 11.13.0, Node 25.x.

## Global Constraints

- Work only on `agent/storefront-checkout-delivery-promotions-redesign`; record the starting commit and do not switch branches.
- The repository contract is Node `25.x` and `pnpm@11.13.0`; do not change `package.json`, engines, dependencies, or `pnpm-lock.yaml` to accommodate a local runtime. The approved design recorded Node `v24.14.0` / pnpm `11.9.0` as unsupported; record the actual `node --version` and `pnpm --version` at execution, and treat that result (or any other non-contract version) as blocked validation rather than a pass.
- Source baseline: `src/features/admin/promotions/promotions-workspace.tsx` is exactly 22,000 bytes, 584 lines, SHA-256 `3C6E4D561707BCCD536489CDF41679BE9F0F6B93D5D8EC5DD834806F6A66775F`. The destination `src/modules/promotions/ui/admin/promotions-workspace.tsx` is absent at baseline.
- Preserve every byte of `PromotionsWorkspace`: no formatting, import reordering, refactor, helper extraction, copy/class/JSX/a11y/responsive/state/form/query/mutation/toast/error or behaviour change. Preserve the named Client Component contract `PromotionsWorkspace({ canManage, initialData }: { canManage: boolean; initialData: PromotionCouponList })`.
- `src/app/admin/promotions/page.tsx` is the one external legacy importer. Change its import from `@/features/admin/promotions/promotions-workspace` to `@/modules/promotions/ui/admin/promotions-workspace`; preserve its signed-out redirect, capability redirect, `listPromotionCoupons()` read, `canManage` derivation, props, and JSX.
- The user has pre-authorized only a Biome-required reordering of the five existing route imports. It must add, remove, or semantically change no import or route code, and must be recorded in the execution/reviewer documentation if it occurs.
- Remove the old file. Do not add a shim, re-export, alias, barrel, forwarding module, facade, or duplicate copy.
- The shared worktree has unrelated modified and untracked work. Before editing and before staging, inspect `git status --short --untracked-files=all`; never format, delete, stage, commit, restore, overwrite, or classify unrelated paths as this cutover's work.
- Do not edit tests, architecture guards, progress or migration trackers, configuration, generated output, schema/types/client/server/API/policy/cache code, Prisma, Supabase, shared UI, CSS, or any source file outside the three exact paths in the file map. Existing `schema.test.ts` is validation evidence only.
- Earlier exact-head, private-runner, browser, and visual-validation debt remains debt. This slice neither clears nor waives it; failed broader gates need unchanged-baseline causality evidence before being called pre-existing.

## File and ownership map

| Layer | File | Change | Owner |
| --- | --- | --- | --- |
| Promotions domain UI | `src/features/admin/promotions/promotions-workspace.tsx` -> `src/modules/promotions/ui/admin/promotions-workspace.tsx` | R100 byte-identical rename; retire legacy ownership | UI engineer |
| App composition | `src/app/admin/promotions/page.tsx` | Replace the workspace import target; optionally order only its five existing imports if scoped Biome requires it | UI engineer |
| Promotions schema | `src/modules/promotions/schema.test.ts` | Unchanged focused coupon-input validation evidence | UI engineer / reviewer |
| Promotions client, server, types, API, Prisma, Supabase | None | Existing contracts and transport remain unchanged | Not required |
| Validation and evidence | No source files | Structural identity, exact-head gates, browser parity, dirty-work isolation, and causality review | Reviewer |

## Explicit exclusions

- No component redesign, copy change, JSX/class/style/theme/breakpoint/a11y change, component split, state or form change, or mutation/query/cache/error/toast behaviour change.
- No Promotions schema, types, typed API client, TanStack hook, server operation, authorization/policy, Route Handler, Server Action, request/response, audit, session, redirect, Prisma, Supabase, or persistence change.
- No test rewrite or creation, shared primitive, store, hook, action, handler, dependency, configuration, generated file, migration, guard, tracker, readiness, or progress-document change, except the narrowly required execution-record reconciliation below if Biome actually reorders route imports.
- No migration of another legacy feature, admin screen, or Phase 9 slice; no repair or reclassification of earlier validation debt.
- No staging, committing, or alteration of unrelated dirty work. Task 1 commits only this cutover; Task 2 makes no source changes.

---

### Task 1: Perform and commit the byte-identical Promotions UI ownership cutover

**Owner:** UI engineer

**Files:**
- Move: `src/features/admin/promotions/promotions-workspace.tsx` -> `src/modules/promotions/ui/admin/promotions-workspace.tsx`
- Modify: `src/app/admin/promotions/page.tsx:2`
- Test: Existing `src/modules/promotions/schema.test.ts`; no test file change

**Interfaces:**
- Consumes: `PromotionCouponList` from `@/modules/promotions/types`, the existing Promotions typed browser API and mutations already imported by the moved Client Component, plus the route's `getCurrentSession()`, `hasCapability()`, and `listPromotionCoupons()` calls.
- Produces: named Client Component `PromotionsWorkspace({ canManage, initialData }: { canManage: boolean; initialData: PromotionCouponList })` at `@/modules/promotions/ui/admin/promotions-workspace`.
- Route contract: `PromotionsPage` continues to redirect non-staff users to `/auth/sign-in?next=/admin/promotions`, redirect staff without `settings:read` to `/admin`, read `listPromotionCoupons()`, derive `settings:update`, and render unchanged props into `PromotionsWorkspace`.

- [ ] **Step 1: Record the supported-toolchain status and verify the live scoped baseline**

Run:

```powershell
git branch --show-current
git rev-parse HEAD
node --version
pnpm --version
git status --short --untracked-files=all
git diff -- src/features/admin/promotions/promotions-workspace.tsx src/app/admin/promotions/page.tsx
(Get-FileHash src/features/admin/promotions/promotions-workspace.tsx -Algorithm SHA256).Hash
(Get-Item src/features/admin/promotions/promotions-workspace.tsx).Length
(Get-Content src/features/admin/promotions/promotions-workspace.tsx).Count
rg -n '@/features/admin/promotions/promotions-workspace' src tests scripts
Test-Path src/modules/promotions/ui/admin/promotions-workspace.tsx
```

Expected: branch is `agent/storefront-checkout-delivery-promotions-redesign`; record its exact HEAD; both scoped files have no pre-existing diff; hash is `3C6E4D561707BCCD536489CDF41679BE9F0F6B93D5D8EC5DD834806F6A66775F`; size is `22000`; line count is `584`; the legacy import has exactly one match at `src/app/admin/promotions/page.tsx:2`; destination is `False`. Record the actual runtime versions. Node `25.x` and pnpm `11.13.0` are required for passing validation; a Node-24/pnpm-11.9 result, the planning-host Node-26.5/pnpm-11.9 result, or another mismatch is unsupported and must be reported honestly. Stop and return to the orchestrator if the branch, scoped diff, identity baseline, importer count, or destination condition differs. Preserve every unrelated status entry.

- [ ] **Step 2: Move the workspace without transforming its contents**

Run:

```powershell
New-Item -ItemType Directory -Force -Path src/modules/promotions/ui/admin | Out-Null
Move-Item -LiteralPath src/features/admin/promotions/promotions-workspace.tsx -Destination src/modules/promotions/ui/admin/promotions-workspace.tsx
```

Expected: the legacy path is absent and the module destination exists. Do not open-save, format, or otherwise rewrite the moved file.

- [ ] **Step 3: Replace only the route import target**

Apply this exact initial diff to `src/app/admin/promotions/page.tsx`:

```diff
-import { PromotionsWorkspace } from "@/features/admin/promotions/promotions-workspace";
+import { PromotionsWorkspace } from "@/modules/promotions/ui/admin/promotions-workspace";
```

Expected: no redirect, session/capability call, initial data read, prop, JSX, or route behaviour changes. Do not reorder the imports manually at this step.

- [ ] **Step 4: Run focused coupon-schema coverage and scoped Biome, using local binaries only when `pnpm exec` cannot resolve**

Run on Node 25.x and pnpm 11.13.0:

```powershell
pnpm exec vitest run src/modules/promotions/schema.test.ts
pnpm exec biome check src/app/admin/promotions/page.tsx src/modules/promotions/ui/admin/promotions-workspace.tsx
```

If either `pnpm exec` invocation cannot resolve its executable, run only its direct local equivalent and record the fallback plus original resolution failure:

```powershell
.\node_modules\.bin\vitest.cmd run src/modules/promotions/schema.test.ts
.\node_modules\.bin\biome.cmd check src/app/admin/promotions/page.tsx src/modules/promotions/ui/admin/promotions-workspace.tsx
```

Expected: the existing schema test file passes; do not claim a numerical assertion count unless the command output proves it. The scoped Biome check exits `0`. The schema test confirms coupon-input validation remains available but is not workspace-parity evidence. A non-contract Node/pnpm environment may produce diagnostic output only and cannot be recorded as a supported pass.

- [ ] **Step 5: Apply only the approved Biome formatter exception when the scoped Biome output requires it**

If and only if Step 4 reports route import ordering, run:

```powershell
pnpm exec biome check --write src/app/admin/promotions/page.tsx
git diff -- src/app/admin/promotions/page.tsx
```

If `pnpm exec biome` cannot resolve, use:

```powershell
.\node_modules\.bin\biome.cmd check --write src/app/admin/promotions/page.tsx
git diff -- src/app/admin/promotions/page.tsx
```

Expected: the route diff contains only the required workspace-path replacement and reordering of its five pre-existing imports. It does not add or remove an import, modify route statements, or touch the moved workspace. If Biome changes any other route content or any other path, restore only the unexpected scoped edit, stop, and report the deviation rather than broad-formatting the worktree. If no ordering diagnostic occurred, do not run a write formatter.

- [ ] **Step 6: Prove structural identity, sole-consumer cutover, and dirty-work isolation**

Run:

```powershell
Test-Path src/features/admin/promotions/promotions-workspace.tsx
Test-Path src/modules/promotions/ui/admin/promotions-workspace.tsx
(Get-FileHash src/modules/promotions/ui/admin/promotions-workspace.tsx -Algorithm SHA256).Hash
(Get-Item src/modules/promotions/ui/admin/promotions-workspace.tsx).Length
(Get-Content src/modules/promotions/ui/admin/promotions-workspace.tsx).Count
rg -n '@/features/admin/promotions/promotions-workspace' src tests scripts
rg -n 'PromotionsWorkspace' src/app src/modules src/features
git diff -- src/app/admin/promotions/page.tsx
git status --short --untracked-files=all
```

Expected: old path is `False`; destination is `True`; destination hash, size, and line count are exactly `3C6E4D561707BCCD536489CDF41679BE9F0F6B93D5D8EC5DD834806F6A66775F`, `22000`, and `584`; the legacy-path search has no matches; `PromotionsWorkspace` appears only at the destination export and the route import/render; the direct file comparison exits with no content difference. The route diff is the import-target replacement plus only the documented five-import Biome ordering if it occurred. Existing unrelated modified and untracked paths remain present and untouched.

- [ ] **Step 7: Reconcile the execution documentation only if the formatter exception occurred**

If Step 5 reordered route imports, append a short execution-deviation subsection to this plan before committing that states: scoped Biome required ordering of the five pre-existing imports in `src/app/admin/promotions/page.tsx`; the user pre-authorized that formatter-only change; no imports were added, removed, or semantically altered; and no other source scope changed. If Step 5 did not run, make no documentation edit.

Expected: documentation reconciliation exists only for an actual formatter deviation, is limited to the permitted route-import ordering, and does not convert planned validation into a passing result.

- [ ] **Step 8: Stage only this slice, inspect R100 rename detection, and commit**

Run:

```powershell
git status --short --untracked-files=all
git add -- src/app/admin/promotions/page.tsx src/features/admin/promotions/promotions-workspace.tsx src/modules/promotions/ui/admin/promotions-workspace.tsx
git diff --cached --check
git diff --cached --summary --find-renames=100%
git diff --cached -- src/app/admin/promotions/page.tsx
git diff --cached --name-only
git commit -m "refactor(promotions): move admin promotions workspace"
git rev-parse HEAD
git status --short --untracked-files=all
```

If Step 7 added the formatter-deviation record, add the one plan file explicitly before reviewing the cached diff and include it in the same commit:

```powershell
git add -- docs/superpowers/plans/2026-08-01-phase-9-admin-promotions-ui-cutover.md
```

Expected: cached whitespace check is clean; summary reports a 100% rename; cached source paths are exactly the old workspace, new workspace, and route, plus the plan only when an actual formatter deviation was recorded. The route diff contains the import replacement and only the approved formatting order if applicable. Commit the independently reviewable cutover, record its SHA, and leave all unrelated dirty/untracked work uncommitted and unchanged.

#### Execution deviation — Biome route import ordering

Scoped Biome required ordering of the five pre-existing imports in `src/app/admin/promotions/page.tsx`. The user pre-authorized that formatter-only change; no imports were added, removed, or semantically altered, and no other source scope changed.

### Task 2: Apply exact-head reviewer gates, causality, and browser parity review

**Owner:** Reviewer

**Files:**
- Review: committed move from `src/features/admin/promotions/promotions-workspace.tsx` to `src/modules/promotions/ui/admin/promotions-workspace.tsx`
- Review: `src/app/admin/promotions/page.tsx`
- Modify: None

**Interfaces:**
- Consumes: Task 1's exact implementation SHA, baseline identity values, sole-consumer evidence, and any recorded Biome-only import-order deviation.
- Produces: evidence that separates passing, failing, blocked, skipped, and comparably pre-existing gates; no source repair is authorized.

- [ ] **Step 1: Reconfirm the committed diff, component identity, and protected worktree**

Run:

```powershell
git show --stat --summary --find-renames=100% HEAD
git show --check HEAD
git diff HEAD^ HEAD -- src/app/admin/promotions/page.tsx
(Get-FileHash src/modules/promotions/ui/admin/promotions-workspace.tsx -Algorithm SHA256).Hash
(Get-Item src/modules/promotions/ui/admin/promotions-workspace.tsx).Length
(Get-Content src/modules/promotions/ui/admin/promotions-workspace.tsx).Count
Test-Path src/features/admin/promotions/promotions-workspace.tsx
rg -n '@/features/admin/promotions/promotions-workspace' src tests scripts
git status --short --untracked-files=all
```

Expected: `HEAD` contains a 100% rename, clean whitespace, destination identity `3C6E4D561707BCCD536489CDF41679BE9F0F6B93D5D8EC5DD834806F6A66775F` / `22000` / `584`, no legacy source/import, and only the allowed route import replacement plus documented Biome ordering if it occurred. Unrelated dirty work is preserved outside the commit.

- [ ] **Step 2: Run required focused, static, unit, build, aggregate, and browser gates separately on the recorded head**

After confirming Node 25.x and pnpm 11.13.0, run each command separately and retain its real exit status, output, manifests, summaries, and redacted logs:

```powershell
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test -- src/modules/promotions/schema.test.ts
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
```

Expected: required commands pass; the focused schema run demonstrates existing coupon schema coverage only. React Doctor is advisory globally, but any finding involving the route, moved Promotions UI, a client/server boundary, or ownership import blocks this slice. `validate:full` and `validate:browser` require complete source-backed manifests/logs; queued, cancelled, skipped, zero-step, missing-manifest, deployment-only, or unsupported-toolchain output is blocked or skipped evidence, never a pass. If `pnpm exec` is used for an additional scoped Vitest or Biome retry and cannot resolve, use the corresponding `node_modules/.bin/*.cmd` fallback from Task 1 and record it; repository scripts still use `pnpm`.

- [ ] **Step 3: Apply baseline causality to every failed or unavailable gate**

For any failed repository-wide command, retain its complete output and reproduce the same command with the same supported Node/pnpm versions and environment against an unchanged baseline checkout at Task 1's recorded pre-cutover HEAD. Do not stash, reset, restore, delete, or overwrite the shared dirty worktree to make that comparison.

Expected: any failure touching `/admin/promotions`, either scoped source path, the moved UI hash/import resolution, `src/modules/promotions/ui/**`, a client/server boundary, authorization, request/response, cache, or persistence is a new regression and blocks completion. A broader failure is pre-existing only if the identical failure reproduces on the unchanged baseline; otherwise it is a blocker. Concurrent dirty-work failures and earlier migration debt are reported, not waived or repaired in this slice.

- [ ] **Step 4: Inspect authorized route, accessibility, responsive, and interaction parity**

Against an authorized staff session, inspect `/admin/promotions` in light and dark themes at `375x812`, `768x1024`, and `1280x800`. Capture and compare screenshots with the prior admin presentation; inspect the console, failed requests, and production server logs. Exercise read-only, empty/non-empty, generated/custom coupon, percent/fixed, invalid form, create success/error, edit/cancel, toggle, refresh/pending, and coupon-status states where controlled data and credentials permit. Confirm labels; select and checkbox operation; focus order; disabled controls; toast feedback; no mobile overflow; the wide sticky form/list layout; and unchanged signed-out and insufficient-capability redirects.

Expected: no visual, DOM/accessibility-tree, interaction, request/response, authorization, cache, or persistence difference is attributable to the move. Missing runner, browser, credentials, controlled data, or log access makes the named check blocked/skipped, never passing.

- [ ] **Step 5: Deliver the reviewer verdict and preserve rollback readiness**

Report the exact implementation SHA; source and route files changed; hash/size/line and zero-legacy-import proof; all actual command results; runtime versions; direct-binary fallback use; failed, advisory, blocked, and skipped evidence; baseline-causality comparison; browser themes/viewports/states/screenshots; console/network/log review; protected dirty-work status; known validation debt; and any actual, user-approved, documented five-import Biome ordering. Confirm that no shim, contract/data/server change, test edit, dependency/configuration change, unrecorded override, or later-phase work occurred.

Expected: approve only when all available required evidence passes and no new failure exists. Otherwise return the precise blocker without modifying source.

## Rollback

Rollback is source-only: move the unchanged component from `src/modules/promotions/ui/admin/promotions-workspace.tsx` back to `src/features/admin/promotions/promotions-workspace.tsx`, restore the route import to `@/features/admin/promotions/promotions-workspace`, and only then remove the module destination. Reverse only an actual documented five-import Biome ordering if it occurred. Re-run the structural identity/zero-consumer proof, focused schema test, static gates, and browser checks. Do not use a broad reset, delete a directory containing concurrent work, leave two copies, or leave a forwarding module.

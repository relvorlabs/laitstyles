# Phase 9 Admin Team UI Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Store Team workspace from legacy admin composition into Auth-owned UI without changing its bytes, behavior, presentation, or route logic.

**Architecture:** Relocate the existing Client Component from `src/features/admin/team/**` to `src/modules/auth/ui/admin/**`, where the manager-invitation contracts it consumes already live. Keep `src/app/admin/team/page.tsx` as the unchanged composition and authorization boundary except for its concrete import path and the recorded formatter-only ordering of its four existing imports; leave no compatibility edge at the legacy path.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript 5, Vitest 4.1.10, Playwright 1.61.1, Biome 2.5.3, pnpm 11.13.0, Node 25.x.

## Global Constraints

- Work only on branch `agent/storefront-checkout-delivery-promotions-redesign`; record the starting commit and do not switch branches.
- Use `pnpm@11.13.0` on Node `25.x`; do not change dependencies, package metadata, or `pnpm-lock.yaml`.
- The source baseline is 12,287 bytes, 286 lines, SHA-256 `82906C5C036134842AE79D3B7C782DDDE2FCDE12FDA397E9624A734440E62CED`; the destination must retain that exact hash.
- `src/app/admin/team/page.tsx` is the one production consumer, and `src/modules/auth/ui/admin/team-workspace.tsx` is absent at baseline.
- Preserve every byte of `TeamWorkspace`: no formatting, import reordering, helper extraction, component split, copy/class/icon/a11y/responsive change, or behavioral refactor.
- Preserve `TeamWorkspace({ initialMembers }: { initialMembers: ManagerMember[] })`, the named export, the `"use client"` directive, `inviteManagerRequest(input)`, and the `ManagerMember` contract unchanged.
- Change the route's `TeamWorkspace` import path from `@/features/admin/team/team-workspace` to `@/modules/auth/ui/admin/team-workspace`; no route logic may change. The recorded, user-approved formatter-only exception permits Biome to order the route's four existing imports.
- Remove the old file completely. Do not add a shim, re-export, barrel, alias, forwarding module, facade, or duplicate copy.
- The worktree contains unrelated modified and untracked work. Before editing and before staging, inspect `git status --short --untracked-files=all`; never format, delete, stage, commit, restore, or overwrite unrelated paths.
- Do not edit the migration tracker, progress ledgers, architecture guards, tests, configuration, generated output, Prisma, Supabase, or any source file beyond the three exact paths in the file map.
- Earlier exact-head, private-runner, browser, and visual debt remains debt. This cutover neither clears nor waives it.

## File and ownership map

| Layer | File | Change | Owner |
| --- | --- | --- | --- |
| Auth domain UI | `src/features/admin/team/team-workspace.tsx` -> `src/modules/auth/ui/admin/team-workspace.tsx` | Pure byte-identical rename; delete the legacy owner | UI engineer |
| App composition | `src/app/admin/team/page.tsx` | Replace the import path; recorded formatter-only ordering of its four existing imports | UI engineer |
| Auth client/server/types, API, Prisma, Supabase | None | Existing interfaces are consumed unchanged | Not required |
| Validation and evidence | No source files | Structural, focused Auth, repository, browser, and diff review | Reviewer |

## Execution Record and Approved Deviation

- Commit `e428b45` (`refactor(auth): move admin team workspace`) performed the R100 move from
  `src/features/admin/team/team-workspace.tsx` to
  `src/modules/auth/ui/admin/team-workspace.tsx` and the route import-path cutover.
- Biome required the route imports to be reordered. The user explicitly approved this
  formatter-only deviation; follow-up commit `c55f7739` (`style(auth): order admin team imports`)
  reordered only the four existing imports and normalized line endings in
  `src/app/admin/team/page.tsx`. Its final Git diff is one insertion and one deletion, with no
  behavior change.
- The exception is limited to that route import ordering. It authorizes no route logic, JSX,
  contract, dependency, test, configuration, or `TeamWorkspace` content change; all other
  exclusions remain intact.
- Focused Auth coverage resulted in 10/12 passing tests; two invitation Route Handler contract
  failures were unchanged. Node 25 was unavailable, so Node-25-required gates were not run and
  are not reported as passing.

## Explicit exclusions

- No redesign or change to behavior, JSX, copy, Tailwind classes, icons, accessibility semantics, themes, breakpoints, state, validation, errors, pending behavior, or member deduplication.
- No Auth schema/type/client API/server operation/policy, redirect, route URL, endpoint, request, response, session, role, Supabase, Prisma, or persistence change.
- No new or modified test, primitive, store, hook, action, handler, dependency, configuration, migration, generated file, tracker, or progress document.
- No migration of another `src/features/**` file, admin screen, or later Phase 9 slice.
- No compatibility shim and no repair or reclassification of earlier validation debt.

---

### Task 1: Perform the byte-identical Auth UI ownership cutover

**Owner:** UI engineer

**Files:**
- Move: `src/features/admin/team/team-workspace.tsx` -> `src/modules/auth/ui/admin/team-workspace.tsx`
- Modify: `src/app/admin/team/page.tsx:2`
- Test: Existing tests only; no test file changes

**Interfaces:**
- Consumes: `inviteManagerRequest(input)` from `@/modules/auth/client/staff-invitation-api` and `ManagerMember` from `@/modules/auth/types`.
- Produces: named Client Component `TeamWorkspace({ initialMembers }: { initialMembers: ManagerMember[] })` at `@/modules/auth/ui/admin/team-workspace`.
- Route contract: `TeamPage` continues to call `getCurrentSession()`, enforce the two existing redirects, call `listStoreManagers()`, and pass `ManagerMember[]` as `initialMembers`.

- [ ] **Step 1: Record and verify the live baseline**

Run:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short --untracked-files=all
git diff -- src/features/admin/team/team-workspace.tsx src/app/admin/team/page.tsx
(Get-FileHash src/features/admin/team/team-workspace.tsx -Algorithm SHA256).Hash
(Get-Item src/features/admin/team/team-workspace.tsx).Length
(Get-Content src/features/admin/team/team-workspace.tsx).Count
rg -n "@/features/admin/team/team-workspace" src
Test-Path src/modules/auth/ui/admin/team-workspace.tsx
```

Expected: branch is `agent/storefront-checkout-delivery-promotions-redesign`; record the exact HEAD; the two scoped files have no pre-existing diff; hash is `82906C5C036134842AE79D3B7C782DDDE2FCDE12FDA397E9624A734440E62CED`; size is `12287`; line count is `286`; the legacy import has exactly one match at `src/app/admin/team/page.tsx:2`; destination result is `False`. Stop and return to the orchestrator if any scoped baseline differs. Unrelated status entries are protected user work, not cleanup targets.

- [ ] **Step 2: Move the component without rewriting it**

Run:

```powershell
New-Item -ItemType Directory -Force src/modules/auth/ui/admin | Out-Null
Move-Item -LiteralPath src/features/admin/team/team-workspace.tsx -Destination src/modules/auth/ui/admin/team-workspace.tsx
```

Expected: the old file is absent and the destination exists. Do not open-save, format, or otherwise transform the moved file.

- [ ] **Step 3: Replace the route import path**

Apply this exact one-line diff to `src/app/admin/team/page.tsx`:

```diff
-import { TeamWorkspace } from "@/features/admin/team/team-workspace";
+import { TeamWorkspace } from "@/modules/auth/ui/admin/team-workspace";
```

Expected: no route statement, redirect, prop, or JSX changes. Biome may order the four existing
imports only under the recorded formatter-only override; it may not add, remove, or semantically
change an import.

- [ ] **Step 4: Prove structural identity and absence of a compatibility edge**

Run:

```powershell
Test-Path src/features/admin/team/team-workspace.tsx
Test-Path src/modules/auth/ui/admin/team-workspace.tsx
(Get-FileHash src/modules/auth/ui/admin/team-workspace.tsx -Algorithm SHA256).Hash
(Get-Item src/modules/auth/ui/admin/team-workspace.tsx).Length
(Get-Content src/modules/auth/ui/admin/team-workspace.tsx).Count
rg -n "@/features/admin/team/team-workspace" src
rg -n "TeamWorkspace" src/app src/modules src/features
git diff -- src/app/admin/team/page.tsx
git status --short --untracked-files=all
```

Expected: old path `False`; destination `True`; destination hash/size/line count remain `82906C5C036134842AE79D3B7C782DDDE2FCDE12FDA397E9624A734440E62CED`, `12287`, and `286`; legacy-path search returns no matches; `TeamWorkspace` appears only in the destination export and the route import/render; route diff is the import-path replacement plus, only under the recorded override, ordering of the four existing imports; unrelated worktree entries remain present and untouched.

- [ ] **Step 5: Run focused Auth acceptance tests**

Run:

```powershell
pnpm exec vitest run src/modules/auth/auth-boundaries.test.ts src/modules/auth/server/staff-invitations.test.ts src/app/api/v1/auth/invitations/route.test.ts
```

Expected: 3 test files and 12 tests. Actual focused result: 10/12 passed; two unchanged invitation Route Handler contract failures remain failures, not a pass. `auth-boundaries.test.ts` must still prove Client Auth UI imports neither `@/modules/auth/server/**` nor `@/lib/supabase/admin`. A failure touching the destination, import resolution, or Auth boundary blocks staging.

- [ ] **Step 6: Stage only the cutover and inspect rename detection**

Run:

```powershell
git status --short --untracked-files=all
git add -- src/app/admin/team/page.tsx src/features/admin/team/team-workspace.tsx src/modules/auth/ui/admin/team-workspace.tsx
git diff --cached --check
git diff --cached --summary --find-renames=100%
git diff --cached -- src/app/admin/team/page.tsx
git diff --cached --name-only
```

Expected: cached diff check is clean; summary reports a 100% rename from the legacy path to the Auth path; route diff contains the import replacement and, only under the recorded override, the four-import formatter ordering; cached name list contains exactly the old path, new path, and route (Git may present the rename as two path names). No unrelated file is staged.

- [ ] **Step 7: Commit the independently reviewable source cutover**

Run:

```powershell
git commit -m "refactor(auth): move admin team workspace"
git rev-parse HEAD
git status --short --untracked-files=all
```

Expected: implementation commit `e428b45` contains the pure rename and import-path route change; follow-up `c55f7739` contains only the approved four-import formatter ordering. Record both SHAs for reviewer validation. All unrelated modified and untracked work remains uncommitted and unchanged.

---

### Task 2: Apply exact-head reviewer gates and handoff

**Owner:** Reviewer

**Files:**
- Review: committed rename of `src/features/admin/team/team-workspace.tsx` to `src/modules/auth/ui/admin/team-workspace.tsx`
- Review: `src/app/admin/team/page.tsx`
- Modify: None

**Interfaces:**
- Consumes: the exact implementation commit from Task 1 and the approved design's byte-preservation contract.
- Produces: reviewer evidence that distinguishes passing, failing, blocked, skipped, and demonstrably pre-existing results; no source repair is authorized in this task.

- [ ] **Step 1: Reconfirm the exact committed diff and dirty-work isolation**

Run:

```powershell
git show --stat --summary --find-renames=100% HEAD
git show --check HEAD
git diff HEAD^ HEAD -- src/app/admin/team/page.tsx
(Get-FileHash src/modules/auth/ui/admin/team-workspace.tsx -Algorithm SHA256).Hash
Test-Path src/features/admin/team/team-workspace.tsx
git status --short --untracked-files=all
```

Expected: a 100% rename, the single route import replacement, no whitespace error, the approved SHA-256, no old file, and all unrelated dirty work preserved outside the commit.

- [ ] **Step 2: Run the required static, unit, build, and aggregate gates on the recorded implementation head**

Run each command separately and retain its real exit status/evidence:

```powershell
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
```

Expected: each command passes; React Doctor may report legacy advisory findings only when none touches either scoped file or the Auth ownership boundary. `validate:full` must emit complete manifests/logs; queued, cancelled, skipped, missing-manifest, or zero-step evidence is not a pass.

- [ ] **Step 3: Apply the baseline-causality rule to every failure**

For any failed repository-wide command, retain the failing output and compare the same command, same Node/pnpm versions, and same environment against an unchanged baseline checkout at Task 1's recorded pre-cutover HEAD. Do not stash, reset, restore, or delete the shared dirty worktree to create that comparison.

Expected: any failure involving either scoped file, import resolution, `src/modules/auth/ui/**`, the Auth boundary test, or changed runtime behavior is newly introduced and blocks completion. A different repo-wide failure may be labelled pre-existing only when the identical failure reproduces on the unchanged baseline; without comparable evidence it remains a blocker. Earlier migration debt and failures caused by concurrent unrelated dirty work are reported honestly and are never treated as a pass or fixed in this slice.

- [ ] **Step 4: Run integration and browser acceptance when prerequisites are available**

Run:

```powershell
pnpm test:auth:e2e
pnpm validate:browser
```

Expected: `test:auth:e2e` passes `tests/e2e/manager-invitation.spec.ts` against disposable Supabase Auth, PostgreSQL, and mailbox prerequisites; `validate:browser` records passing desktop, tablet, and mobile projects against a reachable source-backed application. If prerequisites or the private runner are unavailable, record the gate as blocked, not passed.

- [ ] **Step 5: Review Phase 0 UI, authorization, accessibility, and responsive parity**

Against an owner session, inspect `/admin/team` in light and dark themes at 375x812, 768x1024, and 1280x800. Exercise untouched, blur-invalid, invalid-submit, valid-submit/pending, success, API-error, and empty/non-empty member states where deterministic fixtures or the disposable Auth environment support them. Verify focus order, labels, `aria-invalid`, alert/status announcements, disabled controls, truncation, one-to-two-column behavior, signed-out redirect to `/auth/sign-in?next=/admin/team`, manager redirect to `/admin`, console errors, failed requests, production logs, and screenshots against the existing admin presentation.

Expected: no content, accessibility-tree, interaction, computed-style, responsive, theme, or screenshot difference attributable to the move. Unsupported states/viewports are itemized as blocked or skipped.

- [ ] **Step 6: Deliver the reviewer handoff**

Report the exact implementation SHA; the pure-rename hash and sole-consumer evidence; files changed and why; every command actually run with result; blocked/skipped checks and prerequisites; required failures/advisories with baseline comparison; browser viewports/themes/states and screenshot review; unrelated dirty-work preservation; known validation debt; confirmation of the single user-approved, documented formatter-only import-order override; and confirmation that no additional or unrecorded doctrine/spec override, behavior change, shim, test edit, dependency change, or later-phase work occurred.

Expected: completion is approved only if no new failure exists and all available required evidence passes. Otherwise return a precise blocker without modifying source.

## Rollback

Rollback is source-only: move the unchanged component back to `src/features/admin/team/team-workspace.tsx`, restore the route import to `@/features/admin/team/team-workspace`, then remove the Auth destination only after the route resolves to the restored source. Re-run structural, focused Auth, static, build, and browser gates. Never leave two copies or a forwarding module, and never include unrelated dirty work in the rollback.

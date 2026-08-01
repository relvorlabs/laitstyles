# Phase 9 Retire Legacy Storefront Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unreferenced `src/features/storefront/account/**` legacy tree while retaining its valid orders-domain copy test beside the canonical implementation.

**Architecture:** Active `/account/**` routes already compose domain-owned UI from `src/modules/customers/ui/account/**`, `src/modules/auth/ui/**`, `src/modules/payments/ui/storefront/**`, `src/modules/orders/ui/storefront/**`, and the other owning modules. Preserve those canonical files unchanged, move the misplaced orders copy test to `src/modules/orders/storefront/`, then delete the isolated legacy account composition only after repeating the zero-consumer proof on the implementation worktree.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest 4, Biome 2, pnpm 11.13.0.

## Global Constraints

- This is one bounded Phase 9 legacy-deletion slice; do not migrate any other `src/features/**` tree.
- Preserve the Phase 0 account presentation, navigation, themes, interactions, and responsive behaviour; this slice changes no active runtime implementation.
- Do not delete a legacy file until repository-wide path, filename, and exported-symbol searches show no consumer outside `src/features/storefront/account/**`.
- Treat the current dirty worktree as shared: do not overwrite, format, stage, or commit unrelated changes.
- Use `pnpm`; do not install, upgrade, or regenerate dependencies.
- A missing executable, unsupported local runtime, skipped browser run, or failed command is blocked/failed evidence, never a pass.

---

## File and Ownership Map

| Layer | Files | Change | Owner |
| --- | --- | --- | --- |
| `src/modules/orders/storefront/**` | `order-state-copy.test.ts` | Move the existing test from the legacy account tree beside `order-state-copy.ts`; keep its assertions and canonical imports unchanged. | domain engineer |
| Legacy `src/features/**` | `src/features/storefront/account/**` | Delete the remaining 14 files after the import/reference proof passes. | UI engineer |
| `src/app/**` and canonical `src/modules/**` | Active account routes and domain UI listed below | Proof-only; no source edits. | reviewer |
| `scripts/**`, configuration, dependencies, Prisma/Supabase | All files | No changes. | excluded |

Expected final source diff:

- Move `src/features/storefront/account/orders/order-state-copy.test.ts` to `src/modules/orders/storefront/order-state-copy.test.ts`.
- Delete `src/features/storefront/account/account-context.tsx`.
- Delete `src/features/storefront/account/account-nav.ts`.
- Delete `src/features/storefront/account/account-shell.tsx`.
- Delete `src/features/storefront/account/components/account-breadcrumb.tsx`.
- Delete `src/features/storefront/account/components/account-garments.tsx`.
- Delete `src/features/storefront/account/components/account-mobile-menu.tsx`.
- Delete `src/features/storefront/account/components/account-primitives.tsx`.
- Delete `src/features/storefront/account/components/account-product-grid.tsx`.
- Delete `src/features/storefront/account/components/account-sidebar.tsx`.
- Delete `src/features/storefront/account/hooks/use-account-products.ts`.
- Delete `src/features/storefront/account/modals/account-modal.tsx`.
- Delete `src/features/storefront/account/modals/account-modals.test.tsx`.
- Delete `src/features/storefront/account/modals/account-modals.tsx`.
- Delete `src/features/storefront/account/sections/overview-section.tsx`.
- Leave `src/modules/customers/ui/account/**`, `src/modules/auth/ui/**`, `src/modules/payments/ui/storefront/**`, `src/modules/orders/ui/storefront/**`, and `src/app/(storefront)/account/**` unchanged.

## Pre-implementation Evidence

- The legacy tree contains 15 files. Eleven paths have counterparts under `src/modules/customers/ui/account/**`: `account-context.tsx` and `components/account-primitives.tsx` are byte-identical compatibility shims; the other nine are older copies superseded by evolved canonical files.
- `src/features/storefront/account/modals/{account-modal.tsx,account-modals.tsx,account-modals.test.tsx}` have no canonical counterpart and are reachable only from the legacy `account-shell.tsx` or their own legacy test.
- `src/features/storefront/account/orders/order-state-copy.test.ts` imports only canonical `@/modules/orders/storefront/{account-order-contract,order-state-copy}` code and remains useful after relocation.
- No production, test, or script file outside the legacy tree imports `@/features/storefront/account/**`.
- Active route composition is canonical: the account layout imports `@/modules/customers/ui/account/account-shell`; the overview, payments, security, and orders routes import customer, payments, auth, and orders module UI respectively; the other account routes likewise import their owning modules.
- `scripts/checks/storefront-production-readiness.mjs` already rejects production imports of the retired `@/features/storefront/account/**` namespace; no guard edit is needed for this deletion.

### Task 1: Freeze the Deletion Proof on the Implementation Worktree

**Owner:** Laitstyles reviewer

**Files:**
- Inspect: `src/features/storefront/account/**`
- Inspect: `src/app/(storefront)/account/**`
- Inspect: `src/modules/customers/ui/account/**`
- Inspect: `src/modules/auth/ui/**`
- Inspect: `src/modules/payments/ui/storefront/**`
- Inspect: `src/modules/orders/{storefront,ui/storefront}/**`

**Interfaces:**
- Consumes: The current shared worktree and the Phase 9 zero-consumer rule.
- Produces: A recorded go/no-go result for the exact 15-file account tree; no source change.

- [ ] **Step 1: Record branch and preserve unrelated changes**

Run:

```powershell
git branch --show-current
git status --short
git diff --name-only
```

Expected: the authorized current branch is reported. Save the pre-existing changed-file list and do not include those paths in this slice unless they are one of the exact move/delete targets above.

- [ ] **Step 2: Confirm the exact legacy inventory**

Run:

```powershell
rg --files src/features/storefront/account | Sort-Object
(rg --files src/features/storefront/account | Measure-Object -Line).Lines
```

Expected: the command prints exactly the 15 files in the expected final source diff and the count is `15`. Stop and re-plan if the tree has gained or lost a file.

- [ ] **Step 3: Prove no external path consumer exists**

Run:

```powershell
rg -n '@/features/storefront/account|features/storefront/account|storefront/account' src tests scripts -g '!src/features/storefront/account/**'
```

Expected: no match referring to the legacy feature path. Matches such as `@/modules/orders/storefront/account-order-contract` are canonical and must be classified separately, not treated as legacy consumers.

- [ ] **Step 4: Prove exported legacy symbols have canonical consumers only**

Run:

```powershell
rg -n 'AccountShell|OverviewSection|AccountBreadcrumb|AccountProductGrid|useAccountProducts|accountNavItems|AccountModals|reviewStateCopy' src tests scripts -g '!src/features/storefront/account/**'
```

Expected: active matches resolve to `src/modules/**` implementations and `src/app/(storefront)/account/**` consumers. There must be no external import resolved to the legacy tree. If any external legacy consumer appears, stop deletion and migrate that consumer in a separately reviewed change.

- [ ] **Step 5: Confirm active route ownership**

Run:

```powershell
Get-ChildItem 'src/app/(storefront)/account' -Recurse -File -Include *.ts,*.tsx | ForEach-Object { rg -n '^import' $_.FullName }
```

Expected: account route imports point to `@/modules/customers`, `@/modules/auth`, `@/modules/payments`, `@/modules/orders`, `@/modules/returns`, `@/modules/reviews`, `@/modules/notifications`, `@/modules/preferences`, `@/modules/privacy`, `@/modules/support`, shared UI, or route-local adapters. No route imports `@/features/storefront/account/**`.

### Task 2: Relocate the Orders Copy Test

**Owner:** Laitstyles domain engineer

**Files:**
- Move: `src/features/storefront/account/orders/order-state-copy.test.ts`
- To: `src/modules/orders/storefront/order-state-copy.test.ts`
- Test: `src/modules/orders/storefront/order-state-copy.test.ts`

**Interfaces:**
- Consumes: `AccountLineReviewState` from `@/modules/orders/storefront/account-order-contract` and `reviewLifecycleMarkerCopy` / `reviewStateCopy` from `@/modules/orders/storefront/order-state-copy`.
- Produces: The same review-state copy coverage colocated with the canonical orders implementation; no runtime export or behaviour change.

- [ ] **Step 1: Move the test without editing its assertions**

Run:

```powershell
git mv -- 'src/features/storefront/account/orders/order-state-copy.test.ts' 'src/modules/orders/storefront/order-state-copy.test.ts'
Get-Content -Raw 'src/modules/orders/storefront/order-state-copy.test.ts'
```

Expected: the destination contains the existing table-driven `reviewStateCopy` cases and the `reviewLifecycleMarkerCopy` labels. Do not rewrite imports or test copy merely because the file moved; its current `@/modules/orders/storefront/**` imports are already canonical.

- [ ] **Step 2: Run the relocated focused test**

Run:

```powershell
pnpm exec vitest run src/modules/orders/storefront/order-state-copy.test.ts
```

Expected: the relocated file passes both describe blocks. If `vitest` is unavailable, stop and repair/restore the repository's existing dependency installation through the authorized workflow; do not report the test as passed.

- [ ] **Step 3: Review only the move**

Run:

```powershell
git status --short -- 'src/features/storefront/account/orders/order-state-copy.test.ts' 'src/modules/orders/storefront/order-state-copy.test.ts'
git diff -- 'src/features/storefront/account/orders/order-state-copy.test.ts' 'src/modules/orders/storefront/order-state-copy.test.ts'
```

Expected: Git reports one move/rename with no semantic content change.

### Task 3: Delete the Superseded Account Composition

**Owner:** Laitstyles UI engineer

**Files:**
- Delete: the 14 legacy files enumerated in **Expected final source diff**.
- Preserve unchanged: `src/modules/customers/ui/account/**`
- Preserve unchanged: `src/app/(storefront)/account/**`

**Interfaces:**
- Consumes: Task 1 zero-consumer proof and the canonical route composition.
- Produces: No `src/features/storefront/account` directory and no change to the active account runtime graph.

- [ ] **Step 1: Delete the remaining legacy files as one ownership batch**

Use the patch/editor deletion operation on the exact 14 paths enumerated above. Do not recursively delete a computed or broad directory. After the files are removed, the now-empty `components`, `hooks`, `modals`, `orders`, `sections`, and `account` directories disappear naturally.

- [ ] **Step 2: Prove the legacy tree is absent**

Run:

```powershell
if (Test-Path 'src/features/storefront/account') { rg --files src/features/storefront/account; exit 1 }
rg -n '@/features/storefront/account|features/storefront/account' src tests scripts
```

Expected: `Test-Path` is false and the import search has no source/test/script match.

- [ ] **Step 3: Run focused ownership and account checks**

Run:

```powershell
pnpm exec vitest run src/modules/orders/storefront/order-state-copy.test.ts src/modules/auth/ui/account-security-section.test.tsx src/modules/payments/ui/storefront/payment-methods-section.test.tsx
pnpm check:storefront-production
pnpm check:architecture
pnpm typecheck
```

Expected: all commands pass. The production-readiness check must continue to report no retired account import, and the architecture/type checks must resolve the canonical module graph with the legacy directory absent.

- [ ] **Step 4: Inspect the scoped diff for source drift**

Run:

```powershell
git status --short
git diff --stat -- src/features/storefront/account src/modules/orders/storefront/order-state-copy.test.ts
git diff -- src/features/storefront/account src/modules/orders/storefront/order-state-copy.test.ts
```

Expected: the scoped diff contains only the one test relocation and deletion of the 14 legacy files. It contains no edit to active route or canonical runtime UI.

- [ ] **Step 5: Commit only this bounded deletion slice**

Run only after reconciling the Task 1 dirty-worktree snapshot:

```powershell
git add -- 'src/features/storefront/account' 'src/modules/orders/storefront/order-state-copy.test.ts'
git diff --cached --stat
git commit -m "refactor(account): remove retired storefront account feature"
```

Expected: unrelated pre-existing files remain unstaged.

### Task 4: Apply Reviewer Gates and Record Truth

**Owner:** Laitstyles reviewer

**Files:**
- Inspect: final source diff and repository gate output.
- Modify documentation only if the orchestrator assigns a migration progress/closure update as a separate docs change.

**Interfaces:**
- Consumes: The completed test relocation and legacy deletion.
- Produces: Acceptance evidence or an exact blocked/failure report; no inferred pass.

- [ ] **Step 1: Run repository validation**

Run:

```powershell
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
```

Expected: required gates pass. Classify any failure with its exact command and output, and prove whether it predates this slice before excluding it from the slice's regression result.

- [ ] **Step 2: Run the account browser gate**

Run the repository-owned source-backed browser suite:

```powershell
pnpm validate:browser
```

At minimum verify authenticated `/account`, `/account/payments`, `/account/security`, and `/account/orders` at 375x812, 768x1024, and 1280x800 in light and dark themes. Confirm navigation, keyboard focus, empty/loading/error states, console output, failed network requests, and screenshots match the Phase 0 account baseline. Expected: no behavioural or visual difference attributable to deletion because active routes never consumed the retired tree.

- [ ] **Step 3: Publish the completion report**

Report:

- the one test relocation and 14 deletions;
- the zero-consumer and canonical-route evidence;
- every validation actually executed and its result;
- blocked/skipped gates and why;
- any pre-existing failures with evidence;
- confirmation that no active account UI, API, schema, dependency, script, or configuration changed.

## Explicit Exclusions

- No account redesign, copy rewrite, component cleanup, or canonical-file refactor.
- No changes to account routes, Server Actions, Route Handlers, typed clients, cache keys, or persistence.
- No changes to auth, payments, orders, returns, reviews, notifications, preferences, privacy, or support behaviour.
- No deletion or migration of any other `src/features/storefront/**`, `src/features/admin/**`, or top-level `src/server/**` path.
- No new compatibility re-export, barrel, alias, or replacement modal host.
- No architecture/check-script change; existing guards already reject retired imports, and broader guard hardening belongs to the Phase 9 program-level closure task.
- No dependency, lockfile, Next.js, Tailwind, Prisma, Supabase, or deployment-configuration change.

## Rollback

If deletion reveals an unclassified consumer or regression, revert only this slice's commit (or restore the 14 deleted paths and move `order-state-copy.test.ts` back before commit). Do not roll back unrelated dirty-worktree changes. A restored legacy tree is temporary evidence that the slice was not ready; migrate the discovered consumer to its owning canonical module in a newly scoped plan before attempting deletion again.

# Phase 9 Storefront Shared Residue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the bounded non-runtime residue under `src/features/storefront/shared/**` by colocating six canonical-import tests with their owning modules and deleting two proven redundant compatibility files.

**Architecture:** Preserve every canonical implementation and move only its already-canonical test coverage into the owning `products`, `cart`, or `storefront-shell` module. Delete the zero-consumer storefront overlay re-export and the byte-identical legacy overlay hook, while leaving the actively consumed `reveal.tsx` and its home consumers untouched.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Vitest 4, Biome 2, pnpm 11.13.0, PowerShell.

## Global Constraints

- This is one bounded Phase 9 residue slice. The only source changes are the six exact test moves and two exact deletions listed below.
- Preserve `src/features/storefront/shared/reveal.tsx`; `src/features/storefront/home/components/home-section-heading.tsx` and `category-card.tsx` actively import it and are under a separate migration.
- Do not edit any file under `src/features/storefront/home/**` or otherwise absorb the active reveal/home migration.
- Treat the dirty worktree as shared. Preserve unrelated changes; do not format, restore, stage, or commit them.
- Move each test without changing its content, assertions, import specifiers, line endings, or encoding. Its SHA-256 hash must be identical before and after the move.
- Do not edit canonical runtime implementations. This slice changes test colocation and removes redundant legacy files only.
- Use `pnpm`; do not install, upgrade, or regenerate dependencies.
- Do not edit `scripts/**`, configuration, lockfiles, Prisma, Supabase, or deployment files.
- A destination collision, new consumer, changed source hash, failed check, skipped check, or unavailable executable is a stop condition, not permission to overwrite or a passing result.

---

## File and Ownership Map

| Architecture layer | Files | Change | Owner |
| --- | --- | --- | --- |
| `src/modules/products/ui/**` | `src/modules/products/ui/storefront/add-to-bag-label.test.ts` | Move the existing `addToBagLabel` test beside the Products storefront UI contract it tests. | UI engineer |
| `src/modules/cart/**` | `src/modules/cart/cart-lines.test.ts` | Move the existing cart-line unit test beside `cart-lines.ts`. | Domain engineer |
| `src/modules/storefront-shell/client/**` | `storefront-client-state.test.ts`, `storefront-client-state-auth-continuity.test.ts`, `storefront-client-state-persistence.test.ts`, `storefront-overlay-events.test.ts` | Move the four existing browser-state/event tests beside their canonical client implementations. | Domain engineer |
| Legacy `src/features/**` | `src/features/storefront/shared/storefront-overlays.tsx` | Delete the zero-consumer re-export of canonical Storefront Shell UI. | UI engineer |
| Cross-domain `src/hooks/**` plus legacy `src/features/**` | Preserve `src/hooks/use-overlay-lifecycle.ts`; delete `src/features/storefront/shared/use-overlay-lifecycle.ts` | Remove the byte-identical legacy duplicate and retain the canonical cross-domain browser hook. | UI engineer |
| Legacy `src/features/**` | `src/features/storefront/shared/reveal.tsx` | Preserve unchanged because active home UI imports it. | Excluded/current reveal migration owner |
| `src/app/**`, `scripts/**`, config, dependencies, Prisma/Supabase | All files | No changes. | Excluded |

Expected final source diff:

- Move `src/features/storefront/shared/add-to-bag-label.test.ts` to `src/modules/products/ui/storefront/add-to-bag-label.test.ts`.
- Move `src/features/storefront/shared/cart-lines.test.ts` to `src/modules/cart/cart-lines.test.ts`.
- Move `src/features/storefront/shared/storefront-client-state.test.ts` to `src/modules/storefront-shell/client/storefront-client-state.test.ts`.
- Move `src/features/storefront/shared/storefront-client-state-auth-continuity.test.ts` to `src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts`.
- Move `src/features/storefront/shared/storefront-client-state-persistence.test.ts` to `src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts`.
- Move `src/features/storefront/shared/storefront-overlay-events.test.ts` to `src/modules/storefront-shell/client/storefront-overlay-events.test.ts`.
- Delete `src/features/storefront/shared/storefront-overlays.tsx`.
- Delete `src/features/storefront/shared/use-overlay-lifecycle.ts`.
- Preserve `src/features/storefront/shared/reveal.tsx` without modification.

## Pre-implementation Evidence

- All six source tests already import their subjects through canonical `@/modules/**` or `@/stores/**` paths; no import rewrite is needed after relocation.
- None of the six destination paths exists at planning time.
- `src/features/storefront/shared/storefront-overlays.tsx` is only a `"use client"` re-export of `StorefrontOverlays` from `@/modules/storefront-shell/ui/storefront-overlays`, and repository-wide search finds no consumer of the legacy file.
- `src/features/storefront/shared/use-overlay-lifecycle.ts` and `src/hooks/use-overlay-lifecycle.ts` both have SHA-256 `FCA67A5EF6360F5858766A5184C3FFF974B6E53797D34A5756C9FAC88C44005B`.
- The source test hashes at planning time are:
  - `add-to-bag-label.test.ts`: `753CCC47A685C08EFDED11E02CDB27BDBEF81C2A4825D33D608EE3358824E8B9`
  - `cart-lines.test.ts`: `3A7E3177BA8E9839BF4A21716DFFC2B3009A3B37F9D0651EDBC6CAF30CDD6B3E`
  - `storefront-client-state.test.ts`: `510DDA7C2923038612DA79CA2084F91C7FDE3BACDF631665F7CD5A3D533DC9E8`
  - `storefront-client-state-auth-continuity.test.ts`: `50D1503D7F2BF6BD63308747ED0551CD65A1B98CB9B19F2A1AC8F8C75BE1AA37`
  - `storefront-client-state-persistence.test.ts`: `DB7A97B816970E04F04D5CCBD1F3390BD25794DF51155F6E2D7E79B194577BF0`
  - `storefront-overlay-events.test.ts`: `0654E4D6BE37B04A9AB66DC0368D776D5A761A6B3E2C1D19B6463D9A6C91A47F`

### Task 1: Freeze the Move/Delete Proof on the Implementation Worktree

**Owner:** Laitstyles reviewer

**Files:**
- Inspect: `src/features/storefront/shared/**`
- Inspect: `src/modules/products/ui/storefront/**`
- Inspect: `src/modules/cart/**`
- Inspect: `src/modules/storefront-shell/client/**`
- Inspect: `src/hooks/use-overlay-lifecycle.ts`
- Inspect: `src/features/storefront/home/components/{home-section-heading,category-card}.tsx`

**Interfaces:**
- Consumes: The current shared worktree, the eight exact source targets, the six exact destinations, and the active reveal/home exclusion.
- Produces: A recorded go/no-go result plus baseline SHA-256 hashes; no source change.

- [ ] **Step 1: Record the branch and unrelated dirty paths**

Run:

```powershell
git branch --show-current
git status --short
git diff --name-only
```

Expected: the current authorized branch and pre-existing dirty paths are visible. If any of the eight source targets or six destinations is already modified/untracked, stop and coordinate ownership before proceeding. Do not restore or include unrelated paths.

- [ ] **Step 2: Confirm the exact source inventory and preserve the reveal boundary**

Run:

```powershell
Get-ChildItem 'src/features/storefront/shared' -File | Sort-Object Name | Select-Object -ExpandProperty Name
rg -n 'features/storefront/shared/reveal' src/features/storefront/home
```

Expected: the shared directory contains the six source tests, `storefront-overlays.tsx`, `use-overlay-lifecycle.ts`, and `reveal.tsx`; the only reported production consumers within the active home tree are `home-section-heading.tsx` and `category-card.tsx`. If concurrent work has changed this inventory, preserve `reveal.tsx` and the entire home tree and reassess only this plan's eight owned targets.

- [ ] **Step 3: Prove every destination is collision-free**

Run:

```powershell
$destinations = @(
  'src/modules/products/ui/storefront/add-to-bag-label.test.ts',
  'src/modules/cart/cart-lines.test.ts',
  'src/modules/storefront-shell/client/storefront-client-state.test.ts',
  'src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts',
  'src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts',
  'src/modules/storefront-shell/client/storefront-overlay-events.test.ts'
)
$destinations | ForEach-Object { "$_ => $(Test-Path -LiteralPath $_)" }
```

Expected: every line ends in `False`. If any destination exists, stop; do not overwrite, merge, rename around, or delete it.

- [ ] **Step 4: Prove the tests already consume only canonical contracts**

Run:

```powershell
rg -n '^import' src/features/storefront/shared/add-to-bag-label.test.ts src/features/storefront/shared/cart-lines.test.ts src/features/storefront/shared/storefront-client-state.test.ts src/features/storefront/shared/storefront-client-state-auth-continuity.test.ts src/features/storefront/shared/storefront-client-state-persistence.test.ts src/features/storefront/shared/storefront-overlay-events.test.ts
rg -n '@/features/storefront/shared|\.\.?/' src/features/storefront/shared/*.test.ts
```

Expected: imports resolve to `@/modules/products/ui/storefront/catalogue-data`, `@/modules/cart/cart-lines`, `@/modules/storefront-shell/client/{storefront-client-state,storefront-overlay-events}`, `@/stores/storefront-ui.store`, and Vitest. The second command reports no legacy or relative test-subject imports.

- [ ] **Step 5: Re-prove zero consumers for both deletion targets**

Run:

```powershell
rg -n 'features/storefront/shared/storefront-overlays|storefront/shared/storefront-overlays' src tests scripts
rg -n 'features/storefront/shared/use-overlay-lifecycle|storefront/shared/use-overlay-lifecycle' src tests scripts
rg -n '@/hooks/use-overlay-lifecycle' src tests scripts
```

Expected: the first two searches return no consumers. Canonical hook consumers, if any, resolve to `@/hooks/use-overlay-lifecycle`. If a legacy consumer appears, stop this task and scope its migration separately; do not add another compatibility shim.

- [ ] **Step 6: Capture exact baseline hashes**

Run:

```powershell
$sources = @(
  'src/features/storefront/shared/add-to-bag-label.test.ts',
  'src/features/storefront/shared/cart-lines.test.ts',
  'src/features/storefront/shared/storefront-client-state.test.ts',
  'src/features/storefront/shared/storefront-client-state-auth-continuity.test.ts',
  'src/features/storefront/shared/storefront-client-state-persistence.test.ts',
  'src/features/storefront/shared/storefront-overlay-events.test.ts',
  'src/features/storefront/shared/use-overlay-lifecycle.ts',
  'src/hooks/use-overlay-lifecycle.ts'
)
$sources | ForEach-Object { Get-FileHash -LiteralPath $_ -Algorithm SHA256 } | Format-Table Hash,Path -AutoSize
```

Expected: each test hash matches **Pre-implementation Evidence**, and both hook hashes equal `FCA67A5EF6360F5858766A5184C3FFF974B6E53797D34A5756C9FAC88C44005B`. A mismatch means the planning evidence is stale; stop and review the changed file rather than deleting or moving it blindly.

### Task 2: Colocate the Products and Cart Tests

**Owner:** Laitstyles UI engineer for the Products test; Laitstyles domain engineer for the Cart test

**Files:**
- Move: `src/features/storefront/shared/add-to-bag-label.test.ts`
- To: `src/modules/products/ui/storefront/add-to-bag-label.test.ts`
- Move: `src/features/storefront/shared/cart-lines.test.ts`
- To: `src/modules/cart/cart-lines.test.ts`

**Interfaces:**
- Consumes: `addToBagLabel` from `@/modules/products/ui/storefront/catalogue-data` and cart-line operations from `@/modules/cart/cart-lines`.
- Produces: Unchanged Products UI and Cart domain unit coverage colocated with the canonical code; no runtime API or behaviour change.

- [ ] **Step 1: Move the two tests without editing content**

Run:

```powershell
Move-Item -LiteralPath 'src/features/storefront/shared/add-to-bag-label.test.ts' -Destination 'src/modules/products/ui/storefront/add-to-bag-label.test.ts'
Move-Item -LiteralPath 'src/features/storefront/shared/cart-lines.test.ts' -Destination 'src/modules/cart/cart-lines.test.ts'
```

Expected: both source paths are absent and both destination paths exist. Do not open-save or autoformat either file.

- [ ] **Step 2: Prove both moves preserved exact bytes**

Run:

```powershell
Get-FileHash -LiteralPath 'src/modules/products/ui/storefront/add-to-bag-label.test.ts' -Algorithm SHA256
Get-FileHash -LiteralPath 'src/modules/cart/cart-lines.test.ts' -Algorithm SHA256
```

Expected: hashes are respectively `753CCC47A685C08EFDED11E02CDB27BDBEF81C2A4825D33D608EE3358824E8B9` and `3A7E3177BA8E9839BF4A21716DFFC2B3009A3B37F9D0651EDBC6CAF30CDD6B3E`.

- [ ] **Step 3: Run the relocated focused tests**

Run:

```powershell
pnpm exec vitest run src/modules/products/ui/storefront/add-to-bag-label.test.ts src/modules/cart/cart-lines.test.ts
```

Expected: both files pass with the same assertions as before relocation.

- [ ] **Step 4: Review only these moves**

Run:

```powershell
git status --short -- src/features/storefront/shared/add-to-bag-label.test.ts src/modules/products/ui/storefront/add-to-bag-label.test.ts src/features/storefront/shared/cart-lines.test.ts src/modules/cart/cart-lines.test.ts
git diff --no-ext-diff -- src/features/storefront/shared/add-to-bag-label.test.ts src/modules/products/ui/storefront/add-to-bag-label.test.ts src/features/storefront/shared/cart-lines.test.ts src/modules/cart/cart-lines.test.ts
```

Expected: Git reports content-identical relocations or equivalent add/delete pairs; there is no semantic diff. Do not stage or commit.

### Task 3: Colocate the Storefront Shell Client Tests

**Owner:** Laitstyles domain engineer

**Files:**
- Move: `src/features/storefront/shared/storefront-client-state.test.ts`
- To: `src/modules/storefront-shell/client/storefront-client-state.test.ts`
- Move: `src/features/storefront/shared/storefront-client-state-auth-continuity.test.ts`
- To: `src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts`
- Move: `src/features/storefront/shared/storefront-client-state-persistence.test.ts`
- To: `src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts`
- Move: `src/features/storefront/shared/storefront-overlay-events.test.ts`
- To: `src/modules/storefront-shell/client/storefront-overlay-events.test.ts`

**Interfaces:**
- Consumes: the existing `storefront-client-state.ts`, `storefront-overlay-events.ts`, and shared `storefrontUiStore` contracts.
- Produces: Unchanged client-state migration/persistence/auth-continuity and overlay-coordination coverage beside the canonical Storefront Shell client implementations.

- [ ] **Step 1: Move the four tests without editing content**

Run:

```powershell
Move-Item -LiteralPath 'src/features/storefront/shared/storefront-client-state.test.ts' -Destination 'src/modules/storefront-shell/client/storefront-client-state.test.ts'
Move-Item -LiteralPath 'src/features/storefront/shared/storefront-client-state-auth-continuity.test.ts' -Destination 'src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts'
Move-Item -LiteralPath 'src/features/storefront/shared/storefront-client-state-persistence.test.ts' -Destination 'src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts'
Move-Item -LiteralPath 'src/features/storefront/shared/storefront-overlay-events.test.ts' -Destination 'src/modules/storefront-shell/client/storefront-overlay-events.test.ts'
```

Expected: all four source paths are absent and all four destination paths exist. Do not alter imports; they are already canonical.

- [ ] **Step 2: Prove all four moves preserved exact bytes**

Run:

```powershell
$moved = @(
  'src/modules/storefront-shell/client/storefront-client-state.test.ts',
  'src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts',
  'src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts',
  'src/modules/storefront-shell/client/storefront-overlay-events.test.ts'
)
$moved | ForEach-Object { Get-FileHash -LiteralPath $_ -Algorithm SHA256 } | Format-Table Hash,Path -AutoSize
```

Expected: hashes match, in order, `510DDA7C2923038612DA79CA2084F91C7FDE3BACDF631665F7CD5A3D533DC9E8`, `50D1503D7F2BF6BD63308747ED0551CD65A1B98CB9B19F2A1AC8F8C75BE1AA37`, `DB7A97B816970E04F04D5CCBD1F3390BD25794DF51155F6E2D7E79B194577BF0`, and `0654E4D6BE37B04A9AB66DC0368D776D5A761A6B3E2C1D19B6463D9A6C91A47F`.

- [ ] **Step 3: Run the relocated focused tests**

Run:

```powershell
pnpm exec vitest run src/modules/storefront-shell/client/storefront-client-state.test.ts src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts src/modules/storefront-shell/client/storefront-overlay-events.test.ts
```

Expected: all four files pass, including the JSDOM overlay-event coordination cases.

- [ ] **Step 4: Review only these moves**

Run:

```powershell
git status --short -- src/features/storefront/shared/storefront-client-state.test.ts src/features/storefront/shared/storefront-client-state-auth-continuity.test.ts src/features/storefront/shared/storefront-client-state-persistence.test.ts src/features/storefront/shared/storefront-overlay-events.test.ts src/modules/storefront-shell/client/storefront-client-state.test.ts src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts src/modules/storefront-shell/client/storefront-overlay-events.test.ts
git diff --no-ext-diff -- src/features/storefront/shared/storefront-client-state.test.ts src/features/storefront/shared/storefront-client-state-auth-continuity.test.ts src/features/storefront/shared/storefront-client-state-persistence.test.ts src/features/storefront/shared/storefront-overlay-events.test.ts src/modules/storefront-shell/client/storefront-client-state.test.ts src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts src/modules/storefront-shell/client/storefront-overlay-events.test.ts
```

Expected: Git reports content-identical relocations or equivalent add/delete pairs and no semantic diff. Do not stage or commit.

### Task 4: Delete the Redundant Overlay Compatibility Files

**Owner:** Laitstyles UI engineer

**Files:**
- Delete: `src/features/storefront/shared/storefront-overlays.tsx`
- Delete: `src/features/storefront/shared/use-overlay-lifecycle.ts`
- Preserve unchanged: `src/modules/storefront-shell/ui/storefront-overlays.tsx`
- Preserve unchanged: `src/hooks/use-overlay-lifecycle.ts`
- Preserve unchanged: `src/features/storefront/shared/reveal.tsx`

**Interfaces:**
- Consumes: the Task 1 zero-consumer proof and identical hook hash.
- Produces: One canonical Storefront Shell overlays implementation and one canonical cross-domain overlay lifecycle hook, with no legacy duplicate or re-export.

- [ ] **Step 1: Repeat the zero-consumer and identical-hook proof immediately before deletion**

Run:

```powershell
rg -n 'features/storefront/shared/storefront-overlays|storefront/shared/storefront-overlays' src tests scripts
rg -n 'features/storefront/shared/use-overlay-lifecycle|storefront/shared/use-overlay-lifecycle' src tests scripts
Get-FileHash -LiteralPath 'src/features/storefront/shared/use-overlay-lifecycle.ts','src/hooks/use-overlay-lifecycle.ts' -Algorithm SHA256
```

Expected: neither search finds a consumer, and both hashes are `FCA67A5EF6360F5858766A5184C3FFF974B6E53797D34A5756C9FAC88C44005B`. Stop if the proof has changed.

- [ ] **Step 2: Delete only the two proven redundant files**

Run:

```powershell
Remove-Item -LiteralPath 'src/features/storefront/shared/storefront-overlays.tsx'
Remove-Item -LiteralPath 'src/features/storefront/shared/use-overlay-lifecycle.ts'
```

Expected: both legacy paths are absent. `src/modules/storefront-shell/ui/storefront-overlays.tsx`, `src/hooks/use-overlay-lifecycle.ts`, and `src/features/storefront/shared/reveal.tsx` still exist and are unchanged.

- [ ] **Step 3: Prove canonical implementations remain and the reveal boundary was untouched**

Run:

```powershell
Test-Path -LiteralPath 'src/modules/storefront-shell/ui/storefront-overlays.tsx'
Get-FileHash -LiteralPath 'src/hooks/use-overlay-lifecycle.ts' -Algorithm SHA256
Test-Path -LiteralPath 'src/features/storefront/shared/reveal.tsx'
git diff --exit-code -- src/features/storefront/shared/reveal.tsx src/features/storefront/home
```

Expected: both `Test-Path` checks return `True`, the canonical hook hash remains `FCA67A5EF6360F5858766A5184C3FFF974B6E53797D34A5756C9FAC88C44005B`, and the final diff command reports no change introduced by this slice. If the shared worktree already contains authorized reveal/home edits, compare against the Task 1 dirty-path record and prove this slice did not alter them; do not restore them.

### Task 5: Review and Validate the Complete Slice

**Owner:** Laitstyles reviewer

**Files:**
- Review: the six moved tests and two deleted legacy files listed in **Expected final source diff**
- Preserve: `src/features/storefront/shared/reveal.tsx` and `src/features/storefront/home/**`
- Inspect only: canonical implementations consumed by the moved tests and retained by the deletions

**Interfaces:**
- Consumes: Tasks 1–4 and the repository-owned validation commands.
- Produces: Exact command/result evidence, compared with the known dirty-worktree baseline, that identifies any new or changed failure attributable to this slice without relabelling pre-existing failures as passes.

Known comparison baseline for this shared worktree:

- The six relocated test files currently execute `30` passing tests out of `31`; one existing persistence-behaviour assertion fails. All six destination files retain the exact source hashes recorded in **Pre-implementation Evidence**.
- `module-export-guard.mjs` currently reports `12` errors.
- `architecture-guard.mjs` currently reports `1` error and `4` warnings.
- Repo-global TypeScript and `validate:full` gates are already red on failures outside this slice. Their exact current diagnostics/manifests must be captured and compared; they are not implied passes and must not be “fixed” by changing this plan's scope.
- A moved-test failure is attributable to this slice only if a moved file's bytes/hash changed or a dependency/runtime file edited by this slice caused it. With byte-identical test hashes and no slice-owned runtime/dependency edit, preserve and disclose the failure as baseline evidence rather than treating relocation alone as its cause.
- Any new failure, changed failure signature/count, or new warning attributable to the six moves or two deletions blocks this slice. An unchanged baseline failure must still be reported honestly with its command and comparison evidence.

- [ ] **Step 1: Run all six relocated tests together**

Run:

```powershell
pnpm exec vitest run src/modules/products/ui/storefront/add-to-bag-label.test.ts src/modules/cart/cart-lines.test.ts src/modules/storefront-shell/client/storefront-client-state.test.ts src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts src/modules/storefront-shell/client/storefront-overlay-events.test.ts
```

Expected result capture: record the file/test totals and the full failing test name/message. Compare with the known `30/31` baseline and re-run the Task 2–3 SHA-256 checks. The acceptable no-regression result is the same one persistence-behaviour failure with all six hashes unchanged and no runtime/dependency edit attributable to this slice. A different failure, changed count/signature, or changed hash blocks the slice; do not rewrite a moved test merely to turn the dirty-worktree baseline green.

- [ ] **Step 2: Run the architecture and storefront guards**

Run:

```powershell
pnpm check:architecture
node scripts/checks/module-export-guard.mjs
node scripts/checks/architecture-guard.mjs
pnpm check:storefront-production
```

Expected result capture: retain the aggregate command output even when its `&&` chain stops at the first failure, then run the named guards and storefront readiness command directly so every relevant result is observed. Compare exact paths, messages, counts, and warnings with the baseline: module-export must introduce no error beyond the existing `12`, architecture must introduce no error/warning beyond the existing `1` error and `4` warnings, and storefront readiness must have no new failure. Any new or changed diagnostic attributable to this slice blocks it. Disclose unchanged baseline failures as failures, not passes, and do not edit a guard to alter the result.

- [ ] **Step 3: Run focused Biome and TypeScript validation**

Run:

```powershell
pnpm exec biome check src/modules/products/ui/storefront/add-to-bag-label.test.ts src/modules/cart/cart-lines.test.ts src/modules/storefront-shell/client/storefront-client-state.test.ts src/modules/storefront-shell/client/storefront-client-state-auth-continuity.test.ts src/modules/storefront-shell/client/storefront-client-state-persistence.test.ts src/modules/storefront-shell/client/storefront-overlay-events.test.ts src/hooks/use-overlay-lifecycle.ts src/features/storefront/shared/reveal.tsx
pnpm typecheck
```

Expected result capture: record the focused Biome diagnostics and the complete TypeScript failure list/exit code. A new Biome diagnostic in a moved or retained scoped file, or any new/changed TypeScript diagnostic attributable to one of the six moves or two deletions, blocks this slice. Compare repo-global TypeScript failures with the captured dirty-worktree baseline; unchanged errors outside the slice remain failed validation evidence but are not a relocation regression. Do not run a broad formatter or edit an out-of-scope file to make either command green.

- [ ] **Step 4: Run the repository completion gate**

Run:

```powershell
pnpm validate:full
```

Expected result capture: preserve the `validate:full` exit code, manifest/summary paths, failing suite names, and diagnostics. Compare them with the pre-slice dirty-worktree gate evidence. This slice passes its regression comparison only when it adds no new failure and changes no existing failure attributable to its six moves or two deletions; the repo-global gate itself remains failed while unchanged outside-slice failures remain. Report those baseline failures and their ownership explicitly, and do not claim `validate:full` passed or expand this slice to repair them.

- [ ] **Step 5: Prove the final source inventory**

Run:

```powershell
$oldPaths = @(
  'src/features/storefront/shared/add-to-bag-label.test.ts',
  'src/features/storefront/shared/cart-lines.test.ts',
  'src/features/storefront/shared/storefront-client-state.test.ts',
  'src/features/storefront/shared/storefront-client-state-auth-continuity.test.ts',
  'src/features/storefront/shared/storefront-client-state-persistence.test.ts',
  'src/features/storefront/shared/storefront-overlay-events.test.ts',
  'src/features/storefront/shared/storefront-overlays.tsx',
  'src/features/storefront/shared/use-overlay-lifecycle.ts'
)
$oldPaths | ForEach-Object { "$_ => $(Test-Path -LiteralPath $_)" }
Get-ChildItem 'src/features/storefront/shared' -File | Sort-Object Name | Select-Object -ExpandProperty Name
rg -n 'features/storefront/shared/(add-to-bag-label|cart-lines|storefront-client-state|storefront-overlay-events|storefront-overlays|use-overlay-lifecycle)' src tests scripts
```

Expected: every owned old path reports `False`; the residue search returns no match. `reveal.tsx` remains present unless its separately authorized concurrent migration has completed without this slice touching it.

- [ ] **Step 6: Inspect scope and preserve the dirty worktree**

Run:

```powershell
git status --short
git diff --name-status
git diff --check
```

Expected: this slice contributes exactly six relocations (or six add/delete pairs) and two deletions. No `src/features/storefront/home/**`, `reveal.tsx`, runtime implementation, script, config, dependency, lockfile, Prisma, Supabase, or deployment change is attributable to this slice. Leave all changes unstaged and uncommitted for the parent workflow.

## Explicit Exclusions

- No move, edit, or deletion of `src/features/storefront/shared/reveal.tsx`.
- No edit to `src/features/storefront/home/components/home-section-heading.tsx`, `category-card.tsx`, or any other home file.
- No runtime implementation rewrite in Products, Cart, Storefront Shell, stores, or hooks.
- No change to `src/modules/storefront-shell/ui/storefront-overlays.tsx` or `src/hooks/use-overlay-lifecycle.ts`.
- No new compatibility re-export, barrel, alias, wrapper, or duplicate test.
- No architecture/check-script change; existing guards must validate the slice as written.
- No route, Server Component, Server Action, Route Handler, API, auth, persistence, inventory-model, checkout, payment, or order behaviour change.
- No UI, interaction, animation, theme, typography, spacing, accessibility, or responsive change; browser screenshot validation is not required for content-identical test moves and deletion of zero-consumer/duplicate files.
- No dependency, lockfile, Next.js, Tailwind, Prisma, Supabase, or deployment-configuration change.
- No staging or commit; the parent workflow owns integration.

## Rollback

If relocation or deletion exposes a consumer, changed hash, focused-test regression, or architecture failure, restore only this slice's six test source paths and two deleted legacy files from the same working-tree content or the parent workflow's recoverable diff. Do not restore or overwrite unrelated dirty paths. A discovered legacy consumer requires a newly scoped owner-specific migration plan before this residue slice is attempted again.

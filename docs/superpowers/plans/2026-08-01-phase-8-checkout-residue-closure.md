# Phase 8 Checkout Residue Closure Implementation Plan

**Status:** Implemented and merged; retained as a historical execution record. The four legacy files are absent and `legacyArchitectureExceptions` is empty. Do not execute the unchecked planning steps against the current tree.

**Goal:** Remove the final dead Phase 8 checkout compatibility residue and make the architecture exception registry and migration status match the already-canonical cart-drawer checkout flow.

**Architecture:** This is a deletion-only closure slice across legacy `src/features/**`, the architecture guard registry, and its owning status document. The canonical checkout remains the cart drawer/dialog composed from `src/modules/checkout/**`; the authenticated order-confirmation route continues reading a persisted, customer-owned order through `src/modules/orders/**`. No replacement runtime shim, helper, receipt store, or presentation component is introduced.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript 5.9, Vitest 4.1, Node architecture guards, pnpm 11.13.0.

## Global Constraints

- Active branch at planning time: `agent/storefront-checkout-delivery-promotions-redesign`; preserve all dirty and unrelated worktree changes.
- Package manager: `pnpm@11.13.0`; Node engine: `25.x`.
- `src/features/**` is legacy composition and closed to new production business modules.
- The cart drawer/dialog is the sole storefront checkout entry point; checkout remains owned by `src/modules/checkout/**` and checkout payment transports remain under `src/app/api/v1/payments/checkout/**`.
- Remove an obsolete compatibility edge and its machine-readable exception in the same implementation commit.
- Preserve the Phase 0 UI and interaction baseline. This slice intentionally changes no rendered JSX, route behavior, checkout state, payment behavior, or persistence behavior.
- Do not stage or alter any pre-existing dirty file outside the exact file list below.

---

## Verified Scope and Ownership

| Layer | Role | Exact files | Responsibility |
| --- | --- | --- | --- |
| Legacy `features` composition | UI engineer | Delete `src/features/storefront/checkout/checkout-helpers.test.ts`, `src/features/storefront/checkout/order-receipt.test.ts`, `src/features/storefront/checkout/components/confirm-metric.tsx`, `src/features/storefront/shared/storefront-runtime.ts` | Remove orphan tests and zero-consumer UI/runtime compatibility files; create no replacements. |
| Architecture guard registry | UI engineer, as owner of the registered `phase-8-checkout` exceptions | Modify `scripts/checks/architecture-legacy-exceptions.mjs` | Remove the two stale Phase 8 entries and the Phase 8-only scaffolding that would otherwise describe an empty exception set. |
| Migration records | Planner | Modify `docs/architecture-migration/phase-1-legacy-exceptions.md` | Record that Phase 8 checkout compatibility is complete, zero edges remain, and no shared runtime shim remains. |
| Verification | Reviewer | No source edits | Confirm the exact guard deltas, focused canonical checkout tests, diff scope, and known unrelated failures. |

### Evidence supporting deletion

- `checkout-helpers.test.ts` imports missing `./checkout-helpers`; it is one of exactly two orphaned legacy tests currently reported by the module-export guard. Its former client-calculated totals, fabricated receipt snapshot, timer, and local form validation are superseded by server-authoritative coverage in `src/modules/checkout/server/checkout.test.ts`, `delivery-policy.test.ts`, `get-checkout-context.test.ts`, and `ui/storefront/checkout-sheet.test.tsx`.
- `order-receipt.test.ts` imports missing `./order-receipt`; it is the second orphaned legacy test currently reported by the module-export guard. Session-storage receipt serialization is intentionally obsolete: `src/app/(storefront)/order-confirmation/page.tsx` authenticates the consumer, loads a customer-owned persisted order, requires paid status, and renders `src/modules/checkout/ui/order-confirmation.tsx`.
- `confirm-metric.tsx` exports `ConfirmMetric` but has no source consumer. Canonical order confirmation renders its persisted metadata through its local `MetaBlock`; no import needs repointing.
- `src/features/storefront/shared/storefront-runtime.ts` has no consumer. All current storefront and checkout consumers import `@/modules/storefront-shell/client/storefront-runtime` directly.
- `src/app/(storefront)/checkout/page.tsx` no longer exists, and `src/app/(storefront)/order-confirmation/page.tsx` no longer imports the legacy receipt module. Therefore both `phase8Edges` entries are stale rather than active compatibility permissions.

## Explicit Exclusions

- Do not split or otherwise edit the 857-line `src/modules/checkout/ui/storefront/checkout-sheet.tsx`; its `god-module` architecture failure remains unrelated work.
- Do not edit `src/modules/checkout/**`, `src/modules/orders/**`, `src/modules/payments/**`, `src/modules/storefront-shell/**`, any route, API handler, Prisma/Supabase file, package/config file, or lockfile.
- Do not restore a `/checkout` page, client-side checkout helper, session-storage receipt, `ConfirmMetric`, or a compatibility re-export.
- Do not port obsolete assertions for browser-calculated VAT, delivery fees, countdown timers, deterministic fake order numbers, or legacy receipt storage. Those behaviors are not canonical contracts.
- Do not add new tests merely to preserve deleted implementation details. Run the existing canonical coverage named in this plan.
- Do not address the other 12 current module-export errors, the checkout-sheet god-module error, or the four architecture warnings.
- Do not update `migration-tracker.md`, the payment architecture correction, historical Phase 7 documents, or old plans/specs; they remain historical records.
- Do not run browser/visual validation: no rendered source or interaction changes in this deletion-only slice.

---

### Task 1: Prove the deletion and guard baseline

**Owner:** UI engineer

**Files:**

- Inspect: `src/features/storefront/checkout/checkout-helpers.test.ts`
- Inspect: `src/features/storefront/checkout/order-receipt.test.ts`
- Inspect: `src/features/storefront/checkout/components/confirm-metric.tsx`
- Inspect: `src/features/storefront/shared/storefront-runtime.ts`
- Inspect: `src/app/(storefront)/order-confirmation/page.tsx`
- Inspect: `src/modules/checkout/ui/order-confirmation.tsx`
- Inspect: `src/modules/checkout/ui/storefront/checkout-sheet.test.tsx`
- Inspect: `src/modules/checkout/server/checkout.test.ts`
- Inspect: `src/modules/checkout/server/delivery-policy.test.ts`
- Inspect: `src/modules/checkout/server/get-checkout-context.test.ts`
- Inspect: `scripts/checks/architecture-legacy-exceptions.mjs`

**Interfaces:**

- Consumes: the current module graph and the completed checkout/payment architecture correction.
- Produces: a recorded red baseline showing exactly which failures this slice removes and proof that none of the four files has a live consumer.

- [ ] **Step 1: Recheck imports before deleting anything**

  Run:

  ```bash
  rg -n --glob '!docs/**' --glob '!ci-evidence/**' --glob '!playwright-artifacts/**' "checkout-helpers|order-receipt|confirm-metric|ConfirmMetric|features/storefront/shared/storefront-runtime" src scripts tests
  ```

  Expected: the two test files reference only their missing colocated modules; `ConfirmMetric` appears only in its defining file; the legacy shared runtime shim appears only in its defining file and the guard comment. The canonical order-confirmation route imports `@/modules/checkout/ui/order-confirmation`, and current runtime consumers import `@/modules/storefront-shell/client/storefront-runtime` directly. Stop and re-scope if any production consumer appears.

- [ ] **Step 2: Capture the module-export red baseline**

  Run:

  ```bash
  node scripts/checks/module-export-guard.mjs
  ```

  Expected at the verified planning baseline: FAIL with 14 errors. Exactly two are in scope:

  ```text
  src/features/storefront/checkout/checkout-helpers.test.ts: Cannot resolve internal module ./checkout-helpers.
  src/features/storefront/checkout/order-receipt.test.ts: Cannot resolve internal module ./order-receipt.
  ```

  Record the full baseline. The remaining 12 errors are unrelated and must not be changed by this task.

- [ ] **Step 3: Capture the architecture red baseline**

  Run:

  ```bash
  node scripts/checks/architecture-guard.mjs
  ```

  Expected at the verified planning baseline: FAIL with three errors and four warnings. The two in-scope errors are `stale-architecture-exception` for the deleted checkout route and the canonicalized order-confirmation route. The unrelated retained error is:

  ```text
  [god-module] src/modules/checkout/ui/storefront/checkout-sheet.tsx: src/modules/checkout/ui/storefront/checkout-sheet.tsx has 857 lines; split the god module.
  ```

  The four existing responsibility-review warnings are outside scope.

---

### Task 2: Delete the dead Phase 8 residue and retire its exceptions

**Owner:** UI engineer

**Files:**

- Delete: `src/features/storefront/checkout/checkout-helpers.test.ts`
- Delete: `src/features/storefront/checkout/order-receipt.test.ts`
- Delete: `src/features/storefront/checkout/components/confirm-metric.tsx`
- Delete: `src/features/storefront/shared/storefront-runtime.ts`
- Modify: `scripts/checks/architecture-legacy-exceptions.mjs`

**Interfaces:**

- Consumes: Task 1's zero-consumer proof and red guard baselines.
- Produces: no legacy checkout files under `src/features/storefront/checkout/**`, no shared runtime shim, and an empty `legacyArchitectureExceptions` export with the existing validation contract intact.

- [ ] **Step 1: Delete only the four verified files**

  Remove the four files listed above. If their parent checkout directories become empty, remove only those empty directories; do not touch any other `src/features/storefront/**` file.

- [ ] **Step 2: Reduce the exception registry to its truthful empty state**

  In `scripts/checks/architecture-legacy-exceptions.mjs`:

  - replace the historical Phase 7/Phase 8 preamble with a concise statement that Phase 7 auth and Phase 8 checkout exceptions are retired;
  - delete `phase8Edges` and `phase8Reason`;
  - replace the mapped Phase 8 export with:

  ```js
  export const legacyArchitectureExceptions = Object.freeze([]);
  ```

  - retain `export const legacyTopLevelServerFiles = new Set();`, duplicate-edge validation, and entry-shape validation. Do not weaken the architecture guard or change its checkout compatibility detection.

- [ ] **Step 3: Verify the module-export delta**

  Run:

  ```bash
  node scripts/checks/module-export-guard.mjs
  ```

  Expected: the two missing-module failures from Task 1 are absent. Against the verified baseline, the count drops from 14 to 12; every remaining failure matches the recorded unrelated baseline. Any new or changed failure blocks this task.

- [ ] **Step 4: Verify the architecture-guard delta**

  Run:

  ```bash
  node scripts/checks/architecture-guard.mjs
  ```

  Expected: neither stale Phase 8 exception appears. Against the verified baseline, the count drops from three errors to exactly one unrelated error: the existing 857-line `checkout-sheet.tsx` `god-module` finding. The same four unrelated warnings may remain. Any new or changed finding blocks this task.

- [ ] **Step 5: Run the focused boundary contract**

  Run:

  ```bash
  pnpm test src/lib/boundaries/server-client-boundary.test.ts
  ```

  Expected: PASS. The test must accept an immutable empty exception list and must not require Phase 8 entries.

- [ ] **Step 6: Commit the inseparable source and registry cleanup**

  Stage only these five paths and commit:

  ```bash
  git add src/features/storefront/checkout/checkout-helpers.test.ts src/features/storefront/checkout/order-receipt.test.ts src/features/storefront/checkout/components/confirm-metric.tsx src/features/storefront/shared/storefront-runtime.ts scripts/checks/architecture-legacy-exceptions.mjs
  git commit -m "refactor(checkout): retire phase 8 compatibility residue"
  ```

  Before committing, inspect `git diff --cached --name-status`; it must contain only the four deletions and one registry modification.

---

### Task 3: Record Phase 8 checkout compatibility closure

**Owner:** Planner

**Files:**

- Modify: `docs/architecture-migration/phase-1-legacy-exceptions.md`

**Interfaces:**

- Consumes: Task 2's deleted files, empty exception registry, and guard deltas.
- Produces: the authoritative human-readable record that no Phase 8 checkout exception or shared runtime shim remains.

- [ ] **Step 1: Replace active status with truthful closure status**

  Make these exact semantic updates without rewriting historical Phase 7 detail:

  - change the document status from active temporary exceptions to complete with zero active exceptions;
  - update the introduction to say both Phase 7 authentication and Phase 8 checkout compatibility are complete and that the machine-readable array is empty;
  - replace the sentence claiming `src/features/storefront/shared/storefront-runtime.ts` remains a Phase 8 edge with a statement that it was deleted after all consumers moved to `@/modules/storefront-shell/client/storefront-runtime`;
  - rename the Phase 8 section to `Phase 8 checkout compatibility — complete, zero edges remain`;
  - remove the two-row active exception table and record that the checkout page is gone, order confirmation reads canonical persisted order data, both stale registry entries were retired, and no checkout directory or shared runtime compatibility shim remains under `src/features/storefront/**`;
  - append one dated removal-discipline entry for this closure slice, naming the four deleted files and the two retired exception edges.

- [ ] **Step 2: Check documentation and registry agreement**

  Run:

  ```bash
  rg -n -e "Active temporary exceptions" -e "storefront-runtime\.ts.*remains" -e "These route-level presentation edges are owned" -e '^\| `src/app/\(storefront\)/(checkout|order-confirmation)/page\.tsx`' docs/architecture-migration/phase-1-legacy-exceptions.md scripts/checks/architecture-legacy-exceptions.mjs
  ```

  Expected: no matches. This rejects the stale active status, shim claim, explanatory text, and
  active exception-table rows without rejecting the required historical retirement record. Then
  run:

  ```bash
  rg -n "complete, zero edges remain|legacyArchitectureExceptions = Object.freeze\(\[\]\)|modules/storefront-shell/client/storefront-runtime" docs/architecture-migration/phase-1-legacy-exceptions.md scripts/checks/architecture-legacy-exceptions.mjs
  ```

  Expected: the completion language, empty registry, and canonical runtime path are present. Also
  verify the required retired-edge audit trail explicitly:

  ```bash
  rg -n -F -e "On 2026-08-01, Phase 8 checkout compatibility closed" -e "@/features/storefront/checkout/checkout-flow-v2" -e "@/features/storefront/checkout/order-receipt" docs/architecture-migration/phase-1-legacy-exceptions.md scripts/checks/architecture-legacy-exceptions.mjs
  ```

  Expected: the dated closure sentence and each retired specifier appear in the migration
  document's dated removal entry; neither retired specifier appears in the machine-readable
  registry. Historical strings are evidence of retirement, not active exceptions.

- [ ] **Step 3: Commit the migration record**

  ```bash
  git add docs/architecture-migration/phase-1-legacy-exceptions.md
  git commit -m "docs(architecture): record phase 8 checkout closure"
  ```

---

### Task 4: Review the bounded closure slice

**Owner:** Reviewer

**Files:**

- Review: the four deletions, `scripts/checks/architecture-legacy-exceptions.mjs`, and `docs/architecture-migration/phase-1-legacy-exceptions.md`

**Interfaces:**

- Consumes: Tasks 1-3 and their captured baselines.
- Produces: a completion report that distinguishes the fixed guard findings from unrelated retained failures.

- [ ] **Step 1: Run canonical checkout coverage**

  First capture the shared worktree state so any pre-existing checkout edits are reviewable:

  ```bash
  git status --short
  git diff --name-only -- src/modules/checkout src/modules/orders src/modules/payments src/modules/storefront-shell
  ```

  Run:

  ```bash
  pnpm test src/modules/checkout/lifecycle.test.ts src/modules/checkout/server/checkout.test.ts src/modules/checkout/server/create-checkout-idempotency.test.ts src/modules/checkout/server/delivery-policy.test.ts src/modules/checkout/server/get-checkout-context.test.ts src/modules/checkout/server/settle-payment-cancelled.test.ts src/modules/checkout/ui/storefront/checkout-sheet.test.tsx
  ```

  Gate: a clean pass is sufficient, but it is not assumed in this already-dirty shared worktree.
  Record the command's exact exit code and every failing test file, test name, assertion, and stack
  location. A failure blocks this closure if it imports a retired path, reports a module/export
  break caused by one of the four deletions, or can otherwise be reached through the import graph
  from a deleted file or deleted re-export. Confirm attribution with:

  ```bash
  rg -n --glob '!docs/**' --glob '!ci-evidence/**' --glob '!playwright-artifacts/**' "checkout-helpers|order-receipt|confirm-metric|ConfirmMetric|features/storefront/shared/storefront-runtime" src scripts tests
  ```

  A failure in a canonical checkout test is reportable but does not by itself fail this
  deletion-only slice when the failing source/test was already dirty in the captured worktree and
  the search plus import/dependency inspection proves there is no path to the retired files. Do not
  repair or waive that unrelated failure here; name it as pre-existing shared-worktree debt. The
  closure passes this step only when no observed failure is attributable through imports or the
  dependency graph to this deletion, and the active server-authoritative checkout contracts remain
  represented by the existing suite without restoring legacy client-only tests.

- [ ] **Step 2: Run static changed-scope validation**

  Run:

  ```bash
  pnpm biome scripts/checks/architecture-legacy-exceptions.mjs docs/architecture-migration/phase-1-legacy-exceptions.md
  pnpm typecheck
  ```

  Expected: Biome passes for the changed files. Typecheck introduces no error attributable to the four deletions or empty registry; document any unrelated failure exactly rather than reporting a pass.

- [ ] **Step 3: Re-run and compare both architecture guards**

  Run:

  ```bash
  node scripts/checks/module-export-guard.mjs
  node scripts/checks/architecture-guard.mjs
  ```

  Expected: the module-export guard has exactly the two planned missing-module failures removed, and the architecture guard has exactly the two planned stale-exception failures removed. The remaining 12 module-export failures, checkout-sheet god-module error, and four warnings remain documented as pre-existing and out of scope.

- [ ] **Step 4: Inspect final scope and absence**

  Run:

  ```bash
  git diff --name-status HEAD~2..HEAD
  rg -n --glob '!docs/**' --glob '!ci-evidence/**' --glob '!playwright-artifacts/**' "checkout-helpers|order-receipt|confirm-metric|ConfirmMetric|features/storefront/shared/storefront-runtime" src scripts tests
  ```

  Expected: the diff contains only the four deletions, one guard-registry modification, and one migration-document modification. No production or test consumer of the retired paths/symbols remains.

- [ ] **Step 5: Issue the completion report**

  Report the exact deletions, guard deltas, focused tests actually run, typecheck result, unrelated retained failures/warnings, absence of browser validation because no rendered source changed, and the preserved cart-drawer checkout/prototype boundaries. Do not claim the repository-wide architecture gate is green while the unrelated god-module finding remains.

## Rollback

Revert the two implementation commits together so source, registry, and migration documentation cannot disagree:

```bash
git revert --no-commit <docs-commit> <source-and-registry-commit>
git commit -m "revert: restore phase 8 checkout compatibility residue"
```

Rollback must restore all four legacy files, both exact Phase 8 registry entries with their ownership/removal metadata, and the prior active Phase 8 documentation in one reviewable change. Re-run both architecture guards after rollback; the two missing-module errors and two stale-exception errors are expected to return unless their missing legacy implementations/routes are also restored under a separately approved scope.

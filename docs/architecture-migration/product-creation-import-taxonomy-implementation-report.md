# Product Creation, Browser Draft Import, and Catalogue Structure — Implementation Report

**Branch:** `codex/product-creation-import-taxonomy`
**Plan:** `docs/superpowers/plans/2026-07-28-product-creation-import-taxonomy.md`
**Source status:** Complete (Tasks 1–10)
**Certification status:** Focused regression and static gates green; full-suite/build/browser gates carry pre-existing, unrelated failures (see below)

## What changed in this pass (Task 10 closeout)

Tasks 1–9 were already committed (`29d80942`..`81e91a77`) from earlier sessions. This pass finished Task 10:

- Moved `createProductEditorValues`, `createEmptyProductEditorValues`, and `changeProductEditorMode` into `src/modules/products/editor-defaults.ts`; `src/lib/admin/product-editor/product-editor-defaults.ts` is now a pure re-export facade, matching the existing `product-editor-types.ts` / `product-editor-schema.ts` / `product-editor-stock-guard.ts` facades.
- Fixed 4 production files (`product-import-session.tsx`, `product-editor-dialog.tsx`, `product-editor-stepper.tsx`, `src/modules/settings/types.ts`) that still imported the legacy `@/lib/admin/product-editor/*` and `@/lib/admin/inventory/inventory-types` paths directly instead of the canonical `@/modules/products/*` ones.
- Fixed `src/modules/products/server/storefront/type-ownership.test.ts`: its "type-only compatibility import" check matched individual source lines rather than whole import statements, so a legitimate multi-line `import type {...} from "@/lib/storefront/types"` in `product-selection.ts` was false-flagged. Replaced with statement-bounded matching (`^import\s[\s\S]*?;`).
- Raised `src/modules/products/server/editor-ownership.test.ts`'s default 5s timeout to 20s — it recursively reads every file under `src/modules`, and under load on this machine that legitimately exceeds 5s (same class of flake previously logged against `server-client-boundary.test.ts` and now also observed on `admin-persistence-boundary.test.ts`; not a real violation, an environment/FS-speed issue).
- Carried forward and verified a substantial uncommitted refinement pass across the import/taxonomy/catalogue-workspace/product-editor files (present in the working tree from an earlier session, never landed) — added `handleApiRequestRaw` to `src/lib/http/server.ts` for the Cloudinary signing route's non-enveloped response contract, extended `error-validation-contract.mjs` for the taxonomy update/reorder schema union, and added `AdminIcon` as a small shared icon wrapper.
- Wrote and committed the Task 10 acceptance suite: `tests/e2e/admin-product-creation.spec.ts` (518 lines: Cloudinary signing contract, import child isolation/navigation, ignored import assets, Category/Collection CRUD, deletion guards) plus `tests/e2e/fixtures/product-import.{csv,json}`.

An unrelated, already-uncommitted diff (account/returns migration — real Prisma-backed work for account addresses and returns, pre-built ahead of Plan 02 of the API/Paystack migration suite) was found tangled into this branch's working tree. It was stashed (`git stash` — message: "wip: account/returns migration (Plan 02, park until Plan 1 lands)") rather than committed here, since it is out of scope for this plan and had never been through task review.

## Validation run

- `pnpm test src/app/api/v1/admin/assets/sign src/lib/assets/client src/modules/products` — **141/141 passing.**
- `pnpm typecheck` — **clean.**
- `pnpm check:architecture` — **fails**, but solely on `src/features/storefront/account/modals/account-modals.tsx` (963 lines, god-module threshold 800). Confirmed via `git diff <merge-base main HEAD> HEAD -- <file>` that this file is byte-identical between the branch's merge-base and current `origin/main` — it is a pre-existing, main-inherited condition, not introduced by this plan. Not fixed here (unplanned scope, not part of this plan's file list).
- `pnpm validate:full` — **fails overall**; breakdown:
  - `node-version`: fails — environment has Node v26.5.0, `package.json` pins `25.x`. Environment mismatch, not a code issue.
  - `static`: fails — same pre-existing `account-modals.tsx` god-module finding above.
  - `tests` (full suite, not just this plan's focused scope): 8 failures across 7 files (`admin-persistence-boundary.test.ts` — same flaky 5s-timeout class as fixed above, not yet raised in that file; `server-client-boundary.test.ts` — pre-existing upward-import flag on `src/modules/storefront-shell/ui/account-primitives.tsx`, confirmed byte-identical vs. `origin/main`; `auth/schema.test.ts` ×2; `storefront-client-state-persistence.test.ts`; `inventory/client/api.test.ts`; two `inventory` route tests expecting HTTP 400 but receiving 422). None touch this plan's owned files (`assets/sign`, `assets/client`, `modules/products/**`); all confirmed pre-existing or unrelated.
  - `persistence` / `authorization`: fail — both refuse to run because no database in this environment satisfies the repo's own `assertDisposableAcceptanceDatabase` guard (requires a `localhost`-class host or a database name containing `acceptance`/`disposable`/`e2e`/`test`; the configured `.env.local` `DATABASE_URL` is a named Supabase project, `postgres`). Reported as blocked, not inferred as passing, per doctrine.
  - `build`: passed-with-warnings (React Doctor surfaced 185 findings across the whole app, mostly performance/maintainability suggestions unrelated to this plan's files; two Security-severity findings exist but are outside this plan's scope).
- `pnpm validate:browser` / Playwright: **not run.** Requires a live dev server plus an authenticated staff session (`PRODUCT_CREATION_STAFF_STORAGE_STATE` or `PHASE_1_6_STAFF_STORAGE_STATE`); not attempted in this pass — reported as pending, not inferred as passing.

## Completion definition check (against the plan's Task 10)

- [x] Focused regression, architecture (modulo the pre-existing unrelated finding), and typecheck gates run with evidence captured.
- [x] Legacy `CatalogueTaxonomyManager` deleted and de-referenced (`rg "CatalogueTaxonomyManager" src` → no hits).
- [x] Browser acceptance spec and fixtures written and committed.
- [ ] `pnpm validate:full` fully green — blocked by pre-existing/environment issues enumerated above, none attributable to this plan.
- [ ] `pnpm validate:browser` — not run (needs live server + staff auth session).

## Commits (this pass)

- `9987eb75` — fix(products): close remaining module-boundary and contract gaps
- `5509830c` — test(products): certify creation and catalogue flows

# Repository Structural Reorganization & Admin Server-State Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `laitstyles` for clarity (split `lib/admin/`'s 60 flat files by sub-domain, rename `*-actions.ts` reducers, delete dead code, split two oversized files), consolidate the two TanStack Query provider factories into one, add Cache Components caching to the one Prisma-backed read path that needs it, and migrate all six admin domains (Inventory, Orders, Holds, Returns, Customers, Settings) from the monolithic `useSyncExternalStore` admin store onto TanStack Query.

**Architecture:** `AdminStore` (the synchronous in-memory reducer) keeps owning all business logic and validation unchanged. TanStack Query becomes a client-cache/re-render boundary in front of the already-Promise-shaped `AdminRepositories` read interface and the store's mutation methods — not a new persistence layer. File moves are mechanical (git history preserved via `git mv`), verified by `pnpm typecheck` catching any missed import.

**Tech Stack:** Next.js 16.2.10 (Cache Components / `use cache` / `cacheTag` / `cacheLife`), React 19.2.4 (`use()`), TypeScript 5, `@tanstack/react-query` 5.101.2, Biome 2.5.3, Vitest 4, pnpm.

## Global Constraints

- Node `25.x` (`.nvmrc`), pnpm via `packageManager` field — use `pnpm`, never `npm`/`yarn`.
- Biome (`biome.json`): CRLF line endings, double quotes, semicolons always, trailing commas everywhere, 2-space indent, 100-char lines. Run `pnpm lint` (which runs `biome check .`) after every task — do not hand-format.
- Verification commands for every task, run in this order, all must pass before committing: `pnpm typecheck` (→ `tsc --noEmit --pretty false --incremental false`), `pnpm lint`, `pnpm test` (→ `vitest run --passWithNoTests`), `pnpm audit:buttons` (must keep passing — unrelated invariant, do not regress it). Run `pnpm build` at the end of each **workstream** (not every task — it's slow), and always before the final task.
- `Result<TSuccess, TError>` error-handling convention (from `@/lib/admin/shared/result` after Workstream 2) must be preserved exactly everywhere it's already used — never make a reducer throw instead of returning `Result`.
- This is Phase 12 work under a recorded direct user override (`docs/superpowers/specs/2026-07-16-repo-restructuring-and-admin-query-migration-design.md`, "Governance note"). Phase 10/11 blockers stay recorded as blocked — nothing in this plan touches them.
- No optimistic updates anywhere in the TanStack migration (Workstream 8). Every mutation resolves synchronously and authoritatively — use `queryClient.setQueryData` with the fresh repository value, never `invalidateQueries`-then-refetch, and never an optimistic write before the mutation settles.
- No fabricated latency, no fake persistence claims, no invented invalidation triggers for writes that don't exist yet (admin mutations are not Prisma-backed; do not call `revalidateTag` from anywhere in this plan except the one caching workstream's documented tag names).
- Use `git mv <old> <new>` for every file move/rename in this plan (preserves git history / blame) — never delete-and-recreate.
- Each task ends with its own commit. Do not batch multiple tasks into one commit.
- If a task's verification step fails and can't be fixed quickly, revert that task's commit rather than leave it broken or proceed to the next task on top of a known-failing one (spec risk register). Fix, then redo the task as a fresh commit.

---

## Workstream 1 — Foundation Cleanup

### Task 1.1: Delete stale re-export shims

**Files:**
- Delete: `src/lib/client.ts`, `src/lib/server.ts`, `src/lib/middleware.ts`

**Interfaces:** None — these three files have zero importers anywhere in `src/` (confirmed by repo-wide grep for the exact specifiers `@/lib/client`, `@/lib/server`, `@/lib/middleware`; the only hit is `src/lib/boundaries/server-client-boundary.test.ts`, which lists the strings as forbidden-import literals to scan for, not an import of them).

- [ ] **Step 1: Confirm zero importers (safety re-check before deleting)**

Run:
```bash
grep -rn '"@/lib/client"\|"@/lib/server"\|"@/lib/middleware"' src/ --include='*.ts' --include='*.tsx'
```
Expected: only one hit, inside `src/lib/boundaries/server-client-boundary.test.ts`, as a string-array literal (`FORBIDDEN_CLIENT_IMPORTS`), not an `import` statement. If any other file shows up, stop and investigate before deleting — do not proceed with the delete.

- [ ] **Step 2: Delete the three shims**

```bash
git rm src/lib/client.ts src/lib/server.ts src/lib/middleware.ts
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass (no importer means no break).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(lib): delete unused re-export shims for supabase client/server/middleware"
```

---

### Task 1.2: Rename the colliding `session.ts`

**Files:**
- Modify (rename): `src/server/authorization/session.ts` → `src/server/authorization/storefront-session.ts`

**Interfaces:**
- Consumes: `getVerifiedIdentity` from `@/lib/auth/server/session` (unchanged, not touched by this task).
- Produces: `StorefrontSession` interface, `getStorefrontSession()`, `requireStorefrontSession()` — same names, new import path `@/server/authorization/storefront-session`. `src/lib/auth/server/session.ts` is untouched and keeps its name (it's the lower-level Supabase-identity file; only the storefront-composition file that collided with it on filename gets renamed).

Confirmed by research: `src/server/authorization/session.ts` currently has **zero importers anywhere in `src/`** (it's dead-but-intentional groundwork, not yet wired to a route). This is a pure rename with no downstream fixups needed beyond a repo-wide grep safety check.

- [ ] **Step 1: Rename the file**

```bash
git mv src/server/authorization/session.ts src/server/authorization/storefront-session.ts
```

- [ ] **Step 2: Confirm no importer needs updating**

Run:
```bash
grep -rn '@/server/authorization/session"' src/ --include='*.ts' --include='*.tsx'
```
Expected: no output (zero importers). If any file shows up, update its import to `@/server/authorization/storefront-session` before continuing.

- [ ] **Step 3: Verify the renamed file's own internal import is untouched**

Read `src/server/authorization/storefront-session.ts` and confirm line 4 still reads:
```ts
import { getVerifiedIdentity } from "@/lib/auth/server/session";
```
(This is the *other* session file — `lib/auth/server/session.ts` — which is not renamed by this task.)

- [ ] **Step 4: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(auth): rename server/authorization/session.ts to storefront-session.ts

Resolves the filename collision with lib/auth/server/session.ts (the
lower-level Supabase-identity file this one composes on top of) so
grep/import-autocomplete no longer surfaces two same-named files from
two different auth roots."
```

---

### Task 1.3: Fix sonner.tsx's direct next-themes import

**Files:**
- Modify: `src/components/ui/sonner.tsx:11`

**Interfaces:**
- Consumes: `useTheme` — same exported name, switching source from the raw `next-themes` package to the app's own wrapper `@/components/theme/theme-provider`, which itself wraps `next-themes`' `useTheme` (aliased internally as `useNextTheme`) and adds the app's `ThemePreference`/`ResolvedTheme` typing.

- [ ] **Step 1: Change the import**

In `src/components/ui/sonner.tsx`, change line 11 from:
```ts
import { useTheme } from "next-themes";
```
to:
```ts
import { useTheme } from "@/components/theme/theme-provider";
```
No other line in the file changes — the wrapper hook is also named `useTheme` and returns a compatible shape (it wraps `next-themes`'s hook).

- [ ] **Step 2: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass. If `tsc` reports a shape mismatch on whatever `sonner.tsx` does with the returned value (e.g. `.theme`), open `src/components/theme/theme-provider.tsx` and confirm the wrapper's returned `ThemeContextValue` shape includes the field(s) `sonner.tsx` reads — adjust `sonner.tsx`'s destructuring only if genuinely required (do not modify `theme-provider.tsx` itself for this task; it is scoped to fixing the import only).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sonner.tsx
git commit -m "fix(ui): route sonner's useTheme through the app's theme-provider wrapper

sonner.tsx was importing next-themes directly instead of going through
@/components/theme/theme-provider like every other consumer."
```

---

### Task 1.4: Delete orphaned v1 layout components

**Files:**
- Delete: `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`, `src/components/layout/cart-sheet.tsx`

**Interfaces:** None. Re-verified from scratch (not reusing a stale prior finding) via full render-tree trace: `src/app/layout.tsx` → `AppProviders` → `SiteChrome` (`src/components/layout/site-chrome.tsx`) → imports `SiteHeader`/`SiteFooter` from `@/features/storefront/shell/site-header` (the live "storefront v2" components) and `StorefrontCartSheet` from `@/components/layout/storefront-cart-sheet` — a **different** file. `header.tsx`/`footer.tsx`/`cart-sheet.tsx` are unreachable from any entry point; the only importer of `cart-sheet.tsx` is `header.tsx` itself (the other dead file). A same-day commit touched all three files but only for a mechanical button-primitive sweep — it did not add any new importer.

- [ ] **Step 1: Re-confirm zero live importers**

Run:
```bash
grep -rn 'layout/header"\|layout/footer"\|layout/cart-sheet"' src/ --include='*.ts' --include='*.tsx'
```
Expected: the only hits are `cart-sheet.tsx` being imported by `header.tsx` (the file you're about to delete alongside it) — no import from any other file. If any other file imports one of these three, stop and investigate before deleting.

- [ ] **Step 2: Delete the three files**

```bash
git rm src/components/layout/header.tsx src/components/layout/footer.tsx src/components/layout/cart-sheet.tsx
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: all pass, and `pnpm build`'s route list shows no missing chunks (confirms nothing was actually reachable through these files).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(components): delete dead v1 layout components

header.tsx, footer.tsx, cart-sheet.tsx are unreachable from any route —
the live storefront chrome is features/storefront/shell/site-header.tsx
+ components/layout/storefront-cart-sheet.tsx, wired through site-chrome.tsx."
```

This closes Workstream 1. Run `pnpm build` once more (already done in step 3 above) before starting Workstream 2.

---

## Workstream 2 & 3 — Admin Domain Split + Reducer Naming Clarity

These two spec workstreams are merged (per spec: "This workstream [3] merges into Workstream 2's file moves — same files, one rename+move pass"). `lib/admin/`'s 60 flat files split into 8 sub-domain folders. The 9 files named `*-actions.ts` are pure `(state, input) => Result<{state, action}, error>` reducer functions (not Next.js Server Actions) and get renamed to `*-reducer.ts` in the same pass.

**Target structure** (confirmed against the actual 60-file inventory):
```
src/lib/admin/
  inventory/       (16 files — inventory-*.ts ×10, catalogue-taxonomy.ts+test, sku.ts+test, product-lifecycle-reducer.ts+test)
  product-editor/  (14 files — product-editor-*.ts ×13, intake-reducer.ts)
  orders/          (6 files — order-reducer.ts, offline-sale-reducer.ts, sales-selectors.ts, sales-stock.ts, sales-types.ts, sales-actions.test.ts)
  holds/           (1 file — hold-reducer.ts)
  returns/         (1 file — return-reducer.ts)
  customers/       (9 files — customer-reducer.ts+test, customer-metrics.ts, customer-products.ts, customer-profile-seed.ts, customer-selectors.ts+test, customer-timeline.ts, customer-types.ts)
  settings/        (7 files — settings-reducer.ts+test, settings-defaults.ts, settings-schema.ts+test, settings-section-schemas.ts, settings-types.ts)
  shared/          (6 files — result.ts, formatters.ts, types.ts, selectors.ts, seed.ts, admin-seed.ts — seed.ts itself is further split into a seed/ folder in Workstream 6)
  data/            (unchanged — repositories.ts, in-memory/)
```
16+14+6+1+1+9+7+6 = 60, matching the confirmed current file count exactly.

**Judgment calls made where the spec's tree diagram didn't name a file explicitly** (documented here so a reviewer can override): `intake-actions.ts` isn't matched by the spec's literal `product-editor-*.ts` glob, but its only two consumers (`product-editor-actions.ts`'s barrel and `product-editor-save-action.ts`) both live in `product-editor/` — colocating it there follows the actual dependency graph rather than the filename pattern. `offline-sale-actions.ts`, `sales-selectors.ts`, `sales-stock.ts`, `sales-types.ts`, `sales-actions.test.ts` go to `orders/` per the spec's explicit parenthetical "sales-*.ts shared with holds/returns as needed." `admin-seed.ts` (the barrel renaming `activeControlRoomSeed`/`newStoreControlRoomSeed` to `activeAdminSeed`/`newStoreAdminSeed`) moves alongside `seed.ts` into `shared/`.

### Task 2.0: Add the one-off import-path rewrite tool

This mechanical move touches ~60 files with potentially dozens of cross-references each. Rather than hand-enumerating every importer (error-prone at this scale), each domain task runs this script with an explicit, exact old→new specifier mapping, then leans on `pnpm typecheck` to catch anything the script's simple string-match didn't reach. The script is deleted at the end of Workstream 2/3 (Task 2.10) — it is migration scaffolding, not a permanent repo tool.

**Files:**
- Create: `scripts/tmp-rewrite-imports.mjs`

**Interfaces:**
- Consumes: a JSON file path as `argv[2]`, shaped `[{ "from": "@/lib/admin/foo", "to": "@/lib/admin/domain/foo" }, ...]`.
- Produces: rewrites every exact-match quoted import specifier under `src/**/*.{ts,tsx}` in place; prints a count of files changed.

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const mappingPath = process.argv[2];
if (!mappingPath) {
  console.error("Usage: node scripts/tmp-rewrite-imports.mjs <mapping.json>");
  process.exit(1);
}
const mappings = JSON.parse(readFileSync(mappingPath, "utf8"));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (extname(entry.name) === ".ts" || extname(entry.name) === ".tsx") {
      out.push(full);
    }
  }
  return out;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let changedFiles = 0;
for (const file of walk("src")) {
  const original = readFileSync(file, "utf8");
  let content = original;
  for (const { from, to } of mappings) {
    const pattern = new RegExp(`(["'\`])${escapeRegExp(from)}\\1`, "g");
    content = content.replace(pattern, `$1${to}$1`);
  }
  if (content !== original) {
    writeFileSync(file, content);
    changedFiles += 1;
  }
}
console.log(`Rewrote imports in ${changedFiles} file(s).`);
```

Note: the regex anchors both the opening and closing quote character around the *entire* specifier (`(["'\`])from\1`), so `@/lib/admin/types` never accidentally matches inside a longer specifier like `@/lib/admin/inventory-types` — only an exact full-string import path is rewritten.

- [ ] **Step 2: Smoke-test the script on a throwaway mapping**

```bash
mkdir -p /tmp/rewrite-test
echo '[{"from":"@/lib/admin/result","to":"@/lib/admin/shared/result"}]' > /tmp/rewrite-test/mapping.json
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-test/mapping.json
```
Expected: prints `Rewrote imports in N file(s).` where N is a plausible small number (every current importer of `@/lib/admin/result`). Run `git diff --stat` to confirm only import lines changed, nothing else. **Then revert this smoke test** — it ran before the actual `shared/` move happens in Task 2.8, so the path doesn't exist yet and this rewrite would break the build if left in place:
```bash
git checkout -- .
```

- [ ] **Step 3: Commit the script itself (not yet used for a real move)**

```bash
git add scripts/tmp-rewrite-imports.mjs
git commit -m "chore(scripts): add one-off import-path rewrite tool for the lib/admin domain split

Temporary migration tool for Workstream 2/3 — deleted once the domain
split lands (see Task 2.10)."
```

---

### Task 2.1: Split the Inventory domain

**Files:**
- Move + rename: `src/lib/admin/product-lifecycle-actions.ts` → `src/lib/admin/inventory/product-lifecycle-reducer.ts`
- Move + rename: `src/lib/admin/product-lifecycle-actions.test.ts` → `src/lib/admin/inventory/product-lifecycle-reducer.test.ts`
- Move (name unchanged): `src/lib/admin/inventory-constants.ts`, `inventory-derivations.ts`, `inventory-draft-validation.test.ts`, `inventory-product-validation.ts`, `inventory-query.ts`, `inventory-selectors.ts`, `inventory-selectors.test.ts`, `inventory-types.ts`, `inventory-validation-types.ts`, `inventory-validation.ts`, `catalogue-taxonomy.ts`, `catalogue-taxonomy.test.ts`, `sku.ts`, `sku.test.ts` → same names under `src/lib/admin/inventory/`

**Interfaces:**
- Produces: every symbol these 16 files export is now reachable at `@/lib/admin/inventory/<filename>` instead of `@/lib/admin/<filename>` (except `product-lifecycle-reducer`, whose new export path is also a rename). `admin-store.ts`'s import of `applyArchiveProduct`/`applyDeleteProduct`/`applyRestoreProduct`/`ProductLifecycleActionError`/`ProductLifecycleActionSuccess` moves from `@/lib/admin/product-lifecycle-actions` to `@/lib/admin/inventory/product-lifecycle-reducer`.

- [ ] **Step 1: Create the folder and move files**

```bash
mkdir -p src/lib/admin/inventory
git mv src/lib/admin/inventory-constants.ts src/lib/admin/inventory/inventory-constants.ts
git mv src/lib/admin/inventory-derivations.ts src/lib/admin/inventory/inventory-derivations.ts
git mv src/lib/admin/inventory-draft-validation.test.ts src/lib/admin/inventory/inventory-draft-validation.test.ts
git mv src/lib/admin/inventory-product-validation.ts src/lib/admin/inventory/inventory-product-validation.ts
git mv src/lib/admin/inventory-query.ts src/lib/admin/inventory/inventory-query.ts
git mv src/lib/admin/inventory-selectors.ts src/lib/admin/inventory/inventory-selectors.ts
git mv src/lib/admin/inventory-selectors.test.ts src/lib/admin/inventory/inventory-selectors.test.ts
git mv src/lib/admin/inventory-types.ts src/lib/admin/inventory/inventory-types.ts
git mv src/lib/admin/inventory-validation-types.ts src/lib/admin/inventory/inventory-validation-types.ts
git mv src/lib/admin/inventory-validation.ts src/lib/admin/inventory/inventory-validation.ts
git mv src/lib/admin/catalogue-taxonomy.ts src/lib/admin/inventory/catalogue-taxonomy.ts
git mv src/lib/admin/catalogue-taxonomy.test.ts src/lib/admin/inventory/catalogue-taxonomy.test.ts
git mv src/lib/admin/sku.ts src/lib/admin/inventory/sku.ts
git mv src/lib/admin/sku.test.ts src/lib/admin/inventory/sku.test.ts
git mv src/lib/admin/product-lifecycle-actions.ts src/lib/admin/inventory/product-lifecycle-reducer.ts
git mv src/lib/admin/product-lifecycle-actions.test.ts src/lib/admin/inventory/product-lifecycle-reducer.test.ts
```

- [ ] **Step 2: Write the rewrite mapping and run it**

Create `/tmp/rewrite-inventory.json`:
```json
[
  { "from": "@/lib/admin/inventory-constants", "to": "@/lib/admin/inventory/inventory-constants" },
  { "from": "@/lib/admin/inventory-derivations", "to": "@/lib/admin/inventory/inventory-derivations" },
  { "from": "@/lib/admin/inventory-product-validation", "to": "@/lib/admin/inventory/inventory-product-validation" },
  { "from": "@/lib/admin/inventory-query", "to": "@/lib/admin/inventory/inventory-query" },
  { "from": "@/lib/admin/inventory-selectors", "to": "@/lib/admin/inventory/inventory-selectors" },
  { "from": "@/lib/admin/inventory-types", "to": "@/lib/admin/inventory/inventory-types" },
  { "from": "@/lib/admin/inventory-validation-types", "to": "@/lib/admin/inventory/inventory-validation-types" },
  { "from": "@/lib/admin/inventory-validation", "to": "@/lib/admin/inventory/inventory-validation" },
  { "from": "@/lib/admin/catalogue-taxonomy", "to": "@/lib/admin/inventory/catalogue-taxonomy" },
  { "from": "@/lib/admin/sku", "to": "@/lib/admin/inventory/sku" },
  { "from": "@/lib/admin/product-lifecycle-actions", "to": "@/lib/admin/inventory/product-lifecycle-reducer" }
]
```

Run:
```bash
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-inventory.json
```

- [ ] **Step 3: Verify — typecheck is the safety net for anything the script's exact-match missed**

```bash
pnpm typecheck
```
Expected: 0 errors. If any error names an unresolved `@/lib/admin/<old-name>` import, fix that specific file by hand (it means a relative or otherwise-shaped import the script's exact-string match didn't catch), then re-run `pnpm typecheck` until clean.

```bash
pnpm lint && pnpm test
```
Expected: all pass. `product-lifecycle-reducer.test.ts` in particular — confirm it still finds whatever it actually imports (research flagged this test file as not directly importing `product-lifecycle-actions.ts`; open it and confirm its imports resolved correctly after the move).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(admin): split inventory domain into lib/admin/inventory/

Moves the 10 inventory-*.ts files, catalogue-taxonomy.ts, sku.ts, and
renames product-lifecycle-actions.ts -> product-lifecycle-reducer.ts
(it's a pure state reducer, not a Next.js Server Action)."
```

---

### Task 2.2: Split the Product Editor domain

**Files:**
- Move + rename: `src/lib/admin/product-editor-actions.ts` → `src/lib/admin/product-editor/product-editor-reducer.ts`
- Move + rename: `src/lib/admin/product-editor-actions.test.ts` → `src/lib/admin/product-editor/product-editor-reducer.test.ts`
- Move + rename: `src/lib/admin/intake-actions.ts` → `src/lib/admin/product-editor/intake-reducer.ts`
- Move (name unchanged): `product-editor-catalogue-validation.test.ts`, `product-editor-conversion.ts`, `product-editor-conversion.test.ts`, `product-editor-defaults.ts`, `product-editor-pricing.test.ts`, `product-editor-save-action.ts`, `product-editor-schema.ts`, `product-editor-state-utils.ts`, `product-editor-stock-guard.ts`, `product-editor-stock-guard.test.ts`, `product-editor-types.ts` → same names under `src/lib/admin/product-editor/`

**Interfaces:**
- Produces: `product-editor-reducer.ts`'s barrel re-exports (`IntakeStateResult`, `applyIntakeTransition`, `createInitialIntakeRecords`, `formatIntakeStage`, `getAdjacentIntakeStages`, `updateIntakeAfterEditorAction`, `ProductEditorStateResult`, `applyProductEditorAction`) are now at `@/lib/admin/product-editor/product-editor-reducer`. `intake-reducer.ts`'s direct exports move to `@/lib/admin/product-editor/intake-reducer`.
- Consumes (unchanged after this task): `admin-store.ts` imports `applyIntakeTransition`, `applyProductEditorAction`, `createInitialIntakeRecords` — all still come through the barrel, just at the new path.

- [ ] **Step 1: Create the folder and move files**

```bash
mkdir -p src/lib/admin/product-editor
git mv src/lib/admin/product-editor-catalogue-validation.test.ts src/lib/admin/product-editor/product-editor-catalogue-validation.test.ts
git mv src/lib/admin/product-editor-conversion.ts src/lib/admin/product-editor/product-editor-conversion.ts
git mv src/lib/admin/product-editor-conversion.test.ts src/lib/admin/product-editor/product-editor-conversion.test.ts
git mv src/lib/admin/product-editor-defaults.ts src/lib/admin/product-editor/product-editor-defaults.ts
git mv src/lib/admin/product-editor-pricing.test.ts src/lib/admin/product-editor/product-editor-pricing.test.ts
git mv src/lib/admin/product-editor-save-action.ts src/lib/admin/product-editor/product-editor-save-action.ts
git mv src/lib/admin/product-editor-schema.ts src/lib/admin/product-editor/product-editor-schema.ts
git mv src/lib/admin/product-editor-state-utils.ts src/lib/admin/product-editor/product-editor-state-utils.ts
git mv src/lib/admin/product-editor-stock-guard.ts src/lib/admin/product-editor/product-editor-stock-guard.ts
git mv src/lib/admin/product-editor-stock-guard.test.ts src/lib/admin/product-editor/product-editor-stock-guard.test.ts
git mv src/lib/admin/product-editor-types.ts src/lib/admin/product-editor/product-editor-types.ts
git mv src/lib/admin/product-editor-actions.ts src/lib/admin/product-editor/product-editor-reducer.ts
git mv src/lib/admin/product-editor-actions.test.ts src/lib/admin/product-editor/product-editor-reducer.test.ts
git mv src/lib/admin/intake-actions.ts src/lib/admin/product-editor/intake-reducer.ts
```

- [ ] **Step 2: Fix the barrel's own internal imports**

`product-editor-reducer.ts` (formerly `product-editor-actions.ts`) re-exports from `intake-actions.ts` and `product-editor-save-action.ts` by relative-looking absolute path. Open `src/lib/admin/product-editor/product-editor-reducer.ts` and update its own two import specifiers:
```ts
export type { IntakeStateResult } from "@/lib/admin/product-editor/intake-reducer";
export {
  applyIntakeTransition,
  createInitialIntakeRecords,
  formatIntakeStage,
  getAdjacentIntakeStages,
  updateIntakeAfterEditorAction,
} from "@/lib/admin/product-editor/intake-reducer";
export type { ProductEditorStateResult } from "@/lib/admin/product-editor/product-editor-save-action";
export { applyProductEditorAction } from "@/lib/admin/product-editor/product-editor-save-action";
```
Also open `src/lib/admin/product-editor/product-editor-save-action.ts` and update its import of `intake-actions.ts`:
```ts
import {
  createInitialIntakeRecords,
  updateIntakeAfterEditorAction,
} from "@/lib/admin/product-editor/intake-reducer";
```

- [ ] **Step 3: Write the rewrite mapping for external consumers and run it**

Create `/tmp/rewrite-product-editor.json`:
```json
[
  { "from": "@/lib/admin/product-editor-conversion", "to": "@/lib/admin/product-editor/product-editor-conversion" },
  { "from": "@/lib/admin/product-editor-defaults", "to": "@/lib/admin/product-editor/product-editor-defaults" },
  { "from": "@/lib/admin/product-editor-save-action", "to": "@/lib/admin/product-editor/product-editor-save-action" },
  { "from": "@/lib/admin/product-editor-schema", "to": "@/lib/admin/product-editor/product-editor-schema" },
  { "from": "@/lib/admin/product-editor-state-utils", "to": "@/lib/admin/product-editor/product-editor-state-utils" },
  { "from": "@/lib/admin/product-editor-stock-guard", "to": "@/lib/admin/product-editor/product-editor-stock-guard" },
  { "from": "@/lib/admin/product-editor-types", "to": "@/lib/admin/product-editor/product-editor-types" },
  { "from": "@/lib/admin/product-editor-actions", "to": "@/lib/admin/product-editor/product-editor-reducer" }
]
```
(No entry needed for `intake-actions` — its only two consumers are the two files fixed by hand in Step 2, and no other file in the repo imports it directly per the research pass.)

Run:
```bash
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-product-editor.json
```
This updates `admin-store.ts`'s import of `applyIntakeTransition`/`applyProductEditorAction`/`createInitialIntakeRecords` and `src/features/admin/inventory/inventory-intake-queue.tsx`'s import of `formatIntakeStage`/`getAdjacentIntakeStages` to the new `product-editor-reducer` path automatically.

- [ ] **Step 4: Verify**

```bash
pnpm typecheck
```
Expected: 0 errors — fix any remaining unresolved import by hand, re-run until clean.

```bash
pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(admin): split product-editor domain into lib/admin/product-editor/

Renames product-editor-actions.ts -> product-editor-reducer.ts and
intake-actions.ts -> intake-reducer.ts (pure state reducers, not
Server Actions), colocating intake-reducer.ts with its two actual
consumers rather than following filename glob alone."
```

---

### Task 2.3: Split the Orders domain

**Files:**
- Move + rename: `src/lib/admin/order-actions.ts` → `src/lib/admin/orders/order-reducer.ts`
- Move + rename: `src/lib/admin/offline-sale-actions.ts` → `src/lib/admin/orders/offline-sale-reducer.ts`
- Move (name unchanged): `sales-selectors.ts`, `sales-stock.ts`, `sales-types.ts`, `sales-actions.test.ts` → `src/lib/admin/orders/`

**Interfaces:**
- Produces: `applyOrderTransition` now at `@/lib/admin/orders/order-reducer`; `applyOfflineSale` now at `@/lib/admin/orders/offline-sale-reducer`.

- [ ] **Step 1: Create the folder and move files**

```bash
mkdir -p src/lib/admin/orders
git mv src/lib/admin/sales-selectors.ts src/lib/admin/orders/sales-selectors.ts
git mv src/lib/admin/sales-stock.ts src/lib/admin/orders/sales-stock.ts
git mv src/lib/admin/sales-types.ts src/lib/admin/orders/sales-types.ts
git mv src/lib/admin/sales-actions.test.ts src/lib/admin/orders/sales-actions.test.ts
git mv src/lib/admin/order-actions.ts src/lib/admin/orders/order-reducer.ts
git mv src/lib/admin/offline-sale-actions.ts src/lib/admin/orders/offline-sale-reducer.ts
```

- [ ] **Step 2: Write the rewrite mapping and run it**

Create `/tmp/rewrite-orders.json`:
```json
[
  { "from": "@/lib/admin/sales-selectors", "to": "@/lib/admin/orders/sales-selectors" },
  { "from": "@/lib/admin/sales-stock", "to": "@/lib/admin/orders/sales-stock" },
  { "from": "@/lib/admin/sales-types", "to": "@/lib/admin/orders/sales-types" },
  { "from": "@/lib/admin/order-actions", "to": "@/lib/admin/orders/order-reducer" },
  { "from": "@/lib/admin/offline-sale-actions", "to": "@/lib/admin/orders/offline-sale-reducer" }
]
```

Run:
```bash
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-orders.json
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass. `sales-actions.test.ts` (which imports from `hold-actions`/`return-actions`, not yet moved — see Tasks 2.4/2.5) will still resolve those via their *old* paths at this point in the sequence; that's expected until Tasks 2.4/2.5 land.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(admin): split orders domain into lib/admin/orders/

Renames order-actions.ts -> order-reducer.ts and offline-sale-actions.ts
-> offline-sale-reducer.ts; moves the cross-cutting sales-*.ts files
(selectors/stock/types) alongside them per the spec's 'shared with
holds/returns as needed' grouping."
```

---

### Task 2.4: Split the Holds domain

**Files:**
- Move + rename: `src/lib/admin/hold-actions.ts` → `src/lib/admin/holds/hold-reducer.ts`

- [ ] **Step 1: Create the folder and move**

```bash
mkdir -p src/lib/admin/holds
git mv src/lib/admin/hold-actions.ts src/lib/admin/holds/hold-reducer.ts
```

- [ ] **Step 2: Write the rewrite mapping and run it**

Create `/tmp/rewrite-holds.json`:
```json
[
  { "from": "@/lib/admin/hold-actions", "to": "@/lib/admin/holds/hold-reducer" }
]
```

Run:
```bash
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-holds.json
```
This updates both `admin-store.ts` and `src/lib/admin/orders/sales-actions.test.ts`'s import of `applyHoldConversion`/`applyHoldRelease` (and `applyHoldExtension` in `admin-store.ts`).

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(admin): split holds domain into lib/admin/holds/

Renames hold-actions.ts -> hold-reducer.ts (pure state reducer)."
```

---

### Task 2.5: Split the Returns domain

**Files:**
- Move + rename: `src/lib/admin/return-actions.ts` → `src/lib/admin/returns/return-reducer.ts`

- [ ] **Step 1: Create the folder and move**

```bash
mkdir -p src/lib/admin/returns
git mv src/lib/admin/return-actions.ts src/lib/admin/returns/return-reducer.ts
```

- [ ] **Step 2: Write the rewrite mapping and run it**

Create `/tmp/rewrite-returns.json`:
```json
[
  { "from": "@/lib/admin/return-actions", "to": "@/lib/admin/returns/return-reducer" }
]
```

Run:
```bash
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-returns.json
```
This updates `admin-store.ts`, `src/lib/admin/orders/sales-actions.test.ts`, and `src/features/admin/returns/return-selectors.test.ts`'s imports of `applyCreateReturn`/`applyReturnTransition`.

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(admin): split returns domain into lib/admin/returns/

Renames return-actions.ts -> return-reducer.ts (pure state reducer)."
```

---

### Task 2.6: Split the Customers domain

**Files:**
- Move + rename: `src/lib/admin/customer-actions.ts` → `src/lib/admin/customers/customer-reducer.ts`
- Move + rename: `src/lib/admin/customer-actions.test.ts` → `src/lib/admin/customers/customer-reducer.test.ts`
- Move (name unchanged): `customer-metrics.ts`, `customer-products.ts`, `customer-profile-seed.ts`, `customer-selectors.ts`, `customer-selectors.test.ts`, `customer-timeline.ts`, `customer-types.ts` → `src/lib/admin/customers/`

- [ ] **Step 1: Create the folder and move files**

```bash
mkdir -p src/lib/admin/customers
git mv src/lib/admin/customer-metrics.ts src/lib/admin/customers/customer-metrics.ts
git mv src/lib/admin/customer-products.ts src/lib/admin/customers/customer-products.ts
git mv src/lib/admin/customer-profile-seed.ts src/lib/admin/customers/customer-profile-seed.ts
git mv src/lib/admin/customer-selectors.ts src/lib/admin/customers/customer-selectors.ts
git mv src/lib/admin/customer-selectors.test.ts src/lib/admin/customers/customer-selectors.test.ts
git mv src/lib/admin/customer-timeline.ts src/lib/admin/customers/customer-timeline.ts
git mv src/lib/admin/customer-types.ts src/lib/admin/customers/customer-types.ts
git mv src/lib/admin/customer-actions.ts src/lib/admin/customers/customer-reducer.ts
git mv src/lib/admin/customer-actions.test.ts src/lib/admin/customers/customer-reducer.test.ts
```

- [ ] **Step 2: Write the rewrite mapping and run it**

Create `/tmp/rewrite-customers.json`:
```json
[
  { "from": "@/lib/admin/customer-metrics", "to": "@/lib/admin/customers/customer-metrics" },
  { "from": "@/lib/admin/customer-products", "to": "@/lib/admin/customers/customer-products" },
  { "from": "@/lib/admin/customer-profile-seed", "to": "@/lib/admin/customers/customer-profile-seed" },
  { "from": "@/lib/admin/customer-selectors", "to": "@/lib/admin/customers/customer-selectors" },
  { "from": "@/lib/admin/customer-timeline", "to": "@/lib/admin/customers/customer-timeline" },
  { "from": "@/lib/admin/customer-types", "to": "@/lib/admin/customers/customer-types" },
  { "from": "@/lib/admin/customer-actions", "to": "@/lib/admin/customers/customer-reducer" }
]
```

Run:
```bash
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-customers.json
```
This updates `admin-store.ts`'s import of `applyAddCustomerNote`, plus `src/lib/admin/orders/sales-actions.test.ts` and `src/lib/admin/customers/customer-selectors.test.ts`'s import of `applyOfflineSale` — wait, `applyOfflineSale` is exported from `offline-sale-reducer.ts` (already moved in Task 2.3), not from `customer-actions.ts`; no action needed there, it was already fixed.

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(admin): split customers domain into lib/admin/customers/

Renames customer-actions.ts -> customer-reducer.ts (pure state reducer)."
```

---

### Task 2.7: Split the Settings domain

**Files:**
- Move + rename: `src/lib/admin/settings-actions.ts` → `src/lib/admin/settings/settings-reducer.ts`
- Move + rename: `src/lib/admin/settings-actions.test.ts` → `src/lib/admin/settings/settings-reducer.test.ts`
- Move (name unchanged): `settings-defaults.ts`, `settings-schema.ts`, `settings-schema.test.ts`, `settings-section-schemas.ts`, `settings-types.ts` → `src/lib/admin/settings/`

- [ ] **Step 1: Create the folder and move files**

```bash
mkdir -p src/lib/admin/settings
git mv src/lib/admin/settings-defaults.ts src/lib/admin/settings/settings-defaults.ts
git mv src/lib/admin/settings-schema.ts src/lib/admin/settings/settings-schema.ts
git mv src/lib/admin/settings-schema.test.ts src/lib/admin/settings/settings-schema.test.ts
git mv src/lib/admin/settings-section-schemas.ts src/lib/admin/settings/settings-section-schemas.ts
git mv src/lib/admin/settings-types.ts src/lib/admin/settings/settings-types.ts
git mv src/lib/admin/settings-actions.ts src/lib/admin/settings/settings-reducer.ts
git mv src/lib/admin/settings-actions.test.ts src/lib/admin/settings/settings-reducer.test.ts
```

- [ ] **Step 2: Write the rewrite mapping and run it**

Create `/tmp/rewrite-settings.json`:
```json
[
  { "from": "@/lib/admin/settings-defaults", "to": "@/lib/admin/settings/settings-defaults" },
  { "from": "@/lib/admin/settings-schema", "to": "@/lib/admin/settings/settings-schema" },
  { "from": "@/lib/admin/settings-section-schemas", "to": "@/lib/admin/settings/settings-section-schemas" },
  { "from": "@/lib/admin/settings-types", "to": "@/lib/admin/settings/settings-types" },
  { "from": "@/lib/admin/settings-actions", "to": "@/lib/admin/settings/settings-reducer" }
]
```

Run:
```bash
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-settings.json
```
This updates `admin-store.ts`'s import of `applySaveStoreSettings`.

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(admin): split settings domain into lib/admin/settings/

Renames settings-actions.ts -> settings-reducer.ts (pure state reducer)."
```

---

### Task 2.8: Move the shared utilities

**Files:**
- Move (name unchanged): `result.ts`, `formatters.ts`, `types.ts`, `selectors.ts`, `seed.ts`, `admin-seed.ts` → `src/lib/admin/shared/`

This is the highest-fan-out move (every domain file imports `types.ts` and/or `result.ts`), but the mechanism is identical. `seed.ts` stays a single flat file here — Workstream 6 (Task 6.2) restructures its *internals* into a `shared/seed/` folder later; because `@/lib/admin/shared/seed` resolves identically whether it's a file or a folder's `index.ts`, no importer needs to change again when that happens.

- [ ] **Step 1: Create the folder and move files**

```bash
mkdir -p src/lib/admin/shared
git mv src/lib/admin/result.ts src/lib/admin/shared/result.ts
git mv src/lib/admin/formatters.ts src/lib/admin/shared/formatters.ts
git mv src/lib/admin/types.ts src/lib/admin/shared/types.ts
git mv src/lib/admin/selectors.ts src/lib/admin/shared/selectors.ts
git mv src/lib/admin/seed.ts src/lib/admin/shared/seed.ts
git mv src/lib/admin/admin-seed.ts src/lib/admin/shared/admin-seed.ts
```

- [ ] **Step 2: Write the rewrite mapping and run it**

Create `/tmp/rewrite-shared.json`:
```json
[
  { "from": "@/lib/admin/result", "to": "@/lib/admin/shared/result" },
  { "from": "@/lib/admin/formatters", "to": "@/lib/admin/shared/formatters" },
  { "from": "@/lib/admin/types", "to": "@/lib/admin/shared/types" },
  { "from": "@/lib/admin/selectors", "to": "@/lib/admin/shared/selectors" },
  { "from": "@/lib/admin/seed", "to": "@/lib/admin/shared/seed" },
  { "from": "@/lib/admin/admin-seed", "to": "@/lib/admin/shared/admin-seed" }
]
```

Run:
```bash
node scripts/tmp-rewrite-imports.mjs /tmp/rewrite-shared.json
```
This is the widest-reaching rewrite in Workstream 2/3 — expect it to touch most files under `src/lib/admin/`, `src/features/admin/`, and the admin route files (`src/app/admin/**`), since `admin-seed.ts` alone has ~14 downstream importers and `types.ts` is imported by nearly every reducer.

- [ ] **Step 3: Verify**

```bash
pnpm typecheck
```
Expected: 0 errors. This is the step most likely to surface a missed importer given the fan-out — fix any remaining unresolved import by hand and re-run until clean.

```bash
pnpm lint && pnpm test && pnpm build
```
Expected: all pass, including a full `pnpm build` this time (this task is the widest blast radius in Workstream 2/3, so build once here in addition to the end-of-workstream build).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(admin): move shared utilities into lib/admin/shared/

result.ts, formatters.ts, types.ts, selectors.ts, seed.ts, admin-seed.ts.
seed.ts stays a flat file for now; Workstream 6 restructures its
internals into shared/seed/ without a further import-path change,
since @/lib/admin/shared/seed resolves identically either way."
```

---

### Task 2.9: Confirm `data/` needed no changes, and audit the whole split

**Files:** none modified — this is a verification-only task.

- [ ] **Step 1: Confirm `data/` is untouched and still correct**

```bash
ls src/lib/admin/data/ src/lib/admin/data/in-memory/
```
Expected: `repositories.ts` and `in-memory/` (containing `admin-repositories.ts` + its test) — unchanged, as the spec intended (this subtree only depends on `@/lib/admin/shared/selectors`, already fixed by Task 2.8's rewrite).

- [ ] **Step 2: Confirm no top-level stray files remain in `lib/admin/`**

```bash
find src/lib/admin -maxdepth 1 -type f
```
Expected: **empty output** — every one of the original 60 files now lives under a domain subfolder or `shared/`, and `data/` is a subfolder not a file.

- [ ] **Step 3: Full verification**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm audit:buttons
```
Expected: all pass.

- [ ] **Step 4: Commit (if Step 1/2 required no fixes, this is a no-op — skip the commit)**

If Steps 1–2 required any fix, commit it:
```bash
git add -A
git commit -m "refactor(admin): fix remaining lib/admin/ import stragglers"
```

---

### Task 2.10: Delete the temporary rewrite tool

**Files:**
- Delete: `scripts/tmp-rewrite-imports.mjs`

- [ ] **Step 1: Delete it**

```bash
git rm scripts/tmp-rewrite-imports.mjs
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: all pass — this is the Workstream 2/3 closing build.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(scripts): remove the one-off import-rewrite tool

Its job (the lib/admin/ domain split) is done; it was migration
scaffolding, not a permanent script."
```

This closes Workstream 2 & 3.

---

## Workstream 4 — Hooks Convention

### Task 4.1: Extract `useAccountProducts` into its own hook file

**Files:**
- Create: `src/features/storefront/account/hooks/use-account-products.ts`
- Modify: `src/features/storefront/account/components/account-product-grid.tsx` (remove the hook, lines 17–20)
- Modify: `src/features/storefront/account/sections/saved-section.tsx` (import path)
- Modify: `src/features/storefront/account/sections/overview-section.tsx` (import path)

**Interfaces:**
- Produces: `useAccountProducts(): { saved: Product[]; recent: Product[] }` at `@/features/storefront/account/hooks/use-account-products`.
- Consumes: `useStorefront` from `@/features/storefront/shared/storefront-provider` (unchanged dependency, just moved to the new file).

This is the one hook genuinely buried inside an unrelated component file (confirmed: it's defined in `account-product-grid.tsx` but never called there — only two other files, `saved-section.tsx` and `overview-section.tsx`, import and call it). No other hook in the codebase needs this treatment — the other 10 context-consumer hooks stay colocated with their providers (see Task 4.2's note).

- [ ] **Step 1: Create the new hook file**

```ts
// src/features/storefront/account/hooks/use-account-products.ts
import { useStorefront } from "@/features/storefront/shared/storefront-provider";

/** Saved + recently-viewed product lists from the shared storefront state. */
export function useAccountProducts() {
  const s = useStorefront();
  return { saved: s.savedList, recent: s.recentList };
}
```

- [ ] **Step 2: Remove the hook from `account-product-grid.tsx`**

Delete lines 17–20 (the `useAccountProducts` function and its doc comment) from `src/features/storefront/account/components/account-product-grid.tsx`. Leave everything else in the file unchanged (the `AccountProductGrid` component itself doesn't call this hook, so nothing else in the file needs to change).

- [ ] **Step 3: Update the two external call sites**

In `src/features/storefront/account/sections/saved-section.tsx`, change:
```ts
import { AccountProductGrid, useAccountProducts } from "../components/account-product-grid";
```
to:
```ts
import { AccountProductGrid } from "../components/account-product-grid";
import { useAccountProducts } from "../hooks/use-account-products";
```

In `src/features/storefront/account/sections/overview-section.tsx`, make the identical change:
```ts
import { AccountProductGrid } from "../components/account-product-grid";
import { useAccountProducts } from "../hooks/use-account-products";
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(storefront): extract useAccountProducts into its own hook file

It was defined inside account-product-grid.tsx but never called there —
only saved-section.tsx and overview-section.tsx use it."
```

---

### Task 4.2: Document why the other 10 hooks stay colocated, and adopt `use()` where it's still `useContext()`

**Files:**
- Modify: `AGENTS.md` (add one documented rule)
- Modify: `src/features/storefront/shared/storefront-provider.tsx`, `src/features/admin/shell/admin-access-provider.tsx`, `src/components/shop/shop-provider.tsx`, `src/features/admin/state/admin-provider.tsx`, `src/features/admin/data/admin-repository-context.tsx`, `src/features/storefront/account/account-context.tsx` — swap `useContext(X)` for `use(X)`

**Interfaces:** No signature changes — `use(Context)` and `useContext(Context)` return the same value for a plain Context object; this is a mechanical swap with identical runtime behavior for these 6 files (none of them call `use()` on a Promise, only on a Context).

Confirmed by research: 10 hooks are colocated with a `createContext`/Provider in the same file (`useStorefront`, `useStorefrontExperience`, `useAdminAccess`, `useShop`, `useProductEditorController`, `useRecordSaleController`, `useAdmin`, `useAdminRepositories`, `useAccountUi`, `useTheme`). Of these, 3 (`useStorefrontExperience`, `useProductEditorController`, `useRecordSaleController`) already use React 19's `use()`. The other 6 still call `useContext()` directly and are the ones this task updates; `useTheme` has no direct Context call to migrate (it delegates to `next-themes`'s own hook).

- [ ] **Step 1: Swap `useContext` for `use` in the 6 remaining files**

In `src/features/storefront/shared/storefront-provider.tsx`, change:
```ts
const ctx = useContext(StorefrontContext);
```
to:
```ts
const ctx = use(StorefrontContext);
```
and update the React import at the top of the file to include `use` (remove `useContext` from the import if nothing else in the file still uses it — verify with a grep on the file before removing).

Repeat the identical `useContext(X)` → `use(X)` swap, plus the corresponding import-line fix, in:
- `src/features/admin/shell/admin-access-provider.tsx` (`useContext(AdminAccessContext)` → `use(AdminAccessContext)`)
- `src/components/shop/shop-provider.tsx` (`useContext(ShopContext)` → `use(ShopContext)`)
- `src/features/admin/state/admin-provider.tsx` (`useContext(AdminContext)` → `use(AdminContext)`)
- `src/features/admin/data/admin-repository-context.tsx` (`useContext(AdminRepositoryContext)` → `use(AdminRepositoryContext)`)
- `src/features/storefront/account/account-context.tsx` (`useContext(AccountUiContext)` → `use(AccountUiContext)`)

- [ ] **Step 2: Verify each file's import list before moving to the next**

For each of the 6 files, grep the file itself to confirm no other `useContext(...)` call remains that still needs the import:
```bash
grep -n "useContext" src/features/storefront/shared/storefront-provider.tsx src/features/admin/shell/admin-access-provider.tsx src/components/shop/shop-provider.tsx src/features/admin/state/admin-provider.tsx src/features/admin/data/admin-repository-context.tsx src/features/storefront/account/account-context.tsx
```
Expected: no output (every `useContext` call in these 6 files has been replaced).

- [ ] **Step 3: Add the documentation note to AGENTS.md**

Add this line under the existing §7 (shadcn/design-system rules) or a new short subsection — place it near other React/Next.js conventions in AGENTS.md §6:

```markdown
Context-consumer hooks (`useAdmin`, `useStorefront`, `useTheme`, and 7 others) stay colocated with
their Provider/Context in the same file — the provider is the only place that should know how its
state is managed, and splitting the hook into a separate file would only add an indirection, not
improve clarity. The single exception was `useAccountProducts`, which was genuinely misplaced
inside an unrelated component file; it now lives in `features/storefront/account/hooks/`. Do not
"fix" the remaining colocated hooks by force-splitting them.
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(react): adopt React 19 use() over useContext() in context-consumer hooks

Mechanical swap, no behavior change, in the 6 hooks that hadn't already
migrated (storefront-provider, admin-access-provider, shop-provider,
admin-provider, admin-repository-context, account-context).

Also documents in AGENTS.md why these hooks stay colocated with their
providers rather than being split into separate files."
```

This closes Workstream 4.

---

## Workstream 5 — Integration Consolidation

### Task 5.1: Build one parameterized QueryClient factory

**Files:**
- Create: `src/lib/query/create-query-client.ts`
- Modify: `src/lib/query/query-client.ts` (re-implement `makeQueryClient`/`getQueryClient` on top of the new factory)
- Modify: `src/app/admin/admin-query-provider.tsx` (re-implement `createAdminQueryClient` on top of the new factory)

**Interfaces:**
- Produces: `createQueryClient(options: CreateQueryClientOptions): QueryClient` where:
  ```ts
  interface CreateQueryClientOptions {
    staleTime: number;
    retry?: number | false;
    refetchOnWindowFocus?: boolean;
    shouldDehydrateQuery?: (query: Query) => boolean;
  }
  ```
- Consumes (unchanged): `@tanstack/react-query`'s `QueryClient`, `defaultShouldDehydrateQuery`, `isServer`, `Query` type.

Confirmed by research: storefront's `makeQueryClient` sets `staleTime: 30_000` and a custom `shouldDehydrateQuery`, with no explicit `retry`/`refetchOnWindowFocus` (falling to TanStack's defaults: `retry: 3`, `refetchOnWindowFocus: true`). Admin's `createAdminQueryClient` sets `staleTime: 30_000, retry: false, refetchOnWindowFocus: false`, no `dehydrate` config. Both providers keep their own `QueryClientProvider` instance (different domains, different invalidation boundaries) — only the *options-building* logic is shared. Storefront additionally needs the `isServer` per-request-vs-singleton branch; admin does not (it never runs server-side, always a single `useState`-held browser client) — the factory itself only builds the `QueryClient` instance; the server/browser lifecycle decision stays in each call site.

- [ ] **Step 1: Write the shared factory**

```ts
// src/lib/query/create-query-client.ts
import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";

export interface CreateQueryClientOptions {
  /** Milliseconds before a query is considered stale. Required — no silent default. */
  staleTime: number;
  /** Defaults to TanStack's own default (3) if omitted. */
  retry?: number | false;
  /** Defaults to TanStack's own default (true) if omitted. */
  refetchOnWindowFocus?: boolean;
  /** Overrides the dehydrate predicate; omit to use TanStack's own default. */
  shouldDehydrateQuery?: (query: Query) => boolean;
}

export function createQueryClient(options: CreateQueryClientOptions): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: options.staleTime,
        ...(options.retry !== undefined ? { retry: options.retry } : {}),
        ...(options.refetchOnWindowFocus !== undefined
          ? { refetchOnWindowFocus: options.refetchOnWindowFocus }
          : {}),
      },
      ...(options.shouldDehydrateQuery
        ? { dehydrate: { shouldDehydrateQuery: options.shouldDehydrateQuery } }
        : {}),
    },
  });
}

export { defaultShouldDehydrateQuery };
```

- [ ] **Step 2: Re-implement the storefront client on top of it**

Replace the body of `src/lib/query/query-client.ts` with:
```ts
import { defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/create-query-client";
import type { QueryClient } from "@tanstack/react-query";

// Per-request QueryClient on the server, stable singleton in the browser — the
// official TanStack Query App Router hydration pattern. Never reuse a server
// client across requests. See docs/storefront-v2/04 §8.
export function makeQueryClient(): QueryClient {
  return createQueryClient({
    staleTime: 30_000,
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) || query.state.status === "pending",
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
```
`src/lib/query/query-provider.tsx` is unchanged — it already just calls `getQueryClient()`.

- [ ] **Step 3: Re-implement the admin client on top of it**

In `src/app/admin/admin-query-provider.tsx`, replace `createAdminQueryClient`'s body:
```ts
"use client";

import { type ReactNode, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/create-query-client";

/**
 * Admin server-state boundary.
 *
 * One stable browser QueryClient is created per browser session with a lazy
 * `useState` initializer so React never recreates it across renders. This is a
 * client-only, browser-scoped client; a fresh per-request server QueryClient is
 * only introduced if SSR prefetch/hydration is added later.
 */
function createAdminQueryClient() {
  return createQueryClient({
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function AdminQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAdminQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass. There are still zero query consumers at this point (confirmed by research — no `useQuery`/`useMutation` call anywhere in `src/` yet), so this is purely an infrastructure change with no runtime-visible effect until Workstream 8.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(query): consolidate admin and storefront QueryClient construction

Both surfaces keep their own QueryClientProvider instance and mounting
strategy (admin: single useState-held browser client; storefront:
per-request server client + singleton browser client) — only the
options-building logic (staleTime/retry/refetchOnWindowFocus/dehydrate)
is now shared through lib/query/create-query-client.ts."
```

This closes Workstream 5.

---

## Workstream 6 — Large File Split

### Task 6.1: Split `app/checkout/page.tsx` (1118 lines) into `features/storefront/checkout/`

**Files:**
- Create: `src/features/storefront/checkout/checkout-flow.tsx` (the `CheckoutPage` body, renamed `CheckoutFlow`)
- Create: `src/features/storefront/checkout/checkout-helpers.ts` (`validate`, `moneyLabel`, `formatSeconds`, `buildCheckoutSnapshot`, plus the local types `Currency`/`CheckoutStep`/`ZoneId`/`PaymentId`/`PayState`/`FormErrors`/`CheckoutSnapshot`/`CheckoutItem`, plus the `zones`/`paymentMethods`/`initialForm` consts)
- Create: `src/features/storefront/checkout/components/order-summary.tsx`, `confirmation-screen.tsx`, `step-indicator.tsx`, `field-input.tsx`, `choice-row.tsx`, `radio-dot.tsx`, `check-box.tsx`, `review-row.tsx`, `summary-rows.tsx`, `trust-badge.tsx`, `processing-dialog.tsx`, `declined-dialog.tsx`, `confirm-metric.tsx`, `currency-button.tsx`
- Modify: `src/app/checkout/page.tsx` (thin route wrapper — matches every other route in the app)

**Interfaces:**
- Produces: `CheckoutFlow` (default export of `checkout-flow.tsx`, no props — same as the original `CheckoutPage`); each of the 14 sub-components exported by name from its own file under `components/`, with exactly the prop types recorded below (unchanged from today — pure extraction, no behavior change); `checkout-helpers.ts` exports `validate`, `moneyLabel`, `formatSeconds`, `buildCheckoutSnapshot`, and the 8 local types plus the 3 module-level consts.
- Consumes: `useStorefront` from `@/features/storefront/shared/storefront-provider` (unchanged).

All 14 sub-components are confirmed pure/presentational (no internal `useState`/`useEffect`/`useMemo`) — every one of them can move to its own file taking only props, with zero risk of fragmenting cohesive state. This is a pure code-move with **no new logic and no existing automated test to preserve** (no test file currently covers `checkout/page.tsx`) — the verification for this task is typecheck + build + a manual browser smoke pass through all 4 checkout steps, not a fabricated unit test for code whose behavior isn't changing.

- [ ] **Step 1: Create the folder structure**

```bash
mkdir -p src/features/storefront/checkout/components
```

- [ ] **Step 2: Extract `checkout-helpers.ts`**

Read the current `src/app/checkout/page.tsx` lines 29–92 (the 8 type declarations + `zones`/`paymentMethods`/`initialForm` consts) and lines 1038–1118 (`validate`, `moneyLabel`, `formatSeconds`, `buildCheckoutSnapshot`). Create `src/features/storefront/checkout/checkout-helpers.ts` containing exactly that content, adjusted to be a standalone module:
- Move the 8 type declarations (`Currency`, `CheckoutStep`, `ZoneId`, `PaymentId`, `PayState`, `FormErrors`, `CheckoutSnapshot`, `CheckoutItem`) to the top of the new file, all exported (`export type ...`).
- Move `zones`, `paymentMethods`, `initialForm` consts next, all exported (`export const ...`).
- Move `validate`, `moneyLabel`, `formatSeconds`, `buildCheckoutSnapshot` next, all exported (`export function ...`).
- While moving, deduplicate: `buildCheckoutSnapshot`'s internal `money` closure (original lines 1084–1087) duplicates `moneyLabel`'s logic verbatim — replace the inline closure with a direct call to `moneyLabel` instead of keeping two implementations of the same formatting logic.
- This file needs no imports beyond what its own logic requires (no React, no components) — `zones`/`paymentMethods` are plain data, `validate`/`moneyLabel`/`formatSeconds`/`buildCheckoutSnapshot` are pure functions.

- [ ] **Step 3: Extract each of the 14 sub-components into its own file**

For each row below, create the named file under `src/features/storefront/checkout/components/`, containing exactly that function's current body (from the recorded line range in the original `app/checkout/page.tsx`) as a named export, plus only the imports that specific component actually needs (per the icon/import breakdown already recorded against each component):

| File | Component | Original lines | Props (exact, unchanged) |
|---|---|---|---|
| `order-summary.tsx` | `OrderSummary` | 477–573 | `{ currency: Currency; secondsLeft: number; setCurrency: (currency: Currency) => void; vals: CheckoutSnapshot }` |
| `confirmation-screen.tsx` | `ConfirmationScreen` | 575–698 | `{ form: typeof initialForm; vals: CheckoutSnapshot }` |
| `step-indicator.tsx` | `StepIndicator` | 700–757 | `{ current: CheckoutStep; goStep: (step: CheckoutStep) => void }` |
| `field-input.tsx` | `FieldInput` | 759–798 | `{ ariaLabel: string; error?: string; onChange: (value: string) => void; placeholder: string; type?: string; value: string; withRightPadding?: boolean }` |
| `choice-row.tsx` | `ChoiceRow` | 800–827 | `{ active: boolean; onClick: () => void; right: string; subtitle: string; title: string }` |
| `radio-dot.tsx` | `RadioDot` | 829–840 | `{ active: boolean }` |
| `check-box.tsx` | `CheckBox` | 842–853 | `{ checked: boolean }` |
| `review-row.tsx` | `ReviewRow` | 855–871 | `{ label: string; onEdit: () => void; value: string }` |
| `summary-rows.tsx` | `SummaryRows` | 873–913 | `{ compact?: boolean; shipping: string; subtotal: string; total: string; totalLabel: string; vat: string; zoneName: string }` |
| `trust-badge.tsx` | `TrustBadge` | 915–922 | `{ icon: ReactNode; label: string }` |
| `processing-dialog.tsx` | `ProcessingDialog` | 924–958 | `{ gatewayName: string; markPlaced: () => void; simulateDecline: () => void }` |
| `declined-dialog.tsx` | `DeclinedDialog` | 960–996 | `{ dismiss: () => void; payNow: () => void; timer: string }` |
| `confirm-metric.tsx` | `ConfirmMetric` | 998–1020 | `{ label: string; paid?: boolean; value: string }` |
| `currency-button.tsx` | `CurrencyButton` | 1022–1036 | `{ active: boolean; children: ReactNode; onClick: () => void }` |

Types used only by a single component (`Currency`, `CheckoutStep`, `CheckoutSnapshot`, `typeof initialForm`, `ReactNode`) import from `@/features/storefront/checkout/checkout-helpers` (or `react` for `ReactNode`) as needed — each file's exact import list follows directly from its prop types above plus whatever `lucide-react` icons and shadcn/ui primitives (`Badge`, `Button`, etc.) that specific component's JSX body uses (per the icon-usage breakdown already recorded: `Check` → `CheckBox`/`ConfirmationScreen`... wait `StepIndicator` too; `MapPin`/`Truck`/`ShieldCheck` → `ConfirmationScreen`/`OrderSummary`'s `TrustBadge`; `XCircle` → `DeclinedDialog`).

- [ ] **Step 4: Create `checkout-flow.tsx`**

Move the `CheckoutPage` function body (original lines 94–475) into `src/features/storefront/checkout/checkout-flow.tsx`, renamed to `CheckoutFlow`, exported as this file's default export. Update its JSX to reference the now-imported sub-components (`import { OrderSummary } from "./components/order-summary";` etc. — 14 such imports) and the helpers (`import { buildCheckoutSnapshot, initialForm, paymentMethods, validate, zones } from "./checkout-helpers";` etc.). All internal state/hooks (`useState`×11, one `useEffect`, one `useMemo`, the 6 local handler closures `setField`/`next`/`back`/`goStep`/`payNow`/`markPlaced`) move unchanged — they belong to this component, not to any extracted sub-component (confirmed none of the 14 sub-components have internal state that would need to stay colocated).

- [ ] **Step 5: Make `app/checkout/page.tsx` a thin route wrapper**

Replace the entire contents of `src/app/checkout/page.tsx` with:
```tsx
import { CheckoutFlow } from "@/features/storefront/checkout/checkout-flow";

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
```

- [ ] **Step 6: Verify — typecheck, lint, build**

```bash
pnpm typecheck && pnpm lint && pnpm build
```
Expected: all pass, including the checkout route appearing correctly in the build output.

- [ ] **Step 7: Manual browser smoke pass (no automated test exists for this page)**

Start the dev server and walk through all 4 checkout steps (contact email → shipping zone → payment method → review) plus both the processing-dialog and declined-dialog paths, at minimum at the 375×812 and 1280×800 viewports per AGENTS.md's responsive review requirement. Confirm the confirmation screen renders correctly after a successful payment. This is a manual/browser check, not a scripted test — record what you observed (pass/fail per viewport) in the task's completion note.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(storefront): split checkout/page.tsx into features/storefront/checkout/

1118 lines -> a thin route page + checkout-flow.tsx + 14 presentational
components + checkout-helpers.ts. Also deduplicates moneyLabel's logic,
which buildCheckoutSnapshot previously reimplemented inline. No
behavior change."
```

---

### Task 6.2: Split `lib/admin/shared/seed.ts` (1021 lines) into `shared/seed/`

**Files:**
- Create: `src/lib/admin/shared/seed/helpers.ts`, `active-store-data.ts`, `active.ts`, `new-store.ts`, `index.ts`
- Delete: `src/lib/admin/shared/seed.ts` (the flat file created by Task 2.8)

**Interfaces:**
- Produces: `activeControlRoomSeed` and `newStoreControlRoomSeed` — same two names, same shape, re-exported unchanged from `shared/seed/index.ts`. Because `@/lib/admin/shared/seed` resolves identically to a file or to `seed/index.ts`, **every one of the 11 existing importers (plus the 14 that go through the `admin-seed.ts` barrel) needs zero import-path changes** — confirmed by research.

- [ ] **Step 1: Create the folder**

```bash
mkdir -p src/lib/admin/shared/seed
```

- [ ] **Step 2: Extract `helpers.ts`**

Read `src/lib/admin/shared/seed.ts` lines 15–71 (the `driveImage`, `stock`, `productMedia` helpers, currently module-private). Create `src/lib/admin/shared/seed/helpers.ts` containing these three, now exported (`export function driveImage(...)`, `export function stock(...)`, `export function productMedia(...)`), plus whichever of the type imports from `@/lib/admin/shared/types` (e.g. `InventoryCounts`, `ProductMedia`) these three functions actually reference in their signatures.

- [ ] **Step 3: Extract `active-store-data.ts`**

Read `src/lib/admin/shared/seed.ts` lines 73–969 (the 8 private data consts: `products`, `customers`, `orders`, `holds`, `activities`, `stockMovements`, `reviews`, `salesPulse`). Create `src/lib/admin/shared/seed/active-store-data.ts` containing all 8, now exported, importing `driveImage`/`stock`/`productMedia` from `./helpers` and whatever types from `@/lib/admin/shared/types` the original file imported (`ControlRoomActivity`, `ControlRoomCustomer`, `ControlRoomHold`, `ControlRoomOrder`, `InventoryProduct`, `ProductReview`, `SalesPulsePoint`, `StockMovement`).

- [ ] **Step 4: Extract `active.ts`**

Read `src/lib/admin/shared/seed.ts` lines 971–995 (`export const activeControlRoomSeed`). Create `src/lib/admin/shared/seed/active.ts` re-exporting the same const, now importing `products`, `customers`, `orders`, `holds`, `activities`, `stockMovements`, `reviews`, `salesPulse` from `./active-store-data` and `ControlRoomState` from `@/lib/admin/shared/types`.

- [ ] **Step 5: Extract `new-store.ts`**

Read `src/lib/admin/shared/seed.ts` lines 997–1021 (`export const newStoreControlRoomSeed`). Create `src/lib/admin/shared/seed/new-store.ts` — this one is fully self-contained (every field is a static literal or `[]`), needing only the `ControlRoomState` type import from `@/lib/admin/shared/types`. No import from `active-store-data.ts` or `helpers.ts` is needed here.

- [ ] **Step 6: Create the barrel**

```ts
// src/lib/admin/shared/seed/index.ts
export { activeControlRoomSeed } from "@/lib/admin/shared/seed/active";
export { newStoreControlRoomSeed } from "@/lib/admin/shared/seed/new-store";
```

- [ ] **Step 7: Delete the old flat file**

```bash
git rm src/lib/admin/shared/seed.ts
```

- [ ] **Step 8: Verify no importer needed any change**

```bash
grep -rn '@/lib/admin/shared/seed"' src/ --include='*.ts' --include='*.tsx' | wc -l
```
Expected: same count as before this task (11 direct + however many resolve through `admin-seed.ts`'s own single import) — confirming the import specifier itself never needed to change.

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass — in particular, every one of the 11 test files that imports `activeControlRoomSeed` from `@/lib/admin/shared/seed` should resolve without modification.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(admin): split seed.ts into shared/seed/

helpers.ts (driveImage/stock/productMedia), active-store-data.ts (the 8
private seed arrays), active.ts and new-store.ts (the two exported seed
states), re-exported from seed/index.ts. Every existing importer of
@/lib/admin/shared/seed resolves unchanged since the specifier now
targets seed/index.ts instead of seed.ts."
```

This closes Workstream 6. Run `pnpm build` once more before starting Workstream 7.

---

## Workstream 7 — Caching Adoption

### Task 7.1: Enable Cache Components and cache the published-catalogue reads

**Files:**
- Modify: `next.config.ts` (add `cacheComponents: true`)
- Modify: `src/server/commerce/catalogue/catalog-repository.ts` (add `'use cache'` + `cacheTag` + `cacheLife` to `listPublishedProducts`, `countPublishedProducts`, `getPublishedProductBySlug`, `getStorefrontFacets`)

**Interfaces:** No signature changes to any of the four functions — same params, same return types. Confirmed current Next.js (16.2.10) API: `cacheComponents: true` is a **top-level** `next.config.ts` key (not nested under `experimental` — that nested location still exists for back-compat but the top-level key is what `config-shared.js`'s own defaults use). `cacheTag`/`cacheLife` import from `"next/cache"` (not `unstable_`-prefixed — those aliases still exist but the stable names are current).

Confirmed by research: these four functions are the only ones whose Prisma query is gated by `publishedProductWhere()` — a real, current freshness/invalidation boundary (published-product reads against a live Prisma database). `getStorefrontCategoryBySlug` and `getStorefrontCollectionBySlug` have no visibility filter at all and are explicitly **not** touched by this task (per the spec, caching applies only to the published-product boundary, not every read in the file).

- [ ] **Step 1: Enable Cache Components**

In `next.config.ts`, add `cacheComponents: true` as a new top-level sibling key next to `redirects` and `images`:
```ts
import type { NextConfig } from "next";
import { getConfiguredAssetRemotePatterns } from "./src/lib/assets/remote-patterns";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    // ...unchanged...
  },
  images: {
    // ...unchanged...
  },
};

export default nextConfig;
```

- [ ] **Step 2: Add caching to `listPublishedProducts`**

In `src/server/commerce/catalogue/catalog-repository.ts`, add the directive and cache calls as the first statements inside the function body:
```ts
export async function listPublishedProducts(query: CatalogueQuery = {}): Promise<ProductSummary[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  // ...existing body unchanged...
}
```
Add the import at the top of the file:
```ts
import { cacheLife, cacheTag } from "next/cache";
```

- [ ] **Step 3: Add caching to `countPublishedProducts` and `getStorefrontFacets`**

Same pattern — first three lines of each function body:
```ts
export async function countPublishedProducts(filters: CatalogueFilters = {}): Promise<number> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  // ...existing body unchanged...
}
```
```ts
export async function getStorefrontFacets(): Promise<StorefrontFacetOptions> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  // ...existing body unchanged...
}
```

- [ ] **Step 4: Add caching to `getPublishedProductBySlug` with the per-slug tag**

```ts
export async function getPublishedProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(`product-${slug}`);
  cacheLife("minutes");
  // ...existing body unchanged...
}
```

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

```bash
pnpm build
```
Expected: build succeeds and product/category pages that call these four functions still statically/dynamically render correctly (watch the build output for any Cache Components–related warning about these specific functions).

- [ ] **Step 6: Manual smoke check**

Start the dev server, load `/products` and a product detail page twice in a row, and confirm the second load reflects cached data (no visible regression in content). This is the one place in the app where caching now applies — everything else (admin in-memory reads, the static `catalog-data.ts` snapshot) remains uncached per the next task's documented rule.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(caching): enable Cache Components for the Prisma published-catalogue reads

'use cache' + cacheTag('catalogue') / cacheTag(product-\${slug}) +
cacheLife('minutes') on listPublishedProducts, countPublishedProducts,
getPublishedProductBySlug, and getStorefrontFacets — the one place in
the app with a real, current freshness/invalidation need. No other
read path (admin in-memory prototype state, the static catalog-data.ts
snapshot) is cached."
```

---

### Task 7.2: Document the caching decision in AGENTS.md

**Files:**
- Modify: `AGENTS.md` §6

- [ ] **Step 1: Add the dated amendment**

Find the existing line in AGENTS.md §6 that reads:
```
- Do not enable Cache Components or add `use cache` for static prototype seed data.
```
Keep it verbatim, and add immediately after it (dated to today, the day this workstream actually lands — not authored speculatively ahead of the change):
```markdown
- Cache Components are enabled repo-wide as of 2026-07-16. `use cache`/`cacheTag`/`cacheLife` are
  approved for the Prisma-backed storefront catalogue repository (`server/commerce/catalogue/*`),
  where a real published/unpublished freshness boundary exists. Do not extend `use cache` to admin
  in-memory prototype reads or static JSON snapshot reads. No admin write path is Prisma-backed yet,
  so there is no live mutation calling `revalidateTag`/`updateTag` today — the tag names
  ('catalogue', `product-${slug}`) are documented so a future Prisma-backed admin write can call
  `revalidateTag` without re-deriving the convention.
```

- [ ] **Step 2: Verify**

No code changes — just confirm the file still parses as valid markdown (visually review the diff).

- [ ] **Step 3: Commit**

This should land in the **same commit** as Task 7.1 per the spec's risk register ("the AGENTS.md caching amendment must land in the same commit as enabling `cacheComponents`, so the doc is never momentarily stale relative to the code"). If Task 7.1 was already committed separately, amend this plan's execution order so both changes are staged together before the Task 7.1 commit runs. If executing strictly task-by-task, fold this task's edit into Task 7.1's commit instead of creating a separate one:
```bash
git add AGENTS.md
git commit -m "docs(agents): record the Cache Components caching decision

Documents that Cache Components are enabled and scoped to the
Prisma-backed catalogue repository only, landing alongside Task 7.1 so
the doc is never stale relative to the code."
```

This closes Workstream 7. Run `pnpm build` once more before starting Workstream 8.

---

## Workstream 8 — Admin TanStack Query Migration

**Current architecture** (unchanged by this workstream, just wrapped): `AdminStore` (`src/features/admin/state/admin-store.ts`) holds all admin state in one `AdminState` object behind 17 synchronous mutation methods, exposed via `useSyncExternalStore` in `useAdmin()`. `AdminRepositories` (`src/lib/admin/data/repositories.ts` + its in-memory implementation) already wraps `store.getSnapshot()` per-domain as `Promise`-returning reads — this is the seam this workstream migrates onto. `AdminQueryProvider` is already mounted (outermost, wrapping `AdminProvider`) with `staleTime: 30_000, retry: false, refetchOnWindowFocus: false` — zero consumers today.

**Pattern applied to every domain**: a query-key factory, `queryOptions` wrapping the existing repository read, `useQuery`/`useSuspenseQuery` replacing the component's `state.X` read, a `useMutation` wrapping the existing store method (resolving `Result` without throwing on business-rule failure), and `queryClient.setQueryData` with the fresh repository value on success — never `invalidateQueries`, never optimistic updates. `useAdmin()` itself is **not removed** — its mutation *functions* remain the actual implementation the new `useMutation` wrappers call; only `state.X` reads inside migrated components are replaced by `useQuery`. Non-domain fields read alongside a migrated one (e.g. `state.asOf`, a static label) stay read through `useAdmin()` unchanged — no need to wrap a field that's never mutated in its own query.

**Domain order** (dependency-driven, per spec): Settings → Customers → Holds → Returns → Orders → Inventory (last, since it has the largest fan-out — Overview, Orders via stock, and Product Editor/Intake).

### Task 8.0: Shared query-key namespace for cross-domain invalidation

**Files:**
- Create: `src/lib/admin/shared/overview-query-keys.ts`

**Interfaces:**
- Produces: `overviewKeys.all`, `overviewKeys.overview()` — the invalidation target other domains' mutations touch when their write affects Overview's sales-pulse/open-orders snapshot (per spec item 5: `saveProduct` touches `inventoryKeys.products()`, `inventoryKeys.product(id)`, **and** `overviewKeys.overview()`).

- [ ] **Step 1: Read `getOverviewSnapshot`'s actual dependencies before assuming scope**

Open `src/lib/admin/shared/selectors.ts` and read `getOverviewSnapshot`'s implementation in full. Confirm precisely which `AdminState` fields it derives from (expected: `orders`, `products`, possibly `customers`/`holds` for a dashboard rollup) — this determines exactly which domain mutations in Tasks 8.4–8.6 need to also invalidate `overviewKeys.overview()`. Do not assume the list in this plan's per-domain tasks is exhaustive if the actual selector reads more/fewer fields than expected — adjust the affected-keys list in each domain task to match what you actually read here.

- [ ] **Step 2: Create the key factory**

```ts
// src/lib/admin/shared/overview-query-keys.ts
export const overviewKeys = {
  all: ["admin", "overview"] as const,
  overview: () => [...overviewKeys.all, "snapshot"] as const,
};
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass (this file has no consumers yet — they're added per-domain starting with Task 8.3).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(admin): add the shared Overview query-key namespace

Used by Holds/Returns/Orders/Inventory mutations to invalidate the
Overview dashboard's cache alongside their own domain key, since its
sales-pulse/open-orders snapshot derives from the same underlying state."
```

---

### Task 8.1: Migrate the Settings domain

**Files:**
- Create: `src/lib/admin/settings/settings-query-keys.ts`
- Create: `src/lib/admin/settings/settings-query-options.ts`
- Create: `src/lib/admin/settings/settings-mutations.ts`
- Modify: `src/features/admin/settings/settings-workspace.tsx`

**Interfaces:**
- Produces: `settingsKeys.all`, `settingsKeys.detail()`; `settingsQueryOptions(repositories: AdminRepositories)`; `useSaveStoreSettings(): UseMutationResult<...>`.
- Consumes: `AdminRepositories.settings.getSettings(): Promise<StoreSettings | null>`; `AdminStore.saveStoreSettings(input: SaveStoreSettingsInput): Result<StoreSettingsActionSuccess, StoreSettingsActionError>` (via `useAdmin()`).

Settings is the narrowest-surface domain: exactly one repository read, one store mutation, one consumer file (`settings-workspace.tsx`, destructuring `{ state, saveStoreSettings }`, reading `state.settings` with a `createDefaultStoreSettings(state.asOf)` fallback, calling `saveStoreSettings(values)`).

- [ ] **Step 1: Query keys**

```ts
// src/lib/admin/settings/settings-query-keys.ts
export const settingsKeys = {
  all: ["admin", "settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};
```

- [ ] **Step 2: Query options**

```ts
// src/lib/admin/settings/settings-query-options.ts
import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { settingsKeys } from "@/lib/admin/settings/settings-query-keys";

export function settingsQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: settingsKeys.detail(),
    queryFn: () => repositories.settings.getSettings(),
  });
}
```

- [ ] **Step 3: Mutation hook**

```ts
// src/lib/admin/settings/settings-mutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { settingsKeys } from "@/lib/admin/settings/settings-query-keys";
import type { SaveStoreSettingsInput } from "@/lib/admin/settings/settings-types";

export function useSaveStoreSettings() {
  const { saveStoreSettings } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveStoreSettingsInput) => Promise.resolve(saveStoreSettings(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(settingsKeys.detail(), result.value.settings);
      }
    },
  });
}
```
Note: `saveStoreSettings` already returns a plain `Result` synchronously (no `Promise` in its own signature) — `Promise.resolve(...)` wraps it so a business-rule failure (`result.ok === false`) resolves the mutation successfully instead of throwing; only a genuinely unexpected thrown error reaches TanStack's `onError` channel. This preserves the exact existing validation path.

- [ ] **Step 4: Migrate the consumer**

In `src/features/admin/settings/settings-workspace.tsx`, replace:
```ts
const { state, saveStoreSettings } = useAdmin();
// ... state.settings, saveStoreSettings(values) ...
```
with:
```ts
const { state } = useAdmin(); // still needed for state.asOf
const repositories = useAdminRepositories();
const { data: settings } = useQuery(settingsQueryOptions(repositories));
const saveSettingsMutation = useSaveStoreSettings();
// ... settings ?? createDefaultStoreSettings(state.asOf) ...
```
Replace the existing `save()` handler's call to `saveStoreSettings(values)` with `saveSettingsMutation.mutate(values, { onSuccess: (result) => { /* existing success-branch UI logic using result.value.message/settings */ }, onError: ... })` or, if the component currently `await`s the call inline, use `await saveSettingsMutation.mutateAsync(values)` and keep the existing `if (result.ok) { ... } else { ... }` branching exactly as it is today — only the call site (`saveSettingsMutation.mutate(Async)` instead of the raw `saveStoreSettings`) changes, not the branching logic itself. Add the two new imports (`useQuery` from `@tanstack/react-query`, `useAdminRepositories` from `@/features/admin/data/admin-repository-context`, `settingsQueryOptions` from `@/lib/admin/settings/settings-query-options`, `useSaveStoreSettings` from `@/lib/admin/settings/settings-mutations`).

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 6: Manual browser smoke pass**

Sign in to admin, open Settings, change a value, save, confirm the change persists (re-render shows the new value) and any existing validation-error UI still triggers correctly for an invalid input. Record pass/fail.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(admin): migrate Settings domain onto TanStack Query

useQuery(settingsQueryOptions) replaces the direct state.settings read;
useSaveStoreSettings() wraps the existing synchronous store mutation
with authoritative queryClient.setQueryData on success. No optimistic
update, no invalidateQueries — the mutation result is already
authoritative. AdminStore's validation logic is unchanged."
```

---

### Task 8.2: Migrate the Customers domain

**Files:**
- Create: `src/lib/admin/customers/customers-query-keys.ts`
- Create: `src/lib/admin/customers/customers-query-options.ts`
- Create: `src/lib/admin/customers/customers-mutations.ts`
- Modify: `src/features/admin/customers/customers-workspace.tsx`, `src/features/admin/record-sale/record-sale-customer-step.tsx`, `src/features/admin/record-sale/record-sale-review-step.tsx`

**Interfaces:**
- Produces: `customersKeys.all`, `customersKeys.list()`; `customersListQueryOptions(repositories)`; `useAddCustomerNote()`.
- Consumes: `AdminRepositories.customers.listCustomers(): Promise<ControlRoomCustomer[]>`; `AdminStore.addCustomerNote(input: AddCustomerNoteInput): Result<CustomerNoteActionSuccess, CustomerActionError>`.

Three consumer files touch this domain: `customers-workspace.tsx` (read + mutation), `record-sale-customer-step.tsx` and `record-sale-review-step.tsx` (read-only, no mutation).

- [ ] **Step 1: Query keys**

```ts
// src/lib/admin/customers/customers-query-keys.ts
export const customersKeys = {
  all: ["admin", "customers"] as const,
  list: () => [...customersKeys.all, "list"] as const,
};
```

- [ ] **Step 2: Query options**

```ts
// src/lib/admin/customers/customers-query-options.ts
import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { customersKeys } from "@/lib/admin/customers/customers-query-keys";

export function customersListQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: customersKeys.list(),
    queryFn: () => repositories.customers.listCustomers(),
  });
}
```

- [ ] **Step 3: Mutation hook**

```ts
// src/lib/admin/customers/customers-mutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { customersKeys } from "@/lib/admin/customers/customers-query-keys";
import type { AddCustomerNoteInput } from "@/lib/admin/customers/customer-types";

export function useAddCustomerNote() {
  const { addCustomerNote } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddCustomerNoteInput) => Promise.resolve(addCustomerNote(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(customersKeys.list(), result.value.customers);
      }
    },
  });
}
```
Note: confirm the exact shape of `CustomerNoteActionSuccess` when implementing this step (read `src/lib/admin/customers/customer-reducer.ts`) — if it returns the single updated customer rather than the full list, use `queryClient.setQueryData(customersKeys.list(), (previous) => previous?.map((customer) => customer.id === result.value.customer.id ? result.value.customer : customer))` instead of replacing wholesale. Match whatever the reducer's actual success payload shape is rather than assuming.

- [ ] **Step 4: Migrate the three consumers**

In `src/features/admin/customers/customers-workspace.tsx`, replace `const { state, addCustomerNote } = useAdmin();` and its `state.customers` read with:
```ts
const repositories = useAdminRepositories();
const { data: customers } = useQuery(customersListQueryOptions(repositories));
const addNoteMutation = useAddCustomerNote();
```
and its call site `addCustomerNote({ customerId, body })` with `addNoteMutation.mutate({ customerId, body })` (or `mutateAsync` if the existing code awaits the result), preserving the existing success/error branching logic exactly.

In `src/features/admin/record-sale/record-sale-customer-step.tsx` and `record-sale-review-step.tsx` (read-only consumers), replace `const { state } = useAdmin();` and their `state.customers` read with:
```ts
const repositories = useAdminRepositories();
const { data: customers } = useQuery(customersListQueryOptions(repositories));
```
(these two files only read `state.customers`, no mutation — confirm no other `state.X` field is read in either file before removing the `useAdmin()` call entirely; if either file also reads something else from `state`, keep `const { state } = useAdmin();` for that field only, same pattern as Task 8.1 Step 4).

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 6: Manual browser smoke pass**

Sign in to admin, open Customers, add a note to a customer, confirm it appears; open Record Sale and confirm the customer step and review step still list customers correctly.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(admin): migrate Customers domain onto TanStack Query

useQuery(customersListQueryOptions) replaces state.customers reads in
customers-workspace, record-sale-customer-step, and
record-sale-review-step; useAddCustomerNote() wraps the existing
mutation with authoritative cache replacement on success."
```

---

### Task 8.3: Migrate the Holds domain

**Files:**
- Create: `src/lib/admin/holds/holds-query-keys.ts`
- Create: `src/lib/admin/holds/holds-query-options.ts`
- Create: `src/lib/admin/holds/holds-mutations.ts`
- Modify: `src/features/admin/holds/holds-workspace.tsx`

**Interfaces:**
- Produces: `holdsKeys.all`, `holdsKeys.list()`; `holdsListQueryOptions(repositories)`; `useExtendHold()`, `useReleaseHold()`, `useConvertHold()`.
- Consumes: `AdminRepositories.holds.listHolds(): Promise<ControlRoomHold[]>`; `AdminStore.extendHold`, `releaseHold`, `convertHold`.

This is the first domain whose mutations plausibly affect the Overview snapshot (a hold converting to a sale changes order/product-stock counts) — per Task 8.0 Step 1's instruction, confirm against the actual `getOverviewSnapshot` implementation whether `convertHold` specifically needs to also invalidate `overviewKeys.overview()` (extend/release likely don't touch Overview-visible counts; convert plausibly does, since it creates an order).

- [ ] **Step 1: Query keys**

```ts
// src/lib/admin/holds/holds-query-keys.ts
export const holdsKeys = {
  all: ["admin", "holds"] as const,
  list: () => [...holdsKeys.all, "list"] as const,
};
```

- [ ] **Step 2: Query options**

```ts
// src/lib/admin/holds/holds-query-options.ts
import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { holdsKeys } from "@/lib/admin/holds/holds-query-keys";

export function holdsListQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: holdsKeys.list(),
    queryFn: () => repositories.holds.listHolds(),
  });
}
```

- [ ] **Step 3: Mutation hooks**

```ts
// src/lib/admin/holds/holds-mutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { holdsKeys } from "@/lib/admin/holds/holds-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type { ConvertHoldInput } from "@/lib/admin/shared/types";

export function useExtendHold() {
  const { extendHold } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holdId, minutes }: { holdId: string; minutes: number }) =>
      Promise.resolve(extendHold(holdId, minutes)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(holdsKeys.list(), result.value.holds);
      }
    },
  });
}

export function useReleaseHold() {
  const { releaseHold } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (holdId: string) => Promise.resolve(releaseHold(holdId)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(holdsKeys.list(), result.value.holds);
      }
    },
  });
}

export function useConvertHold() {
  const { convertHold } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConvertHoldInput) => Promise.resolve(convertHold(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(holdsKeys.list(), result.value.holds);
        // Converting a hold creates an order, which affects Overview's
        // open-orders/sales-pulse snapshot — confirm this against the
        // actual getOverviewSnapshot read in Task 8.0 Step 1 before
        // keeping or removing this line.
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}
```
Note: `useConvertHold` uses `invalidateQueries` rather than `setQueryData` for the Overview key specifically, since this hook doesn't have Overview's fresh value on hand the way it has holds' fresh value — this is the one exception the spec allows ("prefer authoritative cache replacement, then targeted invalidation"): replace what you have the authoritative value for (`holds`), invalidate what you don't (`overview`). Match every field name (`result.value.holds`, `ConvertHoldInput`) against the actual `hold-reducer.ts` types when implementing — adjust if the real success payload shape differs from this assumption.

- [ ] **Step 4: Migrate the consumer**

In `src/features/admin/holds/holds-workspace.tsx`, replace `const { state, extendHold, releaseHold, convertHold } = useAdmin();` and its `state.holds` read with:
```ts
const repositories = useAdminRepositories();
const { data: holds } = useQuery(holdsListQueryOptions(repositories));
const extendHoldMutation = useExtendHold();
const releaseHoldMutation = useReleaseHold();
const convertHoldMutation = useConvertHold();
```
Replace each call site (`extendHold(holdId, minutes)` → `extendHoldMutation.mutate({ holdId, minutes })`, `releaseHold(holdId)` → `releaseHoldMutation.mutate(holdId)`, `convertHold(input)` → `convertHoldMutation.mutate(input)`), preserving existing success/error UI branching.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 6: Manual browser smoke pass**

Sign in to admin, open Holds, extend a hold, release a hold, convert a hold to a sale — confirm each updates the list correctly and (for convert) that Overview reflects the new order if you navigate there.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(admin): migrate Holds domain onto TanStack Query

useQuery(holdsListQueryOptions) replaces state.holds; useExtendHold/
useReleaseHold/useConvertHold wrap the existing mutations. convertHold
additionally invalidates the Overview key since converting a hold
creates an order."
```

---

### Task 8.4: Migrate the Returns domain

**Files:**
- Create: `src/lib/admin/returns/returns-query-keys.ts`
- Create: `src/lib/admin/returns/returns-query-options.ts`
- Create: `src/lib/admin/returns/returns-mutations.ts`
- Modify: `src/features/admin/returns/returns-workspace.tsx`

**Interfaces:**
- Produces: `returnsKeys.all`, `returnsKeys.list()`; `returnsListQueryOptions(repositories)`; `useCreateReturn()`, `useTransitionReturn()`.
- Consumes: `AdminRepositories.returns.listReturns(): Promise<ControlRoomReturn[]>`; `AdminStore.createReturn`, `transitionReturn`.

Research notes this consumer also reads `state.orders.length` as a cache-busting key inside `returns-workspace.tsx` — confirm during implementation whether this was working around `useSyncExternalStore` re-render timing (in which case it can likely be dropped once the component reads from `useQuery`, which already re-renders correctly on cache updates) or whether it's load-bearing application logic (e.g. gating "create return" on whether any orders exist) — only remove it if it's confirmed to be the former.

- [ ] **Step 1: Query keys**

```ts
// src/lib/admin/returns/returns-query-keys.ts
export const returnsKeys = {
  all: ["admin", "returns"] as const,
  list: () => [...returnsKeys.all, "list"] as const,
};
```

- [ ] **Step 2: Query options**

```ts
// src/lib/admin/returns/returns-query-options.ts
import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { returnsKeys } from "@/lib/admin/returns/returns-query-keys";

export function returnsListQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: returnsKeys.list(),
    queryFn: () => repositories.returns.listReturns(),
  });
}
```

- [ ] **Step 3: Mutation hooks**

```ts
// src/lib/admin/returns/returns-mutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { returnsKeys } from "@/lib/admin/returns/returns-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type { CreateReturnInput } from "@/lib/admin/shared/types";
import type { ReturnStatus } from "@/lib/admin/shared/types";

export function useCreateReturn() {
  const { createReturn } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReturnInput) => Promise.resolve(createReturn(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(returnsKeys.list(), result.value.returns);
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useTransitionReturn() {
  const { transitionReturn } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ returnId, nextStatus }: { returnId: string; nextStatus: ReturnStatus }) =>
      Promise.resolve(transitionReturn(returnId, nextStatus)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(returnsKeys.list(), result.value.returns);
      }
    },
  });
}
```
Confirm the exact field/type names (`ReturnStatus`, `CreateReturnInput`, the success payload's `returns` field) against `src/lib/admin/returns/return-reducer.ts` and `src/lib/admin/shared/types.ts` when implementing — adjust names to match reality if they differ from this draft.

- [ ] **Step 4: Migrate the consumer**

In `src/features/admin/returns/returns-workspace.tsx`, replace `const { state, createReturn, transitionReturn } = useAdmin();` and its `state.returns` (and, per the note above, its `state.orders.length` cache-busting key if confirmed superfluous) with:
```ts
const repositories = useAdminRepositories();
const { data: returns } = useQuery(returnsListQueryOptions(repositories));
const createReturnMutation = useCreateReturn();
const transitionReturnMutation = useTransitionReturn();
```
Replace call sites (`createReturn(input)` → `createReturnMutation.mutate(input)`, `transitionReturn(returnId, status)` → `transitionReturnMutation.mutate({ returnId, nextStatus: status })`), preserving existing success/error branching.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 6: Manual browser smoke pass**

Sign in to admin, open Returns, create a return, transition its status — confirm the list updates correctly.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(admin): migrate Returns domain onto TanStack Query

useQuery(returnsListQueryOptions) replaces state.returns;
useCreateReturn/useTransitionReturn wrap the existing mutations.
createReturn additionally invalidates the Overview key."
```

---

### Task 8.5: Migrate the Orders domain

**Files:**
- Create: `src/lib/admin/orders/orders-query-keys.ts`
- Create: `src/lib/admin/orders/orders-query-options.ts`
- Create: `src/lib/admin/orders/orders-mutations.ts`
- Modify: `src/features/admin/orders/orders-workspace.tsx`

**Interfaces:**
- Produces: `ordersKeys.all`, `ordersKeys.list()`; `ordersListQueryOptions(repositories)`; `useTransitionOrder()`.
- Consumes: `AdminRepositories.orders.listOrders(): Promise<ControlRoomOrder[]>`; `AdminStore.transitionOrder`.

Orders is where Overview invalidation is unambiguous — Overview's `openOrders` field is explicitly derived from `state.orders`, per `src/lib/admin/data/in-memory/admin-repositories.ts`'s own `overview.getOverview` implementation.

- [ ] **Step 1: Query keys**

```ts
// src/lib/admin/orders/orders-query-keys.ts
export const ordersKeys = {
  all: ["admin", "orders"] as const,
  list: () => [...ordersKeys.all, "list"] as const,
};
```

- [ ] **Step 2: Query options**

```ts
// src/lib/admin/orders/orders-query-options.ts
import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { ordersKeys } from "@/lib/admin/orders/orders-query-keys";

export function ordersListQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: ordersKeys.list(),
    queryFn: () => repositories.orders.listOrders(),
  });
}
```

- [ ] **Step 3: Mutation hook**

```ts
// src/lib/admin/orders/orders-mutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { ordersKeys } from "@/lib/admin/orders/orders-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type { OrderStatus } from "@/lib/admin/shared/types";

export function useTransitionOrder() {
  const { transitionOrder } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, nextStatus }: { orderId: string; nextStatus: OrderStatus }) =>
      Promise.resolve(transitionOrder(orderId, nextStatus)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(ordersKeys.list(), result.value.orders);
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}
```
Confirm the exact success payload field name (`result.value.orders`) against `src/lib/admin/orders/order-reducer.ts` when implementing.

- [ ] **Step 4: Migrate the consumer**

In `src/features/admin/orders/orders-workspace.tsx`, replace `const { state, transitionOrder } = useAdmin();` and its `state.orders` read with:
```ts
const repositories = useAdminRepositories();
const { data: orders } = useQuery(ordersListQueryOptions(repositories));
const transitionOrderMutation = useTransitionOrder();
```
Replace the call site (`transitionOrder(orderId, status)` → `transitionOrderMutation.mutate({ orderId, nextStatus: status })`), preserving existing success/error branching.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass.

- [ ] **Step 6: Manual browser smoke pass**

Sign in to admin, open Orders, transition an order's status, confirm the list updates and Overview's open-orders count reflects the change.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(admin): migrate Orders domain onto TanStack Query

useQuery(ordersListQueryOptions) replaces state.orders;
useTransitionOrder wraps the existing mutation and invalidates the
Overview key, since openOrders derives directly from order state."
```

---

### Task 8.6: Migrate the Inventory domain (largest fan-out) and remove the deprecated `ControlRoom*` aliases

**Files:**
- Create: `src/lib/admin/inventory/inventory-query-keys.ts`
- Create: `src/lib/admin/inventory/inventory-query-options.ts`
- Create: `src/lib/admin/inventory/inventory-mutations.ts`
- Modify: `src/features/admin/inventory/inventory-workspace.tsx`, `catalogue-taxonomy-manager.tsx`, `inventory-intake-queue.tsx`, `inventory-product-lifecycle-actions.tsx`, `src/features/admin/product-editor/product-editor-dialog.tsx`, `variant-product-fields.tsx`, `product-identity-step.tsx`, `stocked-product-fields.tsx`, `src/features/admin/shell/admin-command-menu.tsx`, `src/features/admin/record-sale/record-sale-item-step.tsx`, `record-sale-dialog.tsx`
- Delete: the deprecated aliases in `src/features/admin/state/admin-provider.tsx` (`ControlRoomProvider`, `useControlRoom`), `src/lib/admin/data/repositories.ts` (`ControlRoomRepositories` type), `src/lib/admin/data/in-memory/admin-repositories.ts` (`createInMemoryControlRoomRepositories`), `src/features/admin/data/admin-repository-context.tsx` (`ControlRoomRepositoryProvider`, `useControlRoomRepositories`)

**Interfaces:**
- Produces: `inventoryKeys.all`, `.products()`, `.product(id)`, `.taxonomy()`; `inventoryProductsQueryOptions(repositories)`, `inventoryProductQueryOptions(repositories, productId)`, `inventoryTaxonomyQueryOptions(repositories)`; `useSaveProduct()`, `useArchiveProduct()`, `useRestoreProduct()`, `useDeleteProduct()`, `useTransitionIntake()`, `useCreateCatalogueTaxonomy()`, `useRenameCatalogueTaxonomy()`, `useDeleteCatalogueTaxonomy()`.
- Consumes: `AdminRepositories.inventory.listProducts/getProduct/listTaxonomy/listStockMovements`; `AdminStore.saveProduct`, `archiveProduct`, `restoreProduct`, `deleteProduct`, `createCatalogueTaxonomy`, `renameCatalogueTaxonomy`, `deleteCatalogueTaxonomy`, `transitionIntake`.

This is the largest of the six — 8 of the 19 total `useAdmin()` call sites are Inventory/Product-Editor consumers. It is sequenced last per the spec (Overview, Orders-via-stock, and Product Editor/Intake all touch it). Because it's confirmed the final domain to migrate, this task also removes the deprecated `ControlRoom*` aliases (`useControlRoom`, `useControlRoomRepositories`, `ControlRoomRepositoryProvider`, `ControlRoomRepositories`, `createInMemoryControlRoomRepositories`, `ControlRoomProvider`) — confirmed zero live importers anywhere outside their own definition files.

- [ ] **Step 1: Query keys**

```ts
// src/lib/admin/inventory/inventory-query-keys.ts
export const inventoryKeys = {
  all: ["admin", "inventory"] as const,
  products: () => [...inventoryKeys.all, "products"] as const,
  product: (productId: string) => [...inventoryKeys.all, "product", productId] as const,
  taxonomy: () => [...inventoryKeys.all, "taxonomy"] as const,
  stockMovements: (productId?: string) =>
    productId
      ? ([...inventoryKeys.all, "stock-movements", productId] as const)
      : ([...inventoryKeys.all, "stock-movements"] as const),
};
```

- [ ] **Step 2: Query options**

```ts
// src/lib/admin/inventory/inventory-query-options.ts
import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { inventoryKeys } from "@/lib/admin/inventory/inventory-query-keys";

export function inventoryProductsQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: inventoryKeys.products(),
    queryFn: () => repositories.inventory.listProducts(),
  });
}

export function inventoryProductQueryOptions(repositories: AdminRepositories, productId: string) {
  return queryOptions({
    queryKey: inventoryKeys.product(productId),
    queryFn: () => repositories.inventory.getProduct(productId),
  });
}

export function inventoryTaxonomyQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: inventoryKeys.taxonomy(),
    queryFn: () => repositories.inventory.listTaxonomy(),
  });
}
```

- [ ] **Step 3: Mutation hooks**

```ts
// src/lib/admin/inventory/inventory-mutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { inventoryKeys } from "@/lib/admin/inventory/inventory-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type {
  CatalogueTaxonomyInput,
  IntakeStage,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/admin/shared/types";

export function useSaveProduct() {
  const { saveProduct } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      values,
      intent,
    }: {
      values: ProductEditorValues;
      intent: ProductEditorIntent;
    }) => Promise.resolve(saveProduct(values, intent)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), result.value.products);
        queryClient.setQueryData(inventoryKeys.product(result.value.product.id), result.value.product);
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useArchiveProduct() {
  const { archiveProduct } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => Promise.resolve(archiveProduct(productId)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), result.value.products);
      }
    },
  });
}

export function useRestoreProduct() {
  const { restoreProduct } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => Promise.resolve(restoreProduct(productId)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), result.value.products);
      }
    },
  });
}

export function useDeleteProduct() {
  const { deleteProduct } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => Promise.resolve(deleteProduct(productId)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), result.value.products);
      }
    },
  });
}

export function useTransitionIntake() {
  const { transitionIntake } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, nextStage }: { productId: string; nextStage: IntakeStage }) =>
      Promise.resolve(transitionIntake(productId, nextStage)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), result.value.products);
      }
    },
  });
}

export function useCreateCatalogueTaxonomy() {
  const { createCatalogueTaxonomy } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CatalogueTaxonomyInput) => Promise.resolve(createCatalogueTaxonomy(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.taxonomy(), result.value.taxonomy);
      }
    },
  });
}

export function useRenameCatalogueTaxonomy() {
  const { renameCatalogueTaxonomy } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taxonomyId, name }: { taxonomyId: string; name: string }) =>
      Promise.resolve(renameCatalogueTaxonomy(taxonomyId, name)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.taxonomy(), result.value.taxonomy);
      }
    },
  });
}

export function useDeleteCatalogueTaxonomy() {
  const { deleteCatalogueTaxonomy } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taxonomyId: string) => Promise.resolve(deleteCatalogueTaxonomy(taxonomyId)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.taxonomy(), result.value.taxonomy);
      }
    },
  });
}
```
Confirm every success-payload field name (`result.value.products`, `result.value.product`, `result.value.taxonomy`) against the actual reducer files (`product-editor-save-action.ts`, `product-lifecycle-reducer.ts`, `catalogue-taxonomy.ts`, `intake-reducer.ts`) when implementing — this draft follows the pattern established in the other five domains, but Inventory's reducers weren't individually re-verified line-by-line in this plan's research pass the way Settings' was; treat these payload field names as the expected shape to confirm, not a certainty.

- [ ] **Step 4: Migrate the 11 consuming files**

Apply the same replacement pattern as every prior domain task to each of these, matching what each file actually reads (per the confirmed per-file breakdown):
- `inventory-workspace.tsx`: reads `state.products`, `state.catalogueTaxonomy`, `state.reportingDate` → migrate `products`/`catalogueTaxonomy` to `useQuery(inventoryProductsQueryOptions(...))`/`useQuery(inventoryTaxonomyQueryOptions(...))`; keep `state.reportingDate` via `useAdmin()` (static label, not mutated by any of this domain's actions).
- `catalogue-taxonomy-manager.tsx`: reads `state.catalogueTaxonomy`, `state.products` (usage counts), calls all three taxonomy mutations → migrate both reads to their respective `useQuery`, replace the three mutation calls with `useCreateCatalogueTaxonomy()`/`useRenameCatalogueTaxonomy()`/`useDeleteCatalogueTaxonomy()`.
- `inventory-intake-queue.tsx`: reads `state.intake`, calls `transitionIntake` → **note**: `state.intake` is a separate `AdminState` field with no dedicated repository method in the current `AdminRepositories` interface (only `listProducts`/`getProduct`/`listTaxonomy`/`listStockMovements` exist for Inventory). Keep `state.intake` read through `useAdmin()` unchanged (out of scope to add a new repository method for a field the spec didn't ask for); only migrate the `transitionIntake` mutation call to `useTransitionIntake()`.
- `inventory-product-lifecycle-actions.tsx`: no `state` read, only calls `archiveProduct`/`deleteProduct`/`restoreProduct` → replace with `useArchiveProduct()`/`useDeleteProduct()`/`useRestoreProduct()`, no query read needed in this file at all.
- `product-editor-dialog.tsx` (`ProductEditorDialog` sub-component): reads `state.products` (find product by id) → migrate to `useQuery(inventoryProductQueryOptions(repositories, productId))` if a single product is looked up, or `useQuery(inventoryProductsQueryOptions(...))` plus a local `.find(...)` if the existing code already does a list-then-find (match whichever pattern the current code actually uses — read the file before choosing).
- `product-editor-dialog.tsx` (`ProductEditorForm` sub-component): calls `saveProduct(values, intent)` → replace with `useSaveProduct().mutate({ values, intent })`.
- `variant-product-fields.tsx`: reads `state.products` (existing SKUs) → migrate to `useQuery(inventoryProductsQueryOptions(...))`.
- `product-identity-step.tsx`: reads `state.catalogueTaxonomy`, `state.products` → migrate both.
- `stocked-product-fields.tsx`: reads `state.products` → migrate.
- `admin-command-menu.tsx`: reads `state.products`, `state.orders`, `state.customers`, `state.holds`, `state.asOf` — this file spans all six domains for its command-palette search index. Migrate each field to its already-created domain query (`inventoryProductsQueryOptions`, `ordersListQueryOptions`, `customersListQueryOptions`, `holdsListQueryOptions`), keep `state.asOf` via `useAdmin()`.
- `record-sale-item-step.tsx`: `state` passed into `getSellableProducts(state)` — since this selector takes the whole `AdminState` object, either (a) migrate the call site to first `useQuery(inventoryProductsQueryOptions(...))` and adapt `getSellableProducts` to accept a narrower `{ products: InventoryProduct[] }` shape instead of full `AdminState`, or (b) leave `state` read via `useAdmin()` for this one call site if `getSellableProducts` genuinely needs other `AdminState` fields beyond `products` — read `src/lib/admin/orders/sales-selectors.ts`'s `getSellableProducts` implementation first to decide which applies; do not guess.
- `record-sale-dialog.tsx` (`RecordSaleDialog`): reads `state.products.length`, `state.orders.length` (remount key), passes to `createRecordSaleDefaults(state)` — same judgment call as above: check whether `createRecordSaleDefaults` needs the full snapshot or just counts, and migrate accordingly.
- `record-sale-dialog.tsx` (`RecordSaleForm`): reads `state` via `getSelectedSaleProduct`, calls `recordOfflineSale(input)` — `recordOfflineSale` is an Orders-domain mutation (from Task 8.5's scope, not Inventory's) but this consumer wasn't listed under Orders' single consumer (`orders-workspace.tsx`) in Task 8.5 — add a `useRecordOfflineSale()` hook to `src/lib/admin/orders/orders-mutations.ts` as part of *this* task (Inventory, since it's this file's last remaining unmigrated `useAdmin()` call site) rather than reopening Task 8.5's commit; note this cross-domain wrinkle explicitly in this task's commit message.

- [ ] **Step 5: Add the missed `recordOfflineSale` mutation hook**

```ts
// add to src/lib/admin/orders/orders-mutations.ts
import { inventoryKeys } from "@/lib/admin/inventory/inventory-query-keys";
import type { OfflineSaleInput } from "@/lib/admin/shared/types";

export function useRecordOfflineSale() {
  const { recordOfflineSale } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OfflineSaleInput) => Promise.resolve(recordOfflineSale(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(ordersKeys.list(), result.value.orders);
        queryClient.setQueryData(inventoryKeys.products(), result.value.products);
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}
```
Confirm whether `recordOfflineSale`'s success payload actually includes both `orders` and `products` (it plausibly does, since an offline sale both creates an order and decrements stock) by reading `src/lib/admin/orders/offline-sale-reducer.ts` before finalizing this hook's `onSuccess` body.

- [ ] **Step 6: Delete the deprecated `ControlRoom*` aliases**

Remove from `src/features/admin/state/admin-provider.tsx`:
```ts
/** @deprecated Use AdminProvider. */
export const ControlRoomProvider = AdminProvider;
/** @deprecated Use useAdmin. */
export const useControlRoom = useAdmin;
```
Remove from `src/lib/admin/data/repositories.ts`:
```ts
export type ControlRoomRepositories = AdminRepositories;
```
Remove from `src/lib/admin/data/in-memory/admin-repositories.ts`:
```ts
export const createInMemoryControlRoomRepositories = createInMemoryAdminRepositories;
```
Remove from `src/features/admin/data/admin-repository-context.tsx`:
```ts
/** @deprecated Use AdminRepositoryProvider. */
export const ControlRoomRepositoryProvider = AdminRepositoryProvider;
/** @deprecated Use useAdminRepositories. */
export const useControlRoomRepositories = useAdminRepositories;
```
Before deleting each, re-confirm zero live importers:
```bash
grep -rn "useControlRoom\b\|ControlRoomProvider\b\|useControlRoomRepositories\b\|ControlRoomRepositoryProvider\b\|createInMemoryControlRoomRepositories\b\|ControlRoomRepositories\b" src/
```
Expected: only the 4 definition files themselves (before deletion) — zero hits anywhere else. Do not delete if this grep surfaces an importer; investigate first.

- [ ] **Step 7: Verify**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all pass. This is the largest single verification in Workstream 8 — expect to iterate on Step 4/5's judgment calls (`getSellableProducts`, `createRecordSaleDefaults`) based on what `pnpm typecheck` and the actual selector code reveal.

- [ ] **Step 8: Manual browser smoke pass**

Sign in to admin, exercise: Inventory list + one product edit/save, archive/restore/delete a product, the intake queue's stage transitions, catalogue taxonomy create/rename/delete, Product Editor dialog open/save, Record Sale flow start-to-finish (item → customer → review → offline sale), and the command palette search across products/orders/customers/holds. Confirm Overview reflects a saved product's stock change.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(admin): migrate Inventory domain onto TanStack Query, remove deprecated ControlRoom* aliases

Largest domain — 8 of 19 useAdmin() consumer files, spanning
Inventory, Product Editor, Intake, and the command palette. Also adds
useRecordOfflineSale to orders-mutations.ts (record-sale-dialog.tsx's
RecordSaleForm is this domain's last unmigrated useAdmin() call site,
but recordOfflineSale is an Orders-domain mutation).

Removes useControlRoom, ControlRoomProvider, useControlRoomRepositories,
ControlRoomRepositoryProvider, ControlRoomRepositories, and
createInMemoryControlRoomRepositories — confirmed zero live importers
outside their own definition files; these were compatibility shims from
the earlier control-room-to-admin rename, now that every domain has
migrated off the pattern they existed to ease."
```

This closes Workstream 8, and the whole plan.

---

## Final Verification

- [ ] **Step 1: Full check suite**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm audit:buttons && pnpm build
```
Expected: all pass.

- [ ] **Step 2: React Doctor**

```bash
pnpm dlx react-doctor@latest . --verbose --diff
```
Per AGENTS.md §11 — resolve any changed-scope finding before considering this plan complete.

- [ ] **Step 3: Confirm `lib/admin/` has no stray top-level files**

```bash
find src/lib/admin -maxdepth 1 -type f
```
Expected: empty (everything lives in a domain subfolder, `shared/`, or `data/`).

- [ ] **Step 4: Confirm zero remaining `useAdmin().state` reads for the six migrated domains outside the documented exceptions**

```bash
grep -rn "state\.\(products\|orders\|holds\|returns\|customers\|settings\)\b" src/features/admin/ src/features/storefront/ 2>/dev/null
```
Expected: no hits, other than any explicitly-documented exception recorded during Task 8.6 Step 4 (e.g. if `state.intake` reads remain — that's a documented, deliberate exception, not a miss).

- [ ] **Step 5: Update `docs/control-room-v2/progress.md`**

Record that this restructuring + the admin TanStack Query migration (all six domains) has landed, referencing this plan file and the design spec, so the tracker stays truthful per AGENTS.md §3's "update the tracker... after every completed phase" rule.

- [ ] **Step 6: Final commit**

```bash
git add docs/control-room-v2/progress.md
git commit -m "docs(control-room): record the repo restructuring and admin TanStack Query migration as complete

All 8 workstreams from docs/superpowers/plans/2026-07-16-repo-restructuring-and-admin-query-migration.md
landed: lib/admin/ domain split, reducer renaming, hooks convention,
query-provider consolidation, checkout/seed file splits, Cache
Components on the Prisma catalogue repository, and all six admin
domains migrated onto TanStack Query."
```

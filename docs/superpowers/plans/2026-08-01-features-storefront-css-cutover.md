# Storefront CSS Ownership Cutover Implementation Plan

**Status:** Implemented and merged; retained as a historical execution record. `src/modules/storefront-shell/ui/storefront.css` is canonical and all current imports use that path. Do not execute the unchecked planning steps against the current tree.

**Goal:** Move the shared storefront stylesheet out of legacy `src/features/**` ownership and into `src/modules/storefront-shell/ui/**` without changing its bytes, cascade, consumers, or rendered behaviour.

**Architecture:** `src/modules/storefront-shell/ui/storefront.css` becomes the canonical owner of shared customer-facing storefront presentation. The root CSS entrypoint and three product-detail route boundaries keep their current composition and change only their import paths; the legacy file is deleted after the import graph is clean.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, Tailwind CSS 4, plain global CSS, TypeScript 5, pnpm 11.13.0.

## Global Constraints

- Follow `docs/superpowers/specs/2026-08-01-features-storefront-css-cutover-design.md` exactly.
- Use Node 25.x and `pnpm@11.13.0`; report any runtime mismatch instead of calling the gate passed.
- Preserve the stylesheet byte-for-byte, including comments, whitespace, line endings, and encoding.
- Preserve the `globals.css` then `storefront.css` cascade order.
- Do not change selectors, tokens, keyframes, breakpoints, themes, reduced-motion rules, JSX, copy, routes, providers, or dependencies.
- Do not edit or stage unrelated modified/untracked files already present on `agent/storefront-checkout-delivery-promotions-redesign`.
- Do not migrate or delete any other `src/features/**` file in this slice.

## Explicit Exclusions

- No storefront component, hook, store, provider, font, overlay, account, checkout, home, or admin migration.
- No selector cleanup, CSS-module conversion, stylesheet splitting, formatting, minification, accessibility remediation, responsive adjustment, performance optimization, or motion tuning.
- No changes to `src/app/globals.css`, Tailwind, PostCSS, shadcn configuration, dependencies, APIs, server code, Prisma, Supabase, authentication, or architecture guards.
- No removal or deduplication of the three product route-boundary imports.

## Rollback Contract

If the destination hash changes, an old-path consumer remains, a new gate failure touches this scope,
or browser evidence shows visual/interaction drift, do not patch the CSS. Restore the identical file
to `src/features/storefront/shared/storefront.css`, restore the four old import paths, and remove
`src/modules/storefront-shell/ui/storefront.css` only after all consumers point back to the legacy
path. Re-run the structural search, style smoke, and browser checks; a split old/new import graph is
not an acceptable rollback state.

---

### Task 1: Freeze the CSS ownership contract

**Files:**
- Read: `src/features/storefront/shared/storefront.css`
- Read: `src/app/theme-entry.css`
- Read: `src/app/(storefront)/products/[slug]/error.tsx`
- Read: `src/app/(storefront)/products/[slug]/loading.tsx`
- Read: `src/app/(storefront)/products/[slug]/not-found.tsx`

**Interfaces:**
- Consumes: the approved design spec and current working-tree stylesheet bytes.
- Produces: the source SHA-256, exact old-path consumer list, and a clean scope baseline used by Tasks 2 and 3.

- [ ] **Step 1: Record the source hash and size**

Run:

```powershell
$source = "src/features/storefront/shared/storefront.css"
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash
$size = (Get-Item -LiteralPath $source).Length
"hash=$hash size=$size"
```

Expected: `hash=84BB5007594FF3413B96B6F1ECDBE07D1F3B59DF106AB0A357298D5D23E9F279 size=40382`. If the values differ, stop and update the design baseline before moving the current bytes.

- [ ] **Step 2: Prove the exact production consumer set**

Run:

```powershell
rg -n "features/storefront/shared/storefront\.css" src
```

Expected: exactly four importing files: `src/app/theme-entry.css` and product `[slug]` `error.tsx`, `loading.tsx`, and `not-found.tsx`; documentation comments that merely say `storefront.css` are not old-path consumers.

- [ ] **Step 3: Capture the scoped pre-change status**

Run:

```powershell
git status --short -- src/features/storefront/shared/storefront.css src/modules/storefront-shell/ui/storefront.css src/app/theme-entry.css 'src/app/(storefront)/products/[slug]/error.tsx' 'src/app/(storefront)/products/[slug]/loading.tsx' 'src/app/(storefront)/products/[slug]/not-found.tsx'
```

Expected: no pre-existing changes in the six scoped paths. If any scoped path is already modified, stop and reconcile ownership with the user before editing.

### Task 2: Perform the byte-preserving ownership cutover

**Files:**
- Create: `src/modules/storefront-shell/ui/storefront.css`
- Delete: `src/features/storefront/shared/storefront.css`
- Modify: `src/app/theme-entry.css:7`
- Modify: `src/app/(storefront)/products/[slug]/error.tsx:3`
- Modify: `src/app/(storefront)/products/[slug]/loading.tsx:2`
- Modify: `src/app/(storefront)/products/[slug]/not-found.tsx:3`

**Interfaces:**
- Consumes: Task 1 source hash and exact four-consumer list.
- Produces: `src/modules/storefront-shell/ui/storefront.css` with identical bytes, four canonical imports, and no legacy stylesheet path.

- [ ] **Step 1: Move the stylesheet without transforming it**

Use a filesystem rename so the file bytes are preserved:

```powershell
Move-Item -LiteralPath "src/features/storefront/shared/storefront.css" -Destination "src/modules/storefront-shell/ui/storefront.css"
```

Expected: the destination exists and the legacy source path does not exist. Do not run a formatter against the CSS file.

- [ ] **Step 2: Update the root CSS import**

Change only this line in `src/app/theme-entry.css`:

```css
@import "../modules/storefront-shell/ui/storefront.css";
```

Keep it immediately after:

```css
@import "./globals.css";
```

- [ ] **Step 3: Update the three product route-boundary imports**

In each of the product `[slug]` `error.tsx`, `loading.tsx`, and `not-found.tsx` files, replace the old import with:

```ts
import "@/modules/storefront-shell/ui/storefront.css";
```

Do not change import order or any other line.

- [ ] **Step 4: Verify the structural contract**

Run:

```powershell
$destination = "src/modules/storefront-shell/ui/storefront.css"
"destination_hash=$((Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash)"
"legacy_exists=$(Test-Path -LiteralPath 'src/features/storefront/shared/storefront.css')"
rg -n "features/storefront/shared/storefront\.css" src
rg -n "modules/storefront-shell/ui/storefront\.css" src/app
```

Expected:

- destination hash is `84BB5007594FF3413B96B6F1ECDBE07D1F3B59DF106AB0A357298D5D23E9F279`;
- `legacy_exists=False`;
- the old-path search returns no matches;
- the new-path search returns the same four consumers recorded in Task 1.

- [ ] **Step 5: Inspect the focused diff**

Run:

```powershell
git diff --stat -- src/features/storefront/shared/storefront.css src/modules/storefront-shell/ui/storefront.css src/app/theme-entry.css 'src/app/(storefront)/products/[slug]/error.tsx' 'src/app/(storefront)/products/[slug]/loading.tsx' 'src/app/(storefront)/products/[slug]/not-found.tsx'
git diff -- src/app/theme-entry.css 'src/app/(storefront)/products/[slug]/error.tsx' 'src/app/(storefront)/products/[slug]/loading.tsx' 'src/app/(storefront)/products/[slug]/not-found.tsx'
```

Expected: Git recognizes the CSS as a pure rename or identical delete/add, and each consumer diff changes one path only.

- [ ] **Step 6: Run focused source checks**

Run:

```powershell
pnpm exec biome check src/app/theme-entry.css 'src/app/(storefront)/products/[slug]/error.tsx' 'src/app/(storefront)/products/[slug]/loading.tsx' 'src/app/(storefront)/products/[slug]/not-found.tsx' src/modules/storefront-shell/ui/storefront.css
pnpm typecheck
pnpm test:styles:e2e
```

Expected: the scoped Biome check and TypeScript pass; the style smoke passes. If a command fails, record the exact failure and determine whether it touches this scope before proceeding.

- [ ] **Step 7: Commit only the cutover files**

Run:

```powershell
git add -- src/features/storefront/shared/storefront.css src/modules/storefront-shell/ui/storefront.css src/app/theme-entry.css 'src/app/(storefront)/products/[slug]/error.tsx' 'src/app/(storefront)/products/[slug]/loading.tsx' 'src/app/(storefront)/products/[slug]/not-found.tsx'
git diff --cached --name-status
git commit -m "refactor: move storefront styles into shell module"
```

Expected: the staged set contains only the six scoped paths and the commit succeeds. Do not use `git add -A` or stage unrelated work.

### Task 3: Apply the reviewer gate

**Files:**
- Review: the Task 2 commit and all six scoped paths.
- Evidence only: repository command output and browser screenshots/logs; no source edits by the reviewer.

**Interfaces:**
- Consumes: the committed CSS ownership cutover from Task 2.
- Produces: a pass/block verdict with executed, failed, skipped, and blocked evidence reported separately.

- [ ] **Step 1: Verify scope and import deletion**

Run:

```powershell
git show --stat --summary HEAD
git show --find-renames --format=fuller HEAD -- src/features/storefront/shared/storefront.css src/modules/storefront-shell/ui/storefront.css src/app/theme-entry.css 'src/app/(storefront)/products/[slug]/error.tsx' 'src/app/(storefront)/products/[slug]/loading.tsx' 'src/app/(storefront)/products/[slug]/not-found.tsx'
rg -n "features/storefront/shared/storefront\.css" src scripts
```

Expected: a pure stylesheet rename, four path-only consumer changes, and no old-path source or check reference.

- [ ] **Step 2: Run repository gates**

Run each command separately and retain its exit code:

```powershell
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test:styles:e2e
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
```

Expected: all required gates pass. Any pre-existing failure must be demonstrated against the unchanged baseline and recorded; no new failure is waivable.

- [ ] **Step 3: Run browser validation**

Run:

```powershell
pnpm validate:browser
```

Review storefront home, catalogue, a valid PDP, and the PDP loading/not-found/error boundaries where the harness supports them at 375x812, 768x1024, and 1280x800 in light and dark themes. Inspect screenshots, console errors, failed stylesheet/network requests, overlay scroll locking, representative motion, and reduced-motion behaviour.

Expected: no visual, responsive, theme, interaction, console, network, or computed-style difference attributable to the move. Unavailable or unexercised evidence is reported as blocked/skipped rather than passed.

- [ ] **Step 4: Publish the reviewer verdict**

The completion report must state:

- what moved and why;
- the six scoped paths;
- destination/source hash equality;
- every command actually run and its result;
- browser viewports/themes/routes actually inspected;
- failures, warnings, skipped checks, and blockers;
- confirmation that unrelated dirty files were neither edited nor staged;
- confirmation that no other `src/features/**` deletion was included.

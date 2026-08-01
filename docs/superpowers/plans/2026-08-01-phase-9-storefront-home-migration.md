# Phase 9 Storefront Home Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the final production files under `src/features/storefront/**` by moving the active homepage composition into the canonical Storefront Shell UI module, reusing the canonical reveal hook, and cutting the home route to the new owner without changing rendered behaviour.

**Architecture:** The homepage is cross-domain customer-facing composition, so it belongs in `src/modules/storefront-shell/ui/home/**`: it composes Products UI/data contracts and Storefront Shell client state but owns neither product persistence nor a business-free primitive. Move the 15-file home tree with byte preservation wherever imports need no correction; replace the duplicate legacy reveal hook with `src/hooks/use-reveal.ts` and retain only a focused home-local `RevealDiv` adapter.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Vitest 4, Testing Library, Biome 2, Playwright 1.61, pnpm 11.13.0, PowerShell.

## Global Constraints

- Active branch at planning time: `agent/storefront-checkout-delivery-promotions-redesign`.
- Treat the dirty worktree as shared. Preserve all unrelated modified and untracked files; do not restore, format, stage, or commit them.
- This is a Phase 9 ownership migration, not a redesign. Preserve JSX, copy, DOM order, IDs, classes, image props, product selection, navigation patches, overlay events, newsletter state, themes, responsive behaviour, accessibility semantics, and animation thresholds. The execution record below documents the sole non-semantic formatter-only deviation.
- Use `src/modules/storefront-shell/ui/home/**` as the single homepage owner. Do not split homepage sections across Products merely because they render products.
- Reuse `src/hooks/use-reveal.ts`; do not copy the legacy `useReveal` implementation or adopt the behaviourally different `src/modules/products/ui/storefront/reveal.tsx`.
- Do not leave a compatibility re-export, forwarding file, barrel, alias, or duplicate under `src/features/**`.
- Use `pnpm`; do not install, upgrade, or regenerate dependencies.
- Do not edit `scripts/**`, config, lockfiles, Prisma, Supabase, deployment files, or migration guards.
- A scoped dirty path, destination collision, changed baseline hash, new consumer, failed required check, or unavailable browser evidence is a stop/report condition, not permission to overwrite or claim a pass.

---

## File and Ownership Map

| Layer | Exact scope | Change | Owner |
| --- | --- | --- | --- |
| `src/modules/storefront-shell/ui/home/**` | `storefront-home.tsx`, `home-types.ts`, four component files, eight section files, colocated category-card test | Move the existing homepage composition from legacy `features`; preserve bytes except the two reveal import cutovers. | UI engineer |
| `src/modules/storefront-shell/ui/home/components/reveal-div.tsx` | Home-only wrapper | Create the existing `RevealDiv` contract around canonical `useReveal`. | UI engineer |
| `src/hooks/use-reveal.ts` | Cross-domain browser hook | Reuse unchanged as the only `useReveal` implementation for homepage cards/headings. | Existing shared-hook owner; no edit |
| `src/app/(storefront)/(home)/page.tsx` | Thin Server Component route | Change only the `StorefrontHome` import path. Metadata and rendering stay unchanged. | UI engineer |
| `src/features/storefront/home/**`, `src/features/storefront/shared/reveal.tsx` | Legacy composition | Remove after all consumers resolve canonically. Final `src/features/storefront` must be absent. | UI engineer |
| Repository and browser gates | Focused Vitest, architecture/static/full checks, homepage Playwright/a11y/visual review | Verify structural and runtime parity. | Reviewer |

## Exact Move Map

Move these paths without changing content unless explicitly listed in Task 2:

```text
src/features/storefront/home/storefront-home.tsx
  -> src/modules/storefront-shell/ui/home/storefront-home.tsx
src/features/storefront/home/home-types.ts
  -> src/modules/storefront-shell/ui/home/home-types.ts
src/features/storefront/home/components/category-card.test.tsx
  -> src/modules/storefront-shell/ui/home/components/category-card.test.tsx
src/features/storefront/home/components/category-card.tsx
  -> src/modules/storefront-shell/ui/home/components/category-card.tsx
src/features/storefront/home/components/home-product-list.tsx
  -> src/modules/storefront-shell/ui/home/components/home-product-list.tsx
src/features/storefront/home/components/home-section-heading.tsx
  -> src/modules/storefront-shell/ui/home/components/home-section-heading.tsx
src/features/storefront/home/components/one-of-one-card.tsx
  -> src/modules/storefront-shell/ui/home/components/one-of-one-card.tsx
src/features/storefront/home/sections/category-section.tsx
  -> src/modules/storefront-shell/ui/home/sections/category-section.tsx
src/features/storefront/home/sections/hero-section.tsx
  -> src/modules/storefront-shell/ui/home/sections/hero-section.tsx
src/features/storefront/home/sections/new-arrivals-section.tsx
  -> src/modules/storefront-shell/ui/home/sections/new-arrivals-section.tsx
src/features/storefront/home/sections/newsletter-section.tsx
  -> src/modules/storefront-shell/ui/home/sections/newsletter-section.tsx
src/features/storefront/home/sections/one-of-one-section.tsx
  -> src/modules/storefront-shell/ui/home/sections/one-of-one-section.tsx
src/features/storefront/home/sections/product-rail-section.tsx
  -> src/modules/storefront-shell/ui/home/sections/product-rail-section.tsx
src/features/storefront/home/sections/recently-viewed-section.tsx
  -> src/modules/storefront-shell/ui/home/sections/recently-viewed-section.tsx
src/features/storefront/home/sections/trust-section.tsx
  -> src/modules/storefront-shell/ui/home/sections/trust-section.tsx
```

## Planning Evidence

- Repository-wide production search finds exactly one external home consumer: `src/app/(storefront)/(home)/page.tsx` imports `StorefrontHome`.
- Only `category-card.tsx` and `home-section-heading.tsx` import `src/features/storefront/shared/reveal.tsx`.
- `one-of-one-card.tsx` and Products `product-card.tsx` already consume `src/hooks/use-reveal.ts`.
- `src/modules/storefront-shell/ui/home/**` does not exist at planning time, so every listed destination is collision-free.
- Existing homepage browser coverage is in `tests/e2e/phase-1-6-visual-parity.spec.ts` and `tests/e2e/phase-1-6-accessibility.spec.ts` for route `/`.
- The current source hashes are recorded in Task 1; use them to detect concurrent edits before moving.

## Execution Record and Plan Deviation

- Before intentional edits, all 15 moved homepage files matched the Task 1 SHA-256 baseline. This proved that no concurrent source change was overwritten during the move.
- The full destination-tree Biome gate later found a pre-existing formatter error in `components/one-of-one-card.tsx`. Biome mechanically reflowed only the existing `sizes` prop from three lines to one; its expression, JSX position, and runtime behaviour are unchanged.
- That formatter-only normalization changes `components/one-of-one-card.tsx` from the planned hash `93C8F851CE4F7D8C37022D552A34BBF140AAE87F909ED19C620B47A5C04704DD` to `89E6247E32765B1F3BCEADE04D484FFA90F576C6FB88DCAAD342F430982A7C28`.
- This recorded deviation is explicitly authorized for repository-gate compliance. It does not authorize any other JSX cleanup, semantic edit, or formatter sweep.

### Task 1: Freeze the Exact Migration Baseline

**Owner:** Laitstyles reviewer

**Files:**
- Inspect: `src/features/storefront/home/**`
- Inspect: `src/features/storefront/shared/reveal.tsx`
- Inspect: `src/hooks/use-reveal.ts`
- Inspect: `src/modules/products/ui/storefront/reveal.tsx`
- Inspect: `src/app/(storefront)/(home)/page.tsx`
- Inspect destination: `src/modules/storefront-shell/ui/home/**`

**Interfaces:**
- Consumes: the shared working tree and exact move map above.
- Produces: go/no-go evidence, exact source hashes, and an uncontested destination; no source changes.

- [ ] **Step 1: Record branch and dirty scope**

```powershell
git branch --show-current
git status --short
git status --short -- 'src/features/storefront/home' 'src/features/storefront/shared/reveal.tsx' 'src/modules/storefront-shell/ui/home' 'src/app/(storefront)/(home)/page.tsx' 'src/hooks/use-reveal.ts'
```

Expected: branch matches the authorized current branch; scoped paths are clean. If a scoped path is dirty, stop and coordinate ownership. Do not restore unrelated changes.

- [ ] **Step 2: Re-prove the consumer graph and destination absence**

```powershell
rg -n '@/features/storefront/home|@/features/storefront/shared/reveal' src tests scripts
Test-Path -LiteralPath 'src/modules/storefront-shell/ui/home'
```

Expected: the route plus two reveal imports described in Planning Evidence, and `False` for the destination. Any additional consumer or existing destination requires replanning; do not add a shim or overwrite.

- [ ] **Step 3: Capture and compare the 16 source hashes**

```powershell
$sources = @(rg --files src/features/storefront/home src/features/storefront/shared | Sort-Object)
$sources | ForEach-Object { "$_|$((Get-Item -LiteralPath $_).Length)|$((Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash)" }
```

Expected: exactly 16 rows. Hashes must match:

```text
components/category-card.test.tsx  06916A2434CBF20010488B2E0B0727322CEDD4B43A04B5B21F1A6987618DE792
components/category-card.tsx       7F591F21A2B0F162DC4E553CC881A29C1D2C4B99B075429389C9521507C95371
components/home-product-list.tsx   78CE5FADA306A2E48578F8E55E246F39CEBB6974B9FB984A38A1FF838D65D962
components/home-section-heading.tsx 85A3DB56DD4004DC1317FD60A91ED622164B54A3F5F41388CA69DBC261078B93
components/one-of-one-card.tsx     93C8F851CE4F7D8C37022D552A34BBF140AAE87F909ED19C620B47A5C04704DD
home-types.ts                      0FD968BA7501B02345D9B4ED5361C549025FAA6FDAAC622EF573914060D7EF02
sections/category-section.tsx      826468E9F010E69DA9408556EC1DDEAF3677E4156BBE590C55B7F3F4D5CF23D7
sections/hero-section.tsx          4DF901B4C63E68C96EA6991621FCF98B9DF896FAAC71F1B383BE5681660C1A9A
sections/new-arrivals-section.tsx  BA49046028DF530A8ABDC352D923849639A3FB0AEEDE3F47879B0AA157FB85B0
sections/newsletter-section.tsx    D4D27327D85EF67D04E5A83DF0C177A395C1027EDF361F9950136431E249928F
sections/one-of-one-section.tsx    548AE6EA749D44D1AA2CB44D2CD2AFDDBB43AC46D9E08888AE9DB2E9991786DC
sections/product-rail-section.tsx  1278A0BDDE3323B470F601470B577E186F9423FAC27727F793B1C943BE79FF2E
sections/recently-viewed-section.tsx 7582813E3E0AFDDCAFD442167137ADBB6999F59F6533B59875B2F844AC07D8FE
sections/trust-section.tsx         DCE4C420F8A31121B91A9113D5CDD0AC06910A895EE9515C4FAB6F7CC86D04C2
storefront-home.tsx                EB0DAD8E2428F2DECAA4E6A49E4AFA22390B565D2BD574FC0A80659CF9DA3C27
shared/reveal.tsx                  FDA75E70D211BB3D265CD628470030BE17694C91AEF7ED8CC087434C03F10A78
```

If a hash differs, inspect the concurrent change and refresh this plan before executing.

### Task 2: Move the Homepage and Canonicalize Reveal Ownership

**Owner:** Laitstyles UI engineer

**Files:**
- Move: all 15 files in `src/features/storefront/home/**` to the exact destinations above.
- Create: `src/modules/storefront-shell/ui/home/components/reveal-div.tsx`
- Modify after move: `src/modules/storefront-shell/ui/home/components/category-card.tsx`
- Modify after move: `src/modules/storefront-shell/ui/home/components/home-section-heading.tsx`
- Delete: `src/features/storefront/shared/reveal.tsx`
- Preserve unchanged: `src/hooks/use-reveal.ts`

**Interfaces:**
- Consumes: `useReveal<T extends HTMLElement>()` from `@/hooks/use-reveal`, Products storefront contracts/UI, Storefront Shell runtime/events/icons, shared UI primitives, and `StorefrontOverlayId`.
- Produces: `StorefrontHome({ fontClassName }: { fontClassName: string })`, unchanged section/component exports, and a home-local `RevealDiv({ className?, children })` wrapper.

- [ ] **Step 1: Move the 15-file tree as one filesystem rename**

```powershell
New-Item -ItemType Directory -Force -Path 'src/modules/storefront-shell/ui' | Out-Null
Move-Item -LiteralPath 'src/features/storefront/home' -Destination 'src/modules/storefront-shell/ui/home'
```

Expected: the legacy home directory is absent; all 15 destination files exist. Do not run a formatter yet.

- [ ] **Step 2: Prove the 13 untouched runtime/type files and one moved test retained their hashes**

Run the Task 1 hash command against `src/modules/storefront-shell/ui/home/**` and compare each moved file to its Task 1 value. Expected: all 15 match before the two intentional import edits.

- [ ] **Step 3: Create the focused home reveal adapter**

Create `src/modules/storefront-shell/ui/home/components/reveal-div.tsx` with exactly:

```tsx
"use client";

import type { ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";

export function RevealDiv({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`${className} reveal${visible ? " visible" : ""}`.trim()}>
      {children}
    </div>
  );
}
```

This retains the exact wrapper DOM/class contract while delegating the 0.08 threshold, `-40px` root margin, reveal-once state, no-observer fallback, and stylesheet-owned reduced motion to the canonical hook.

- [ ] **Step 4: Cut the two reveal consumers to canonical owners**

In `category-card.tsx`, replace only:

```ts
import { useReveal } from "@/features/storefront/shared/reveal";
```

with:

```ts
import { useReveal } from "@/hooks/use-reveal";
```

In `home-section-heading.tsx`, replace only:

```ts
import { RevealDiv } from "@/features/storefront/shared/reveal";
```

with:

```ts
import { RevealDiv } from "./reveal-div";
```

Expected: no JSX, class, copy, or other import changes.

- [ ] **Step 5: Delete the legacy reveal file only after its consumers are gone**

```powershell
rg -n '@/features/storefront/shared/reveal' src tests scripts
Remove-Item -LiteralPath 'src/features/storefront/shared/reveal.tsx'
```

Expected: search is empty before deletion; the file is absent afterward. Do not delete a non-empty shared directory or any concurrently created file.

- [ ] **Step 6: Run focused component coverage**

```powershell
pnpm exec vitest run src/modules/storefront-shell/ui/home/components/category-card.test.tsx
pnpm exec biome check src/modules/storefront-shell/ui/home src/hooks/use-reveal.ts
```

Expected: category fallback/accessibility coverage passes and Biome exits `0`.

### Task 3: Cut Over the Thin Home Route and Prove Legacy Closure

**Owner:** Laitstyles UI engineer

**Files:**
- Modify: `src/app/(storefront)/(home)/page.tsx:2`
- Inspect: `src/modules/storefront-shell/ui/home/**`
- Verify absent: `src/features/storefront/**`

**Interfaces:**
- Consumes: `StorefrontHome` from Task 2 and existing `storefrontFontClassName`.
- Produces: unchanged `/` metadata and rendering through the canonical module path; no production `src/features/storefront` residue.

- [ ] **Step 1: Replace only the route import**

```ts
import { StorefrontHome } from "@/modules/storefront-shell/ui/home/storefront-home";
```

Keep `metadata`, title, description, component body, and font prop unchanged.

- [ ] **Step 2: Prove all legacy imports and paths are gone**

```powershell
rg -n '@/features/storefront|src/features/storefront|features/storefront/' src tests scripts
Test-Path -LiteralPath 'src/features/storefront'
rg --files src/features
```

Expected: no `storefront` legacy references; `Test-Path` returns `False`; `rg --files src/features` reports no files if this is the final Features slice. If unrelated concurrent files appear, stop before deleting directories and report the delta.

- [ ] **Step 3: Run focused structural checks**

```powershell
pnpm check:architecture
pnpm typecheck
pnpm exec vitest run src/modules/storefront-shell/ui/home/components/category-card.test.tsx
```

Expected: all commands exit `0`; TypeScript proves every relative move/import remains valid.

- [ ] **Step 4: Inspect only the migration diff**

```powershell
git status --short -- 'src/features/storefront' 'src/modules/storefront-shell/ui/home' 'src/app/(storefront)/(home)/page.tsx'
git diff --find-renames --stat -- 'src/features/storefront' 'src/modules/storefront-shell/ui/home' 'src/app/(storefront)/(home)/page.tsx'
git diff --find-renames -- 'src/app/(storefront)/(home)/page.tsx' 'src/modules/storefront-shell/ui/home/components/category-card.tsx' 'src/modules/storefront-shell/ui/home/components/home-section-heading.tsx' 'src/modules/storefront-shell/ui/home/components/reveal-div.tsx'
```

Expected: 15 moves, one new focused wrapper, one legacy reveal deletion, and exactly three import-path edits. No unrelated path is staged or committed.

### Task 4: Apply the Full Reviewer and Browser Gate

**Owner:** Laitstyles reviewer

**Files:**
- Review: all Task 2–3 source paths.
- Exercise: `/` through existing Playwright visual/accessibility coverage.
- Evidence only: command logs, screenshots, console/network/server-log inspection; reviewer makes no source edits.

**Interfaces:**
- Consumes: the final unstaged migration diff.
- Produces: pass/block verdict with executed, failed, skipped, and unavailable evidence separated.

- [ ] **Step 1: Run repository gates separately**

```powershell
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
```

Expected: required gates exit `0`. React Doctor is advisory globally, but any finding touching the route, moved home UI, canonical reveal hook, or imported Products/Storefront Shell UI blocks this slice. A pre-existing failure needs baseline evidence; no new failure is waivable.

- [ ] **Step 2: Run source-backed browser validation**

```powershell
pnpm validate:browser
```

At minimum inspect `/` at 375x812, 768x1024, and 1280x800 in light and dark themes. Exercise keyboard navigation and the hero CTAs, category cards, product quick view/add/save/hold controls represented on home, trust overlays, recently-viewed/saved-items action, and newsletter invalid/valid/duplicate states. Verify reveal-once behaviour, no hidden content without `IntersectionObserver`, reduced-motion visibility, no horizontal overflow, focus order/names, WCAG AA issues, console errors, failed requests, and production server errors.

Expected: screenshots and interactions are visually/behaviourally equivalent to the pre-move baseline; existing `phase-1-6-visual-parity` and `phase-1-6-accessibility` homepage cases pass. Missing runner/routes/evidence are reported as blocked or skipped, never passed.

- [ ] **Step 3: Publish the reviewer verdict**

Report:

- why Storefront Shell owns homepage composition;
- exact moves, reveal deduplication, and route import change;
- confirmation that `src/features/storefront` is absent;
- commands and browser cases actually executed, including viewport/theme/a11y evidence;
- required failures, advisory warnings, skipped checks, and blockers;
- confirmation that unrelated dirty files were neither edited, staged, nor committed;
- any hash or scope delta from Task 1.

## Explicit Exclusions

- No homepage redesign, copy edit, component split/merge, JSX cleanup, new section, or reordered section.
- No change to product filtering, the `under-25`/`grade-a-plus` catalogue patches, quick-view/cart/saved/hold behaviour, recently-viewed state, trust overlays, or newsletter prototype semantics.
- No migration or rewrite of `src/modules/products/ui/storefront/reveal.tsx`; it has a different component API and observer threshold and remains Products-owned.
- No edit to `src/hooks/use-reveal.ts`; no second hook implementation.
- No Products, Cart, Storefront Shell client runtime, store, provider, API, Server Action, Route Handler, persistence, inventory, checkout, payment, order, auth, or admin change.
- No CSS selector/token/theme/motion edit and no change to `src/modules/storefront-shell/ui/storefront.css`.
- No new barrel export, compatibility file, alias, architecture-guard exception, test-script change, dependency, or lockfile update.
- No migration-tracker status edit in this slice; completion evidence may be recorded separately only after the reviewer gate executes.
- No staging or commit; the parent workflow owns integration.

## Rollback

Rollback is source-only and requires no data migration:

1. Restore the 15 files to their exact `src/features/storefront/home/**` paths without altering content.
2. Restore the original route import to `@/features/storefront/home/storefront-home`.
3. Restore `src/features/storefront/shared/reveal.tsx` from the captured Task 1 bytes.
4. Restore the two original legacy reveal imports in `category-card.tsx` and `home-section-heading.tsx`.
5. Remove only this slice's new `src/modules/storefront-shell/ui/home/**` paths after verifying the legacy consumers resolve.
6. Re-run the focused Vitest, architecture, TypeScript, and homepage browser checks.

Do not use a broad reset or delete a directory containing concurrent work. A partial rollback that leaves duplicate home trees or split reveal ownership is not acceptable.

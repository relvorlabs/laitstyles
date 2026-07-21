# Product Detail Page — Handoff Parity Spec & Plan

**Date:** 2026-07-20
**Branch:** `feat/admin-overview-broadsheet`
**Reference:** `laitstyles-product-detail-hifi.html` (high-fidelity handoff)
**Target route:** `/products/[slug]` — rendered by `src/features/storefront/product/product-detail.tsx`

## Goal

Bring the storefront product detail page (PDP) to visual + interaction parity with
the high-fidelity handoff, **section by section**, including the colour-selection
behaviour dynamically driving product selection, layout, look-and-feel, and the
Framer-Motion-equivalent animation behaviour — while keeping the app's real,
data-driven architecture.

## Direction locked with the user (2026-07-20)

1. **Content:** Design/layout/animation parity only. Keep data-driven catalogue
   content and honest empty states. **Do not fabricate** reviews, measurements,
   provenance ("Made in Portugal"), or campaign copy that the handoff hardcodes.
2. **Palette:** Map the handoff's warm-paper palette into the design tokens,
   **storefront-scoped** (the `:root` brand tokens are shared with admin — do not
   recolour them globally). Preserve dark-mode/theming.
3. **Swatches:** Circle colour swatches (matching the handoff visual) **wired
   through `product-selection.ts`** so choosing a colour updates the label, gallery
   media, price, and available sizes wherever variant data exists.

## Global Constraints (bind every task)

- **Do NOT touch the product card.** `src/features/storefront/shared/product-card.tsx`
  is an explicit user override and must remain as-is. Recommendation sections keep
  using it unchanged.
- **No fabricated data.** Only render content derived from `Product` / `ProductDetail`.
  Where the handoff shows demo content with no real source, keep the existing honest
  empty state (`product-reviews.tsx` pattern).
- **Palette tuning is storefront-scoped.** Apply warm-paper values under the
  storefront scope (`.lst-catalogue` / `.lst-storefront`), never by editing the shared
  `:root` brand tokens. Verify admin is visually unaffected.
- **Fonts stay via `next/font`** (`storefront-fonts.ts`, Manrope + Newsreader). Do not
  add the handoff's Google Fonts `<link>` or Tailwind CDN.
- **Icons stay Hugeicons** (`@hugeicons/*`). Do not introduce Lucide.
- **Animations respect `prefers-reduced-motion`** via `useReducedMotion()` (Motion) or
  the existing reduced-motion CSS guards. Every new motion must degrade.
- **Semantic tokens over raw hex** in components. New colours go through tokens.
- **Accessibility ≥ handoff:** keep `aria-pressed`, `aria-current`, `role`, focus
  rings, 44px targets, labelled controls.
- Tests must pass: `pnpm test` (Vitest) and the Playwright parity spec
  `tests/e2e/storefront-product-detail-parity.spec.ts`.

## Handoff → codebase section map

| # | Handoff section | Codebase owner | Verdict |
|---|-----------------|----------------|---------|
| 1 | Announcement / header / mobile menu | app shell (out of PDP scope) | Not in scope — global chrome, unchanged |
| 2 | Breadcrumb | `product-detail-sections.tsx` `ProductBreadcrumb` | Aligned; minor max-width check |
| 3 | Product hero — gallery/media | `product-gallery.tsx` | **Gaps: media texture overlays, colour-driven media, thumb aspect** |
| 4 | Trust strip | `product-detail-sections.tsx` `ProductTrustStrip` | Aligned |
| 5 | "Why you'll love it" | `product-detail-sections.tsx` `ProductWhySection` | Aligned |
| 6 | Purchase panel | `product-purchase-panel.tsx` | **Gaps: circle swatches, dynamic selection wiring, size grid** |
| 7 | Details tabs | `product-information.tsx` | Aligned (tabs via shadcn) |
| 8 | Complete the look | `product-recommendations.tsx` (styled) | Aligned (uses card override) |
| 9 | Cinematic campaign | `product-campaign.tsx` | **Gaps: Ken-Burns zoom, vignette, grain, frame numeral, dot widths** |
| 10 | Size guide | `product-detail-sections.tsx` `ProductSizeGuide` | Aligned; honest em-dash behaviour kept |
| 11 | Reviews | `product-reviews.tsx` | Aligned; honest empty state kept (no fabricated cards) |
| 12 | Service strip | `product-detail-sections.tsx` `ServiceStrip` | Aligned |
| 13 | Recommendations | `product-recommendations.tsx` (related) | Aligned (uses card override) |
| 14 | Footer / mobile CTA / modals / toast | app shell + `mobile-buy-bar.tsx` | Buy bar aligned; modals are global chrome |
| — | Scroll-reveal (`.reveal`) | none shared | **Gap: reveal-on-scroll wrapper for major sections** |

## Tasks (with file ownership for safe parallelism)

Ownership is disjoint so tasks in the same wave never edit the same file.

### Wave A — foundation (run first, sequential; everything else builds on it)

**Task A1 — Storefront-scoped warm-paper palette.**
File: `src/features/storefront/shared/storefront.css` — the `.lst-storefront { … }`
light-theme block (starts ~line 57), which already aliases the global palette. **Do NOT
edit `src/app/globals.css` `:root`** (shared with admin).
- Inside `.lst-storefront`, override the *role* token values consumed by components so the
  storefront light theme reads as warm paper. Note the roles are a mix: some (`--surface-panel`,
  `--surface-sunken`, `--surface-canvas`) are literal hex in `:root`; the brand ingredients
  (`--brand-ink`, `--brand-bone`) are var-refs. Override the ones the PDP actually renders:
  `--surface-canvas`/`--brand-bone` → `#f7f4ee`, `--surface-panel`/`--surface-raised`/`--white`
  → `#fffdf9`, `--surface-sunken`/`--brand-bone-strong` → `#eee8dd`, `--brand-ink` → `#11110f`,
  `--border-subtle` → `rgba(17,17,15,.14)`, `--muted-foreground` → `#6f6a62`. Keep it scoped;
  only add/adjust declarations inside `.lst-storefront` (dark mode inherits global `.dark`).
- Verify admin unaffected (spot-check an admin route renders unchanged tokens).
- Acceptance: PDP light theme reads as warm paper matching handoff; dark mode intact; admin
  tokens unchanged.

### Wave B — coupled selection core (single task; spans 4 files that share state)

**Task B1 — Colour-driven selection wiring (circle swatches + dynamic gallery/price/sizes).**
Files: `product-hero.tsx`, `product-gallery.tsx`, `product-purchase-panel.tsx`,
and (if needed) a small `use-product-selection.ts` hook wrapping `product-selection.ts`
(reducer already exists + is tested in `use-product-selection.test.tsx`).
- Lift selection state (colour/size/qty/resolved media+price) into the hero via the
  existing `product-selection.ts` reducer (`createProductSelection` /
  `transitionProductSelection` / `resolveProductSelection`).
- Purchase panel colour control → **circle swatches**: `h-8 w-8 rounded-full`, background
  from `colour.hex` (fallback bordered neutral when hex is null), `aria-pressed`,
  `outline-2 outline-offset-4` selected ring (handoff `.swatch[aria-pressed]`). Legend
  still reads `Colour: <name>`.
- Selecting a colour updates: label, gallery media (resolved via reducer
  `selectedMedia`), display price, and the compatible size set.
- Size grid: `grid-cols-5 gap-2`, filled-ink selected state, disabled = line-through.
- Gallery consumes resolved `media` from selection (not raw `product.images`); keep the
  Motion crossfade. Add handoff media texture overlays (edge-darken gradient + subtle dot
  grain) as CSS on the media frame; hover `scale(1.018)`.
- Keep add-to-cart / buy-now behaviour and variant guardrails.
- Tests: extend/keep `use-product-selection.test.tsx`, `product-selection.test.ts`.
- Acceptance: choosing a colour with variant data visibly changes media + price + sizes;
  label always reflects selection; reduced-motion degrades crossfade.

### Wave C — independent leaf sections (parallel, file-disjoint; worktree-isolated)

**Task C1 — Cinematic campaign.**
File: `product-campaign.tsx` only.
- Add Ken-Burns slow zoom on the active frame image (`scale(1.025) → ~1.09` over ~8s,
  Motion or CSS), cinematic vignette gradient overlay, subtle grain layer, large frame
  numeral (`~88px`, low-opacity), and pill dots that widen when active
  (inactive `w-3` → active `w-6`, opacity step). Keep crossfade + autoplay + pause on
  hover/focus/offscreen/hidden-tab + reduced-motion guard.
- Acceptance: active frame subtly zooms; vignette + grain present; dots animate width;
  autoplay pauses correctly; reduced-motion disables zoom/autoplay.

**Task C2 — Scroll-reveal wrapper.**
The reveal CSS **already exists** in `storefront.css`: `.reveal` (opacity 0 +
translateY(18px), 700ms `var(--ease)`), `.reveal.visible` (visible), and the
`prefers-reduced-motion` guard (`.lst-storefront .reveal { opacity:1; transform:none }`).
This task only adds the JS that applies the `.visible` class.
New file: `src/features/storefront/product/reveal.tsx` (client). Consumers:
`product-detail.tsx` (wrap sections) + `product-detail-sections.tsx` (why/size-guide/
service) — these consumer files are edited only by C2.
- `Reveal` component: renders children in a wrapper with class `reveal`; on
  IntersectionObserver enter (threshold ~0.12, once) add class `visible`; if
  `useReducedMotion()` / no IO support, render `visible` immediately. Reuse the existing
  CSS classes — do NOT add new reveal CSS.
- Wrap the major below-the-fold sections. Do NOT wrap the hero (above fold).
- Acceptance: sections fade/rise in on scroll; reduced-motion shows them immediately;
  no CLS.

> C1 and C2 are file-disjoint from each other and from B1's files, so they run in
> parallel. (C2 touches `product-detail.tsx`/`product-detail-sections.tsx`; B1 does not.)

## Verification (final)

1. `pnpm test` green.
2. Playwright parity: `pnpm exec playwright test storefront-product-detail-parity`
   across mobile/tablet/desktop projects — captures paired handoff vs implementation
   screenshots per section; asserts fonts, campaign aspect ratios, no h-scroll, no
   runtime errors, aligned card actions.
3. Manual browser pass (Browser pane): colour swatch → media/price/size change; campaign
   zoom + autoplay; reveal-on-scroll; reduced-motion; dark mode intact; admin unaffected.
4. Final whole-branch code review.

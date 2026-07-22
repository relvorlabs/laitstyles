# Phase 2-3N — Status

**Status: BLOCKED** — product detail migrated & connected; global CSS conversion, animation conversion, stylesheet-removal gate and full visual-regression pass remain open.

Phase 2-3N ports the static `docs/storefront-v2/card-lab/*.html` design-lab prototypes into real routes as a **fake-data client SPA** scoped under `.lst-storefront`, keeping the prototype's pexels imagery and 18-item `shared/catalogue-data.ts` catalogue (user decision). It runs parallel to the real Prisma storefront (`/shop`).

## Increments completed

- **Homepage** (`storefront.html` → `src/app/(home)/page.tsx`, resolves `/`). Verified.
- **Products catalogue** (`inventory.html` → `src/app/products/page.tsx`). Verified.
- **Global theme + typography** — `src/app/globals.css` role tokens remapped to storefront prototype hex; `.dark` removed (light-only source); fonts (Geist / Instrument Serif / Geist Mono) loaded globally. Verified.
- **Product detail** (`product-detail.html` → `src/app/products/[slug]/page.tsx`). This increment. Canonical PDP is `/products/[slug]`, rendering the fake storefront prototype product by slug, using the prototype chrome (SiteHeader/SiteFooter/overlays/cart). `/p/[slug]` was already a `permanentRedirect` → `/products/[slug]` (unchanged). Prototype product cards now link to `/products/[slug]`.

## Clean-sweep refactor log (token + shadcn pass)

### 2026-07-15 storefront architecture clean sweep

- Replaced the legacy storefront prototype folder with feature-owned `home/`, `catalogue/`, `product/`, `shell/`, and `shared/` folders; the live source tree no longer imports the former path.
- Reduced `home/storefront-home.tsx` to section orchestration and moved its hero, category, arrivals, one-of-one, rail, trust, recently-viewed, newsletter, and alternate shop view into named components. The alternate shop view loads only when selected.
- Split the former 1,184-line overlay module into independently loaded search, quick-view, image-viewer, saved, cart, filter, sort, and information modules under `shared/overlays/`.
- Split product gallery, mobile buy bar, and detail primitives out of `product/product-detail.tsx`; product-gallery images now use `next/image` with explicit sizes and the Pexels remote host configured in `next.config.ts`.
- Renamed the live CSS wrapper and font variables to `lst-storefront` / `font-storefront-*` without changing the token values or visual contract.
- Kept `shared/storefront.css` intact because stylesheet removal remains gated by 2-3N-01 through 2-3N-04. This pass reorganizes ownership and loading boundaries; it does not claim visual reimplementation or backend persistence.
- Verification at this checkpoint: direct TypeScript completed with zero errors; strict button audit passed; Vitest passed 40 files / 162 tests; production build passed and generated 53 routes; React Doctor completed with no blocking errors and 64 advisory findings. Repository-wide Biome remains blocked by its broader 60-error / 90-warning backlog. Browser evidence includes structurally valid homepage output at 375 × 812, 768 × 1024, and 1280 × 800; overlay interaction and product-detail visual sign-off remain blocked until a clean local server can replace the stale pre-existing dev process.

Continuation pass authorized by the user: globalize prototype tokens, replace inline/arbitrary CSS with theme tokens, convert raw HTML → shadcn (incl. overlays), split long components. Decisions on record: **retire `(shop)/`** after `/products` became the canonical catalogue and product-detail track; legacy `/shop`, `/shop/category/[slug]`, and `/p/[slug]` URLs now permanently redirect through `next.config.ts`; **build/lint/tsc/biome-verified only** — visual sign-off deferred (pexels host blocked in sandbox, 2-3N-03); **full shadcn incl. overlays** this pass; **overlays use Base UI's default open motion + blur** (prototype `modalIn`/`drawerIn`/`viewIn` keyframes to be removed as each overlay converts, not hand-preserved); **search Dialog (#3) is the pattern gate** — user spot-checks it before overlay replication (#4) proceeds. **Portal-scope rule (mandatory):** Base UI Dialog/Sheet portal to `<body>` outside `.lst-storefront`, so every converted overlay's `DialogContent`/`SheetContent` MUST carry the `lst-storefront` class or its var aliases + scoped classes (`.eyebrow`/`.control-button`/`.price`/`var(--bone)`…) resolve to nothing → transparent/unstyled panel (same precedent as `.lst-account`, globals.css §account). Fixed in #3 after user-reported transparent background.

| # | Increment | Files | Status |
|---|---|---|---|
| 1 | Token foundation: move non-global tokens (oxblood, `--ease`, `--drawer-ease`, `--header-h`, shadow scale) to `globals.css`; `.lst-storefront` → thin aliases over global roles; `.dark .lst-storefront` block removed | `src/app/globals.css`, `shared/storefront.css` | ✅ biome ✓ |
| 2 | Prototype toast → `sonner` (themed ink/bone pill, bottom-right); `showToast` contract preserved; `.toast*` CSS + `toastIn` keyframe removed; `<Toaster>` mounted in provider | `components/ui/sonner.tsx` (added), `shared/storefront-provider.tsx`, `shared/storefront-overlays.tsx`, `shared/storefront.css` | ✅ tsc 0, biome ✓ |
| 3 | Search modal → Base UI `Dialog` — **REVERTED to hand-rolled overlay.** Live-testing on `laitstyle.localhost` exposed 2-3N-OVL (below): the Base UI Dialog popup does not unmount on close, leaving a full-screen `pointer-events:auto` overlay that **freezes the page**. Restored working hand-rolled search (opens+closes clean, verified) | `shared/storefront-overlays.tsx` | ↩ reverted; shared `dialog.tsx`/`sheet.tsx` restored to HEAD |
| 4 | Cart/saved drawer + quick-view/image-viewer/measure/guide modals → `Sheet`/`Dialog` | `shared/storefront-overlays.tsx` | ⛔ **BLOCKED by 2-3N-OVL** |

### Overlay hotfixes (user-reported, real-browser confirmed & fixed)
- **Cart** (`components/layout/storefront-cart-sheet.tsx`, a shadcn `Sheet` — this is what the bag button opens, not the legacy `.overlay` drawer): was **transparent + behind header**. Fixed: added `lst-storefront` scope to `SheetContent` (its `--bone`/`--ink`/`--line`/`--muted`/`--linen`/`--bone-2`/`--sage-light` now resolve → opaque, verified `--bone: #151713` live), and raised shared Sheet `z-50 → z-[100]` (above header `z-[60]`, verified live).
- **Auth dialog** (shared `storefront-auth-dialog`, shadcn `Dialog`): was **behind header + felt off-centre**. Fixed: raised shared Dialog `z-50 → z-[100]` (same mechanism verified on the Sheet); clearing the header also restores the centred read. Layout (2-col, not 384px-capped) already fixed via `sm:max-w-[940px]`.
- **Freeze re-assessment:** user actively uses these overlays with no freeze → the earlier "doesn't unmount" was a **synthetic-`dispatchEvent` test artifact**, not a real bug. 2-3N-OVL downgraded to a watch-item; overlay migration is **not** blocked by it. z-index raised in shared `dialog.tsx`/`sheet.tsx`; biome/tsc clean.

### BLOCKER 2-3N-OVL — Base UI overlay close behaviour needs trusted-interaction verification (downgraded → watch-item)
Observed while live-testing the storefront search `Dialog` and the pre-existing `/shop` mobile-filters `Sheet`: after close the portalled popup stayed in the DOM, `mounted` (per `DialogPopup.js` gate `hidden:!mounted`) stuck `true`, `pointer-events:auto`; for the centered dialog this blocks clicks. **Caveat — not conclusive:** the close was driven mostly via **synthetic `dispatchEvent`**, which Base UI may ignore (untrusted), so the overlays may simply not have *truly* closed rather than "failed to unmount". Clean confirmation with **trusted** interactions was blocked by sandbox flakiness (pexels-blocked screenshots time out; coordinate clicks need a screenshot; classifier outages). No animations were present at the stuck moment, so animation is *not* the cause.

**Leading hypothesis for the storefront search specifically:** the conversion was **partial** — Base UI `Dialog` was layered on top of the still-running hand-rolled `openId` state machine (its own Escape handler, scroll-lock, focus effects). Two systems controlling one overlay is the likely culprit; a proper conversion must hand open/close/focus/scroll-lock **fully** to Base UI and drop the `openId` machinery for that overlay.

**Action:** confirm with one trusted real-browser test (open auth dialog or a `/shop` sheet, close via its X/Escape, check the page is still clickable). If overlays close cleanly for real users → the freeze was a test artifact and migration can proceed (with the full-handover rule above). If they truly stick → root-cause Base UI v1.6.0 `mounted` gating in the shared primitives first. Search `Dialog` reverted to the working hand-rolled overlay in the meantime; shared `dialog.tsx`/`sheet.tsx` restored to HEAD. Separately real: shared overlay `z-50` sits under storefront header `z-[60]`.
| 5 | Raw `.button`/`.badge`/`.field` → `Button`/`Badge`/`Field` | storefront-wide | ☐ |
| 6 | `storefront-home.tsx` hero/category/one-of-one/rail/newsletter → utilities + `motion` | `home/storefront-home.tsx` | ☐ |
| 7 | `product-catalogue.tsx` `.lst-catalogue` → utilities | `catalogue/product-catalogue.tsx` | ☐ |
| 8 | Delete dead `storefront.css` selectors as consumers clear (2-3N-04 gate) | `shared/storefront.css` | ☐ gated |

Follow-up noted: `shared/storefront-experience-provider.tsx` has a **second** toast system (`showToast(tone, title, message)`, account/shared world) — not migrated to sonner in this pass; separate item.

## Blocker register

### BLOCKER 2-3N-01 — Legacy storefront CSS conversion — **Open (in progress)**
Homepage, products page, product detail and shared prototype components still depend on the ~2,463-line `storefront.css`. Approach: convert each consumer fully to Tailwind utilities (exact values preserved via arbitrary utilities referencing the same `.lst-storefront` scoped vars), verify each (lint/tsc/build) before the next, remove obsolete selectors only after all consumers migrate (see 2-3N-04).

**Converted so far (build/lint/tsc green):**
- ✅ `product-card.tsx` — shared ProductCard layout → Tailwind. Kept as shared classes: `badge*`, `inventory-note` (cart-shared), `reveal`/`visible` (pending 2-3N-02). Its now-dead CSS rules (`.media-button`, `.save-button`, `.quick-action`, `.sold-mask`, `.product-copy/-line/-name/-price/-meta/-foot`, `.card-add`) are left in place for the removal batch (2-3N-04).
- ✅ `site-header.tsx` → `SiteFooter` layout → Tailwind (`.footer`, `.footer-grid`, footer `p`/`h3`, `.footer-bottom`). Kept as shared classes: `shell`, `footer-brand` (enlarged brand-symbol/word overrides), `footer-links` (child button/anchor styling), `brand-*`.
- ✅ `site-header.tsx` → `SiteHeader` utility bar + header → Tailwind (`.utility`, `.utility-inner`, `.header`+`.scrolled`, `.header-inner`, `.desktop-nav` incl. the `::after` underline via `after:` utilities, `.header-actions`, `.bag-button`/`-label`/`-count`; responsive nav-hide + saved-hide + bag-label-hide reproduced with `max-[860px]:`/`max-[600px]:`). Kept as shared classes: `shell`, `utility-dismiss`/`icon-button`/`menu-button` (intrinsic SVG sizing), `brand-*`, and the mobile-menu `overlay`/`drawer`/`drawer-head`/`close-button`/`mobile-nav`/`mobile-feature` (shared with the overlay suite).

- ✅ `storefront-overlays.tsx` (converted in **verified sub-sections** — the file is shared-class-dense):
  - **cart + saved drawer content** (`drawer-list`, `line-item`+children, `line-top`, `remove-button`, `line-actions`, `quantity`, `line-link`, `drawer-summary` incl. sticky negative-margin + safe-area, `summary-row`, `summary-note`, `empty-drawer`, `empty-icon`) → Tailwind.
  - **quick-view internals** (`quick-grid`, `quick-main`+img/button, `thumb-row`/`thumb`, `quick-details`, `quick-brand`, `quick-price`, `quick-copy`, `quick-facts`/`fact`, `option-group`/`option-head`/`option-list`/`option`, `flaw-note`, `quick-actions`, `quick-save`, `quick-error`) → Tailwind.
  - **image-viewer internals** (`viewer-grid`, `viewer-thumbs`, `viewer-thumb`, `viewer-main`+img zoom, `viewer-controls`, `viewer-control-group`, `viewer-control`, `viewer-count`) → Tailwind.
  - Kept shared: `overlay`/`modal*`/`drawer`/`drawer-head`/`modal-head`/`close-button`, `button*`, `badge*`, `price`, `inventory-note`, `eyebrow`, `image-modal`/`search-modal`/`modal-small` (modifier widths, specificity-locked over `.modal`).
  - **search-modal internals** (`search-input-wrap`+svg, `search-input`, `search-suggestions`, `search-results`, `search-result`+img/h3/p) → Tailwind. Kept: `control-button`, `search-empty` (shared w/ home), `price`, `eyebrow`.
  - **guide-card modals** — `guide-grid` + `guide-card-head` (condition/auth/sort) → Tailwind. Kept `.guide-card` itself (it styles its `h3`/`p` children — a dedicated pass will inline those).
  - **Remaining overlay bits:** `.guide-card` (+ its h3/p), the measure modal (`measure-illustration`/`garment-shape` — `::before`/`::after` crosshair + clip-path; `measure-table`/`measure-row`/`unit-switch`), delivery/support forms (`.field` shared w/ home newsletter — keep), and `.toast` (`toastIn` keyframe → 2-3N-02). Most of what remains here is either shared design-system classes (removable only after all consumers migrate) or pseudo-element/keyframe-bound.

- ✅ `storefront-home.tsx` — **trust strip** (`trust-strip`/`trust-grid`/`trust-item`+svg/strong/span, incl. the `nth-child` border-responsive) → Tailwind, refactored data-driven.

**Remaining consumers:** `storefront-overlays.tsx` (remaining sub-sections above), `storefront-home.tsx` remaining home sections (**entangled/animation-coupled core**: hero `.hero-main img` uses the `heroImage` keyframe → 2-3N-02, plus `::after` gradient overlays; `.category-grid`/`.category-card` + `.one-edit`/`.one-card` editorial `nth-child` spans; `.product-rail`; newsletter `.field input` specificity-lock; `.section-head`/`.section-link`; the shop-view), `product-catalogue.tsx` (`.lst-catalogue` + shop classes), route boundary files, and the shared design-system classes (`.button`, `.shell`, `.badge`, `.eyebrow`, `.price`, `.section*`, `.overlay`/`.drawer`/`.close-button`, etc.) which can only be removed once every consumer migrates.

**Risk note / recommended gate:** the remaining units are dominated by pseudo-element effects (`.desktop-nav a::after` underline, card `::after` gradients), sticky/`backdrop-filter` headers, intrinsic-SVG sizing, and `nth-child` editorial grid spans (category/one-edit). These are high-risk to convert *blind* — and the visual-regression pass (2-3N-03) that would catch a mistake is **unavailable in this sandbox** (browser can't load `images.pexels.com`). Recommended: convert these only with a working visual-QA path, or accept that each is build-verified only and defer the visual sign-off to 2-3N-03 before any `storefront.css` deletion (2-3N-04).

**Dead-rule cleanup (done):** the CSS rules for the already-migrated components were removed from `storefront.css` for clarity/size — **2,743 → 1,828 lines (−915)**. Only rules whose selector's first class is confirmed-unused were dropped (via a brace-aware pruner keeping `@keyframes`, the `.lst-catalogue` block, and all still-referenced shared/descendant classes: `badge`/`price`/`button`/`field`/`overlay`/`modal`/`drawer`/`close-button`/`inventory-note`/`guide-card`/`search-empty`/`footer-brand`/`footer-links`/`icon-button`/`menu-button`/`brand-*`/`shell`/`reveal`/`section-*`/`control-button`/`check`/`filter-*`/`measure-*`/`toast` + all not-yet-migrated `hero-*`/`category-*`/`one-*`/`product-grid`/`product-rail`/`newsletter-*`/`shop-*`). Verified: braces balanced, biome-valid CSS, Lightning-CSS compile ✓, isolated `tsc` 0 errors. `storefront.css` still **exists** (not deleted — 2-3N-04 gate) because the un-migrated components + shared classes still use it.

**Environmental constraint:** faithful CSS→Tailwind parity needs the visual regression pass (2-3N-03), which is currently **blocked in the dev environment** — the browser sandbox cannot load `images.pexels.com` (the prototype's image host), so rendered pages can't be visually diffed here. Conversions are therefore verified at build/lint/tsc level only until visual QA is available.

### BLOCKER 2-3N-02 — Legacy animation conversion — **Open**
Prototype CSS keyframes still require conversion to `motion` (`motion/react`): `heroImage`, `viewIn`, `drawerIn`, `modalIn`, `toastIn`, `.reveal`, `shimmer`. Remaining: convert one animation-owning component at a time, smallest client boundary, preserve timing/trigger/easing/reduced-motion, remove CSS rules only after verified parity. The product-detail gallery crossfade and mobile buy-bar entrance were built with `motion/react` in this increment; this does **not** close the global blocker.

### BLOCKER 2-3N-03 — Full visual regression pass — **Open**
Human visual regression still required at 375 / 768 / 1024 / 1280 / wide desktop across `/`, `/products`, a representative `/products/[slug]`, admin, auth, account, checkout, shop & collection routes. The production build alone does not close this.

### BLOCKER 2-3N-04 — Final stylesheet removal gate — **Blocked by 2-3N-01 and 2-3N-02**
`storefront.css` must remain until all component + animation consumers migrate, no duplicate visual implementation remains, and full regression passes. Not deleted in this increment.

### BLOCKER 2-3N-05 — Admin & application-wide theme review — **Open**
The global storefront prototype palette is active across the codebase (admin/auth/checkout/shop re-themed, dark mode neutralised to the light palette). Human review still required for contrast, table readability, status colours, form states, focus visibility, text wrapping, data density and chart legibility. No broad admin redesign performed.

### Known consequence of this increment
`/products/[slug]` now serves the **fake prototype** product (user decision: "prototype data + always prototype chrome"). The real Prisma detail page it replaced was linked from the real `/shop` cards (real slugs); those `/shop` detail links will now `notFound()`. The prototype storefront (`/`, `/products`) does not link to `/shop`, so this is not user-facing within the prototype track, but `/shop` detail is a **known regression** to be resolved when the real vs prototype storefront tracks are reconciled (out of scope for this increment).

### 2026-07-22 verified-purchase product reviews increment

- Removed product-detail review creation. Customers now start a review only from an exact item in an authenticated, customer-owned order.
- Added Prisma-backed line fulfilment/refund and review lifecycle enums, delivery evidence, a unique review-per-order-line constraint, moderation states, fit feedback, and submitted/published timestamps. The migration is created in the repository but has **not** been deployed to a configured database by this implementation pass.
- Enforced delivered quantity plus delivery timestamp, an inclusive 90-day window, cancellation, completed-return quantities, full-refund state, duplicate prevention, and server-derived product/variant context. Missing and foreign order lines deliberately collapse to the same not-found result.
- Added serializable, retried review transactions with status-guarded updates, plus active-profile authorization so suspended or disabled sessions cannot read customer orders or mutate reviews.
- Added account order list/detail states, per-line eligibility and lifecycle treatments, submission/withdrawal feedback, status-specific resubmission copy, a responsive accessible review form, and public verified-purchase reviews. Reviews published before a later full return/refund remain visible with an honest lifecycle marker.
- Focused verification at this checkpoint: TypeScript passed with zero errors; review/security/order domain tests and the jsdom review-form suite passed in focused runs. Full lint, Vitest, build, React Doctor and browser viewport evidence are recorded separately in the implementation handoff after their final runs.
- This increment does **not** close the broader Phase 2-3N gate. The unrelated legacy CSS, animation, visual-regression and application-wide theme blockers below remain open.

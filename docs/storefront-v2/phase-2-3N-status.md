# Phase 2-3N — Status

**Status: BLOCKED** — product detail migrated & connected; global CSS conversion, animation conversion, stylesheet-removal gate and full visual-regression pass remain open.

Phase 2-3N ports the static `docs/storefront-v2/card-lab/*.html` design-lab prototypes into real routes as a **fake-data client SPA** scoped under `.lst-lab`, keeping the prototype's pexels imagery and 18-item `home-lab/data.ts` catalogue (user decision). It runs parallel to the real Prisma storefront (`/shop`).

## Increments completed

- **Homepage** (`storefront.html` → `src/app/(home)/page.tsx`, resolves `/`). Verified.
- **Products catalogue** (`inventory.html` → `src/app/products/page.tsx`). Verified.
- **Global theme + typography** — `src/app/globals.css` role tokens remapped to home-lab hex; `.dark` removed (light-only source); fonts (Geist / Instrument Serif / Geist Mono) loaded globally. Verified.
- **Product detail** (`product-detail.html` → `src/app/products/[slug]/page.tsx`). This increment. Canonical PDP is `/products/[slug]`, rendering the fake home-lab product by slug, using the prototype chrome (SiteHeader/SiteFooter/overlays/cart). `/p/[slug]` was already a `permanentRedirect` → `/products/[slug]` (unchanged). Prototype product cards now link to `/products/[slug]`.

## Blocker register

### BLOCKER 2-3N-01 — Legacy storefront CSS conversion — **Open (in progress)**
Homepage, products page, product detail and shared prototype components still depend on the ~2,463-line `home-lab.css`. Approach: convert each consumer fully to Tailwind utilities (exact values preserved via arbitrary utilities referencing the same `.lst-lab` scoped vars), verify each (lint/tsc/build) before the next, remove obsolete selectors only after all consumers migrate (see 2-3N-04).

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

- ✅ `storefront-lab.tsx` — **trust strip** (`trust-strip`/`trust-grid`/`trust-item`+svg/strong/span, incl. the `nth-child` border-responsive) → Tailwind, refactored data-driven.

**Remaining consumers:** `storefront-overlays.tsx` (remaining sub-sections above), `storefront-lab.tsx` remaining home sections (**entangled/animation-coupled core**: hero `.hero-main img` uses the `heroImage` keyframe → 2-3N-02, plus `::after` gradient overlays; `.category-grid`/`.category-card` + `.one-edit`/`.one-card` editorial `nth-child` spans; `.product-rail`; newsletter `.field input` specificity-lock; `.section-head`/`.section-link`; the shop-view), `catalogue-lab.tsx` (`.lst-catalogue` + shop classes), route boundary files, and the shared design-system classes (`.button`, `.shell`, `.badge`, `.eyebrow`, `.price`, `.section*`, `.overlay`/`.drawer`/`.close-button`, etc.) which can only be removed once every consumer migrates.

**Risk note / recommended gate:** the remaining units are dominated by pseudo-element effects (`.desktop-nav a::after` underline, card `::after` gradients), sticky/`backdrop-filter` headers, intrinsic-SVG sizing, and `nth-child` editorial grid spans (category/one-edit). These are high-risk to convert *blind* — and the visual-regression pass (2-3N-03) that would catch a mistake is **unavailable in this sandbox** (browser can't load `images.pexels.com`). Recommended: convert these only with a working visual-QA path, or accept that each is build-verified only and defer the visual sign-off to 2-3N-03 before any `home-lab.css` deletion (2-3N-04).

**Dead-rule cleanup (done):** the CSS rules for the already-migrated components were removed from `home-lab.css` for clarity/size — **2,743 → 1,828 lines (−915)**. Only rules whose selector's first class is confirmed-unused were dropped (via a brace-aware pruner keeping `@keyframes`, the `.lst-catalogue` block, and all still-referenced shared/descendant classes: `badge`/`price`/`button`/`field`/`overlay`/`modal`/`drawer`/`close-button`/`inventory-note`/`guide-card`/`search-empty`/`footer-brand`/`footer-links`/`icon-button`/`menu-button`/`brand-*`/`shell`/`reveal`/`section-*`/`control-button`/`check`/`filter-*`/`measure-*`/`toast` + all not-yet-migrated `hero-*`/`category-*`/`one-*`/`product-grid`/`product-rail`/`newsletter-*`/`shop-*`). Verified: braces balanced, biome-valid CSS, Lightning-CSS compile ✓, isolated `tsc` 0 errors. `home-lab.css` still **exists** (not deleted — 2-3N-04 gate) because the un-migrated components + shared classes still use it.

**Environmental constraint:** faithful CSS→Tailwind parity needs the visual regression pass (2-3N-03), which is currently **blocked in the dev environment** — the browser sandbox cannot load `images.pexels.com` (the prototype's image host), so rendered pages can't be visually diffed here. Conversions are therefore verified at build/lint/tsc level only until visual QA is available.

### BLOCKER 2-3N-02 — Legacy animation conversion — **Open**
Prototype CSS keyframes still require conversion to `motion` (`motion/react`): `heroImage`, `viewIn`, `drawerIn`, `modalIn`, `toastIn`, `.reveal`, `shimmer`. Remaining: convert one animation-owning component at a time, smallest client boundary, preserve timing/trigger/easing/reduced-motion, remove CSS rules only after verified parity. The product-detail gallery crossfade and mobile buy-bar entrance were built with `motion/react` in this increment; this does **not** close the global blocker.

### BLOCKER 2-3N-03 — Full visual regression pass — **Open**
Human visual regression still required at 375 / 768 / 1024 / 1280 / wide desktop across `/`, `/products`, a representative `/products/[slug]`, admin, auth, account, checkout, shop & collection routes. The production build alone does not close this.

### BLOCKER 2-3N-04 — Final stylesheet removal gate — **Blocked by 2-3N-01 and 2-3N-02**
`home-lab.css` must remain until all component + animation consumers migrate, no duplicate visual implementation remains, and full regression passes. Not deleted in this increment.

### BLOCKER 2-3N-05 — Admin & application-wide theme review — **Open**
The global home-lab palette is active across the codebase (admin/auth/checkout/shop re-themed, dark mode neutralised to the light palette). Human review still required for contrast, table readability, status colours, form states, focus visibility, text wrapping, data density and chart legibility. No broad admin redesign performed.

### Known consequence of this increment
`/products/[slug]` now serves the **fake prototype** product (user decision: "prototype data + always prototype chrome"). The real Prisma detail page it replaced was linked from the real `/shop` cards (real slugs); those `/shop` detail links will now `notFound()`. The prototype storefront (`/`, `/products`) does not link to `/shop`, so this is not user-facing within the prototype track, but `/shop` detail is a **known regression** to be resolved when the real vs prototype storefront tracks are reconciled (out of scope for this increment).

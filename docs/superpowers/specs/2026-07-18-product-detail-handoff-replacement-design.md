# Product Detail Handoff Replacement Design

**Date:** 2026-07-18  
**Status:** Approved for implementation planning  
**Scope:** Complete storefront product-detail presentation replacement

## 1. Objective

Replace the current product-detail presentation with a repository-native Next.js implementation of `laitstyles-product-detail-hifi.html`. The handoff is authoritative for page hierarchy, section order, composition, proportions, typography, spacing, responsive behavior, cinematic image treatment, and interaction presentation.

This is a full page-level replacement. Existing product-detail markup and visual hierarchy do not constrain the new result. Existing routing, server loading, metadata, not-found behavior, product types, cart behavior, wishlist behavior, holds, image-viewer behavior, and shared storefront conventions remain intact.

The two intentional adaptations are:

1. `Styled with` and `You may also like` must render the existing shared `ProductCard`.
2. Reviews must use real aggregate data or a truthful empty state. The interface must not fabricate reviews or pretend that review submission persists.

## 2. Approved architecture

Use canonical-detail enrichment rather than replacing the existing commerce contract.

- The route remains a Server Component and preserves async route params, product loading, metadata, JSON-LD, static params, Suspense, and `notFound()` behavior.
- The route loads the legacy storefront `Product` used by cart, wishlist, holds, and `ProductCard` together with the matching canonical `ProductDetail` used for description, measurements, detailed variants, reference pricing, media metadata, and review aggregates.
- A typed product-detail presentation adapter combines both sources into a view model. Real catalogue values always take precedence.
- `product-detail.tsx` owns the interactive page composition and delegates focused behavior to feature-local components in `src/features/storefront/product/` when separation improves clarity.
- Interactive behavior stays within the smallest useful Client Component boundaries. Static content remains plain React composition and does not introduce unnecessary client state.
- The existing `SiteChrome` continues to own the announcement bar, global header, navigation, footer, search, account, saved-items, and cart shell. The handoff's standalone header, mobile menu, search modal, toast, and footer are not duplicated inside the page.

This approach preserves the working commerce API while exposing richer existing catalogue data to the new presentation.

## 3. Theme and styling contract

The replacement must reproduce the handoff through the repository's design system, not by copying its standalone CSS.

- Use existing semantic theme tokens for background, surface, foreground, muted foreground, border, focus, functional, and brand roles.
- Use Tailwind CSS utilities and token-backed arbitrary utilities only where the repository has no named utility for the required geometry.
- Do not hardcode theme colours in JSX or feature constants.
- Do not use raw hexadecimal, RGB, HSL, or colour-mix values in product-detail files.
- Do not add page-local `<style>` blocks, CSS modules, global selectors, or product-detail-specific raw CSS rules.
- Do not use inline style objects for colours, spacing, typography, shadows, or other theme presentation.
- Motion values may be expressed through the existing `motion` package and Tailwind transition utilities, while respecting reduced motion.
- Reuse the existing storefront font variables. Do not add font CDN links. If the approved repository font system differs from the handoff's named fonts, preserve the editorial-serif and compact-interface relationship through the current semantic font utilities.
- Use the existing HugeIcons dependency or the repository's HugeIcons-based storefront icon wrappers. Do not add handoff CDN scripts or new Lucide usage.
- Preserve light and dark theme compatibility by relying on semantic roles rather than recreating a fixed light palette.

The target visual character remains the handoff's warm paper, near-black ink, thin borders, low-radius surfaces, restrained elevation, editorial typography, compact tracked labels, asymmetric composition, and dark cinematic campaign treatment.

## 4. Page composition

The page renders in this exact order.

### 4.1 Breadcrumb

- Use semantic breadcrumb navigation.
- Bind category/type and product name to catalogue data.
- Link to the existing home and catalogue routes.
- Preserve the handoff's compact uppercase rhythm without duplicating global chrome.

### 4.2 Product hero

Desktop uses the handoff's approximately `1.18fr / 0.82fr` media-to-purchase relationship. Mobile stacks media before purchase information.

The media column contains:

- vertical thumbnails on larger screens and a horizontal scroll rail on small screens;
- a dominant cinematic image stage;
- previous, next, and enlarge controls;
- current-image metadata and count;
- vignette and grain-like treatment composed with token-backed Tailwind gradients and overlays;
- the product trust-benefit strip; and
- the `Why you'll love it` editorial block.

The purchase column contains:

- brand/collection eyebrow, name, and description;
- wishlist toggle backed by the current saved-items state;
- real review aggregate link that scrolls to the single reviews section;
- price, valid compare-at price, and calculated reduction when available;
- delivery, payment, and returns assurances;
- actual colour choices when the catalogue exposes them;
- actual size/variant choices and disabled unavailable variants;
- quantity control bounded by stock, with one-of-one products fixed to one;
- add-to-bag backed by the existing cart action;
- buy-now that commits the valid selection to the existing cart and continues to the repository's cart/checkout path;
- delivery and availability summary; and
- a sticky desktop position that clears the global header.

Purchasable colours, variants, quantities, prices, and availability must never be invented. When a product exposes only one colour or size, the complete control group remains visible with that truthful single choice.

### 4.3 Product information and styled recommendations

Render the four handoff tabs:

1. Details
2. Fabric and care
3. Size and fit
4. Shipping and returns

Tabs use real description, material, fit, size, care, condition, and delivery information when present. Typed deterministic presentation copy may fill descriptive gaps without claiming persistence or unsupported product facts.

The adjacent `Styled with` section always uses the existing shared `ProductCard`. Candidate products are selected deterministically from the current storefront catalogue and exclude the active product. If no candidate exists, retain the section's designed frame with an honest compact empty message rather than a blank grid.

### 4.4 Cinematic campaign slider

Render the handoff's full-width dark editorial campaign stage with:

- active product imagery;
- large editorial captions;
- frame labels and numbering;
- previous and next buttons;
- progress indicators;
- supporting caption controls;
- slow opacity crossfades and restrained scale movement;
- autoplay while visible;
- pause on hover and keyboard focus;
- pause when the document is hidden; and
- no autoplay or decorative scale movement under reduced-motion preferences.

When fewer than three media assets exist, the presentation adapter may reuse available product media with distinct crops and truthful generic study captions. It must not introduce unrelated external campaign imagery.

### 4.5 Size guide

Render the full handoff composition: heading, model/fit context, measurement table, explanatory note, and image-led fit panel.

- Use canonical measurements when available.
- Use actual sizes/variants for columns.
- Preserve table geometry when measurements are unavailable by rendering em dashes in cells.
- Do not invent garment dimensions.
- Horizontal table scrolling must remain contained on small screens.

### 4.6 Ratings and reviews

There is exactly one primary reviews section and no Reviews tab.

The full handoff layout remains present:

- dark high-emphasis header;
- average rating and count;
- rating distribution;
- topic-filter region;
- sort control region;
- review-list region; and
- prominent `Write a review` action.

Data behavior:

- Use the canonical real review aggregate when available.
- If the count is zero, show a designed first-review state in place of fabricated review cards.
- Do not hardcode reviewer names, ratings, quotations, dates, or verified-purchase claims.
- Do not synthesize topic-filter results without review records. Topic filters and sorting remain visually integrated but disabled with explanatory accessible text when records are unavailable.
- `Write a review` invokes the existing storefront feedback system and clearly reports that review submission is not available yet.
- Do not open a fake form, report fake success, or mutate local review totals.

### 4.7 Service strip and recommendations

Render the handoff's four-part service-benefit strip using current storefront service language.

`You may also like` uses the existing shared `ProductCard` for every product. Recommendations are deterministic, exclude the active product, and bind all interactions to existing quick-view, save, hold, release, and add-to-cart behavior. When no recommendation exists, render an honest designed empty message without a blank heading/grid mismatch.

### 4.8 Mobile sticky action

- Show the product name, actual price, and add-to-bag action after the primary purchase control leaves the viewport.
- Reuse the same selection validation and cart action as the desktop panel.
- Respect safe-area insets through existing semantic utilities.
- Do not obscure footer content or form controls.

## 5. Presentation fallback policy

Every handoff section must render even if the catalogue does not yet expose all eventual content.

The typed presentation adapter may supply:

- generic editorial headings and explanatory copy;
- campaign frame labels and captions derived from the active product's material, fit, style, or category;
- service and delivery copy already established by storefront conventions;
- empty measurement cells; and
- honest empty-state text.

The adapter must not supply:

- fake prices, discounts, stock, colours, or purchasable variants;
- fake measurements;
- unrelated product imagery;
- fake ratings, reviewer identities, testimonials, or verified-purchase claims;
- fake delivery, payment, authentication, review, or persistence success; or
- random content, latency, timers, failures, or state transitions.

Fallbacks are deterministic and colocated with the product-detail feature so future real fields can replace them without changing page composition.

## 6. Interaction and accessibility model

- Gallery thumbnails, previous/next controls, tabs, slider controls, filters, sort controls, wishlist, quantity, size/variant choices, add-to-bag, buy-now, and mobile CTA use real buttons or form controls.
- Gallery, tabs, campaign navigation, and dialogs are keyboard operable.
- Use `aria-current`, `aria-selected`, `aria-pressed`, `aria-disabled`, labelled tab panels, and live feedback where appropriate.
- Image alternatives identify the product and view purpose; decorative thumbnails use empty alternatives where the button already supplies the accessible name.
- The existing shared image viewer provides focus management, Escape handling, and the enlarged-media experience.
- Icon-only controls have accessible names and at least 44-pixel practical targets.
- Focus order follows visual order.
- Status is never communicated by colour alone.
- Motion honors `prefers-reduced-motion`.
- Smooth programmatic scrolling falls back to immediate scrolling under reduced motion.
- The page must not create horizontal viewport overflow at any required breakpoint.

## 7. State design

### Default and success

- Available products expose valid selection, quantity, cart, wishlist, gallery, and recommendation behavior.
- Add-to-cart and wishlist success use the current Sonner-backed storefront feedback API.
- Buy-now continues into the existing cart/checkout workflow; it does not open a competing handoff checkout modal.

### Loading

- Preserve route-level Suspense.
- Rebuild `loading.tsx` to mirror the final breadcrumb, cinematic gallery, sticky panel, tabs, campaign, reviews, and recommendation geometry with existing `Skeleton` primitives.
- Avoid layout shift between loading and resolved states.

### Empty

- Zero reviews use the designed first-review state.
- Missing recommendations use a compact designed message.
- Missing measurements retain table structure with em dashes.
- Missing optional description fields use deterministic presentation copy.

### Error

- Preserve the existing route error boundary and retry behavior.
- Product-not-found continues through `notFound()` and the existing not-found boundary.
- Selection errors appear beside the relevant size/variant controls.
- Cart and wishlist feedback continues through the existing storefront feedback system.
- Review submission reports unavailable through the same feedback system.

### Inventory variations

- Sold and reserved products disable purchase actions and expose shopper-facing status copy.
- One-of-one products remain quantity one and cannot be added twice.
- Stocked products cap quantity at available stock.
- Variant products require an available selection before purchase.
- A missing reference price removes compare-at and discount presentation without leaving visual gaps.
- One-image galleries preserve the media stage and enlarge control while omitting meaningless previous/next controls.

## 8. Shared component and repository boundaries

- `ProductCard` remains unchanged unless a genuine backward-compatible compatibility issue is discovered.
- Both recommendation areas pass the complete current `ProductCard` prop contract: save state, hold state, hold countdown, quick view, save, add, hold, and release actions.
- No local recommendation card or duplicated card JSX is permitted.
- No new state-management, carousel, modal, icon, or toast library is introduced.
- No backend, database, Prisma schema, Supabase, authentication, or API changes are included.
- No global shell duplication is included.
- No unrelated refactoring is included.

## 9. Verification and completion gates

Run and pass:

```text
pnpm lint
pnpm exec tsc --noEmit
pnpm exec vitest run --passWithNoTests
pnpm build
pnpm dlx react-doctor@latest . --verbose --diff
```

Also complete:

- latest Web Interface Guidelines review of changed UI files;
- browser validation at 375 x 812, 768 x 1024, 1280 x 800, and 1440-pixel desktop width;
- visual screenshot review at the required breakpoints;
- keyboard and focus review for gallery, tabs, campaign slider, image viewer, and purchase controls;
- cart, quantity, variant, wishlist, buy-now, and mobile CTA interaction checks;
- sold, reserved, one-of-one, stocked, variant, single-image, missing-reference-price, zero-review, and missing-measurement checks;
- console and network error inspection;
- horizontal overflow and short-height sticky-panel inspection;
- source inspection confirming that both recommendation regions import and render the shared `ProductCard`;
- source inspection confirming that the product-detail implementation contains no hardcoded theme colours, raw CSS selectors, local style blocks, or inline theme styles; and
- final diff review for scope drift, duplicate reviews, duplicate shell elements, decorative dead controls, and unrelated file changes.

Browser checks are reported as blocked rather than passing if the required browser tooling cannot be used.

## 10. Acceptance criteria

The replacement is complete when:

1. The former product-detail presentation is completely removed.
2. All twelve handoff sections render in the approved order.
3. The page closely matches the handoff's editorial hierarchy, proportions, spacing, responsive behavior, and cinematic treatment.
4. Routing, metadata, structured data, server loading, not-found behavior, cart, wishlist, holds, variants, inventory, currency, and shared shell behavior remain intact.
5. All sections remain designed when optional data is unavailable.
6. Purchasable product facts and reviews are never fabricated.
7. `Styled with` and `You may also like` both use the existing shared `ProductCard` exclusively.
8. Exactly one primary ratings-and-reviews section exists.
9. Review submission clearly reports unavailable and never claims success.
10. The implementation is accessible, responsive, reduced-motion aware, and free of horizontal page overflow.
11. Product-detail styling uses existing semantic theme tokens and Tailwind utilities without hardcoded theme colours, page-local raw CSS, or inline theme styles.
12. Lint, typecheck, tests, build, React Doctor, design review, and available browser checks satisfy the stated completion gates.

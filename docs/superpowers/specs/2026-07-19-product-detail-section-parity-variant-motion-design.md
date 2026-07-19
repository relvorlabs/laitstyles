# Product Detail Section Parity, Variant Selection, and Motion Design

**Status:** Approved design

**Date:** 2026-07-19

**Reference handoff:** `C:/Users/olaitan/OneDrive/Documents/Downloads/laitstyles-product-detail-hifi.html`

## Objective

Bring the storefront product-detail content inside `main#main` into section-by-section visual and interaction parity with the attached high-fidelity HTML while preserving the repository's Next.js architecture, canonical product data, commerce behavior, semantic theme system, shared storefront components, and truthful review states.

The implementation must also replace the current visual-only colour control with a canonical variant selection flow. Selecting a colour must constrain compatible sizes and, after an exact variant is resolved, update price, availability, stock, quantity bounds, variant-linked media, and the cart payload wherever the repository contains authoritative values.

Framer Motion behavior implemented through the installed `motion/react` package must reproduce the handoff's gallery, section-reveal, and campaign behavior, including timing, easing, pause rules, autoplay, and reduced-motion fallbacks.

## Decision Summary

Use a section-owned fidelity architecture with one typed commerce controller.

- `ProductDetail` remains the server-rendered composition root.
- One PDP-local controller owns colour, size, canonical variant, quantity, resolved price, resolved availability, resolved stock, and selected media.
- Canonical variants remain intact instead of being flattened into unrelated colour and size arrays.
- A single commerce owner changes variant/media/cart contracts before visual section agents consume them.
- Visual sections remain focused components with explicit typed props.
- The root agent alone owns final composition, reveal orchestration, Playwright reconciliation, and cross-section integration.
- Shared storefront chrome remains unchanged.

## Scope Boundary

### In scope

- Every section rendered inside the PDP's `main#main`.
- PDP-owned gallery and image viewer behavior.
- PDP purchase selection, quantity, Add to bag, Buy now, and mobile purchase bar behavior.
- Canonical variant and variant-linked media mapping required by the PDP.
- Cart-line identity and pricing corrections required to preserve exact variants.
- Section-level Framer Motion behavior.
- Deterministic reference-versus-implementation Playwright comparison.
- The already-approved global Manrope/Newsreader migration.
- The already-approved two-card Complete the look cap, campaign ratios, and shared-card action alignment.

### Explicitly out of scope

- Announcement bar.
- Shared storefront header and navigation.
- Shared mobile navigation.
- Shared search and cart overlays.
- Shared footer.
- Global toast redesign.
- Product administration, persistence, checkout integration, payments, or inventory locking.
- Fabricated product copy, stock, variants, measurements, reviews, delivery promises, or returns promises.
- A new product-card implementation.

Shared chrome continues to use repository conventions even when it differs from the handoff.

## Source-of-Truth Precedence

When requirements conflict, use this order:

1. Canonical repository product, variant, stock, price, media, and review data.
2. Existing cart, wishlist, route, quick-view, image-viewer, and shared storefront behavior.
3. Existing semantic theme roles and Light/Dark theme support.
4. Explicit approved deviations in this specification.
5. The attached HTML for PDP content layout, hierarchy, responsive behavior, and motion presentation.

The HTML controls look and feel, but it cannot override truthful commerce data or introduce fake functionality.

## Architecture

### Server composition

`src/features/storefront/product/product-detail.tsx` stays a Server Component and receives the existing legacy shopper `Product` plus canonical `ProductDetail` from the route.

It remains responsible for:

- section order;
- server-rendered boundaries;
- stable semantic section IDs/test hooks;
- the shared 1380px PDP shell contract;
- wrapping reveal-enabled sections without moving the entire page into a client boundary.

### Client selection boundary

`ProductHero` remains the client boundary for purchase selection and mobile purchase behavior. Its selection state must move into a focused hook/controller rather than being divided between local colour state and the global free-form size string.

The controller exposes a stable shape equivalent to:

```ts
interface ProductSelectionState {
  selectedColour: string | null;
  selectedSize: string | null;
  selectedVariantId: string | null;
  quantity: number;
  displayPrice: number;
  available: boolean;
  availableQuantity: number;
  media: readonly ProductImage[];
}
```

The implementation may refine names, but it must retain these capabilities and keep derivations deterministic and testable.

### Section boundaries

Keep or create focused components for:

- breadcrumb;
- gallery;
- trust strip;
- editorial Why section;
- purchase panel;
- mobile purchase bar;
- product information tabs;
- Complete the look;
- campaign;
- size guide;
- reviews;
- service benefits;
- final recommendations;
- PDP reveal wrapper.

No component should own both unrelated visual sections and shared commerce state solely to simplify prop passing.

## Canonical Variant and Media Contracts

### Variant presentation

The presentation adapter must retain canonical variant records with:

- variant ID;
- shopper-facing label;
- SKU when present;
- size;
- colour name;
- persisted colour hex when present;
- optional variant price;
- exact availability state;
- exact available quantity;
- one-of-one status.

It must not continue to expose only independent flat colour and size lists for selection behavior.

### Colour hex

The snapshot already contains `colour_hex`. Preserve it through the canonical variant type and both catalogue adapters.

Circular swatches use the persisted product-data value. To preserve the prohibition on inline CSS and hardcoded theme colours, the swatch colour should be rendered as data-driven SVG fill inside the semantic button structure. If no hex exists, show a semantic neutral swatch plus the accessible colour name; do not invent a hex value.

### Variant-linked media

The snapshot contains `product_media.variant_id`, but the current canonical mapper drops it. Extend `ProductImage` and both snapshot/Prisma media adapters to preserve an optional `variantId`.

Media resolution rules:

1. When the selected exact variant has linked media, show that media first.
2. If the selected colour maps to multiple variants with linked media, combine their media without duplicates in canonical position order.
3. Append unscoped product media as fallback.
4. If no variant-linked media exists, preserve the product-level gallery unchanged.
5. Never infer a media-to-colour relationship from filenames, alt text, position, or colour similarity.

## Selection Behavior

### Initial state

- For a variant product, select the first colour that has at least one available variant.
- If every variant is unavailable, select the first canonical colour for inspection but keep purchase actions disabled.
- Preserve a product-level colour for unique and stocked products.
- Do not automatically select a size when multiple compatible sizes exist.
- A single compatible size may be selected automatically only when it resolves one unambiguous variant.

### Colour change

Selecting a colour must:

1. update the visible colour label and `aria-pressed` state;
2. derive only the sizes belonging to that colour;
3. preserve the current size when that exact combination exists;
4. clear the current size and variant when it is incompatible;
5. resolve an exact variant immediately when only one combination remains;
6. update variant-linked media only when canonical links exist;
7. update price, availability, stock, and quantity bound after exact resolution;
8. reset quantity downward when the previous quantity exceeds new availability.

### Size change

Selecting a size must resolve exactly one canonical variant within the selected colour. Sold-out combinations remain visible when useful for comparison but are disabled and clearly identified without relying on colour alone.

### Price and availability

- Display `variant.price` when non-null; otherwise inherit the canonical product price.
- Use the selected variant's availability and available count after exact resolution.
- Before exact resolution, display product-level price and aggregate availability but keep Add to bag disabled for variant products.
- Quantity maximum uses the selected variant's available count.
- Unique products remain capped at one.

### Purchase errors

Expected failures use plain business language beside the relevant controls:

- choose a colour;
- choose an available size;
- selected combination is sold out;
- requested quantity exceeds available stock.

Do not clear valid choices after an error.

## Cart Contract

The cart must distinguish lines by product plus canonical variant ID.

A variant cart line retains:

- product ID;
- stable line key;
- canonical variant ID;
- variant label;
- colour;
- size;
- authoritative unit price;
- quantity.

Rules:

- Adding the same product and same variant increments that line within its stock limit.
- Adding a different variant creates a distinct line.
- Subtotal uses each line's authoritative unit price.
- Quantity changes and removal address the stable line key, not only the product ID.
- Existing non-variant calls remain backward compatible.
- Quick view and PDP must converge on the same canonical cart selection shape.
- Buy now carries the same exact variant selection into the repository's existing purchase flow. If no real direct-checkout integration exists, it must retain the current truthful cart behavior rather than presenting a fake checkout success.
- No change may claim server persistence or inventory reservation that does not exist.

## Section-by-Section Visual Contract

### Shared PDP shell and breadcrumb

- Maximum content width: 1380px.
- Horizontal gutter: 12px below 768px and 16px at 768px and above, matching the handoff's effective shell.
- Breadcrumb has 20px vertical padding, wraps safely, and uses compact uppercase Manrope with the current product distinguished from ancestors.

### Hero composition

- One column below `lg`.
- At `lg`, use `minmax(0, 1.18fr) minmax(390px, .82fr)` with a 48px gap.
- Purchase panel remains sticky only at `lg`, with a 100px top offset.

### Gallery

- Mobile thumbnail rail is horizontal beneath the image with 80x96 thumbnails.
- From `sm`, the rail becomes a vertical 84px column with 116px-high thumbnails.
- The primary frame uses the handoff's 520px mobile target and 760px larger target, adjusted only if actual same-viewport comparison proves the handoff's conflicting utilities produce a different computed result.
- Preserve `next/image`, correct `sizes`, `object-cover`, alt text, cyclic navigation, active thumbnail state, caption, and image viewer.
- Reproduce the handoff's restrained radius, warm fallback surface, bottom/edge gradients, and grain treatment using existing semantic tokens/utilities.
- Controls remain at least 44px with accessible names.

### Trust strip

- Place immediately below the gallery with a 16px gap.
- Two columns on mobile; four from `sm`.
- Match border/divider geometry.
- Keep repository-truthful benefit copy.

### Why you'll love it

- One column below `md`; `.92fr / 1.08fr` from `md`.
- Image panel has a 360px minimum height.
- Match the handoff's image caption, editorial heading rhythm, benefit rows, and metadata tags.
- Copy remains canonical or deterministic without unsupported claims.

### Purchase panel

- Match the handoff's eyebrow, Newsreader title, description, wishlist placement, review jump, price hierarchy, discount badge, assurance row, selector spacing, quantity row, primary/secondary actions, and delivery/inventory card.
- Current price uses 34px extra-bold Manrope; title uses 46px Newsreader and 56px from `sm`.
- Wishlist is a 48px circular control.
- Colour controls are 32px circular swatches with a semantic selected outline and offset equivalent to the handoff.
- Every swatch has an accessible colour name and `aria-pressed`.
- Size controls reproduce the handoff's compact grid while preserving comfortable mobile targets.
- Sold-out state is communicated by text/decoration and disabled semantics, not colour alone.

### Mobile purchase bar

- Fixed across the bottom below `lg`; hidden at `lg`.
- Match the handoff's warm translucent surface, blur, top hairline, product/price hierarchy, and 48px action.
- Respect safe-area inset.
- Reflect the exact selected variant price and enabled state.
- Use the same purchase command as the desktop panel.

### Product information and Complete the look

- One column below `lg`; `1.15fr / .85fr` with a 20px gap at `lg`.
- Information surface has four horizontally scrollable tabs with a 56px minimum height.
- Match active underline, typography, content minimum height, and responsive padding.
- Each tab uses the handoff's editorial hierarchy while rendering only truthful content.
- Inline size-guide navigation remains functional and reduced-motion aware.
- Complete the look intentionally renders at most two existing shared ProductCards in two columns.
- Preserve the handoff surface, heading, link, padding, and empty-state hierarchy around those cards.

### Campaign

- Full-width semantic inverse surface.
- Header, support copy, bottom editorial copy, frame number, overlays, top-right previous/next controls, bottom-right progress indicators, and caption controls match the handoff.
- Frame ratios remain the explicit approved override:
  - 4:5 at 375px mobile;
  - 4:3 at 768px tablet;
  - 16:9 at 1280px desktop.
- Images retain `next/image`, `fill`, accurate `sizes`, and `object-cover`.
- Caption controls form one column on mobile and three from `sm`.

### Size guide

- Match the bordered warm-surface header and `1.15fr / .85fr` desktop body.
- Table remains horizontally scrollable with a 620px minimum width.
- Use canonical measurements; unavailable values display an em dash.
- The image/fit-note panel has a 360px minimum height and appropriate desktop divider.

### Reviews

- Preserve the handoff's inverse aggregate header and `.72fr / 1.28fr` desktop body.
- Use truthful `average`, `count`, and distribution only.
- With zero reviews, retain the full aggregate/breakdown/content geometry and render a purposeful empty state.
- With aggregate-only data, state that individual reviews are unavailable.
- Write a review clearly reports that submission is unavailable and does not fake persistence or success.
- Filters, sort, and load-more controls appear only when real review records make them meaningful.

### Service benefits

- Two columns on mobile; four from `md`.
- Match handoff borders, divider changes, icon scale, and copy rhythm.
- Claims remain truthful to repository policy.

### Final recommendations

- Match the handoff heading row and spacing.
- Retain the existing shared ProductCard.
- Grid remains two columns mobile, three at `md`, and six at `lg`.
- Keep truthful empty-state behavior.

## Motion Contract

Use `LazyMotion`, `domAnimation`, and `m` from `motion/react`. Do not add a second animation library.

### Shared easing

Primary handoff curve:

```text
[0.2, 0.75, 0.25, 1]
```

Cinematic campaign curve:

```text
[0.15, 0.6, 0.2, 1]
```

### Gallery

- Opacity transition: 550ms.
- Transform transition: 950ms using the primary curve.
- Source change briefly fades toward opacity zero and scale `1.018`, then restores after the next image is ready.
- Hover scale: `1.018`.
- Only the active image is interactive and exposed as current to assistive technology.

### Section reveal

- Initial opacity zero and translateY 22px.
- Opacity settles over 750ms.
- Transform settles over 950ms using the primary curve.
- Intersection threshold: 0.12.
- Reveal once, then stop observing.
- Apply to Why, details/recommendations, campaign, size guide, reviews, service strip, and final recommendations.
- Use a PDP-specific wrapper rather than changing the global storefront reveal contract.

### Campaign

- Incoming slide opacity: 900ms.
- Slide transform: 1200ms from scale `1.025` to `1` using the primary curve.
- Outgoing slide stops accepting pointer input immediately and becomes accessibility-hidden.
- Active image scales from `1.025` to `1.09` over 8000ms using the cinematic curve.
- Autoplay advances every 6200ms.
- Hovering the stage pauses autoplay; leaving restarts a fresh interval.
- Previous, next, dot, and caption navigation restart the interval.
- Active progress indicator width and caption surface animate with the slide state.

### Reduced motion

When reduced motion is requested:

- reveal content is immediately visible;
- gallery and campaign changes settle immediately;
- transform travel is removed;
- campaign autoplay does not start;
- smooth scrolling becomes instant;
- functionality and final accessible state remain identical.

Only opacity and transform may be animated for the specified sequences. Avoid animated width except the small campaign progress indicator, whose handoff behavior explicitly depends on width.

## Styling and Theme Constraints

- Use existing semantic theme tokens and Tailwind utilities.
- Do not copy the handoff's raw theme hex colours into components.
- Do not add page-local style blocks, CSS modules, raw PDP selectors, or inline CSS presentation styles.
- Persisted product colour values are data, not theme values, and must be rendered through data-driven SVG fill.
- Preserve Light and Dark themes; semantic roles remain authoritative when literal handoff colours differ.
- Use the global Manrope and Newsreader font roles established by the approved font migration.
- Keep HugeIcons and existing Base UI/shadcn primitives.
- Keep one clear primary purchase action per context.
- Preserve focus-visible treatments, touch targets, and semantic disabled states.

## Accessibility

- All icon-only controls require accessible names.
- Swatches and size controls expose selection with `aria-pressed` or the appropriate radio semantics.
- Selected colour and size are announced in visible text.
- Disabled combinations explain availability without relying on colour.
- Gallery, tabs, campaign, and review controls follow visual keyboard order.
- Sticky regions must not obscure focused content.
- Modal/image-viewer behavior retains accessible titles, focus containment, Escape, and restoration through existing shared primitives.
- Motion respects `prefers-reduced-motion`.
- Text and controls meet WCAG AA contrast under both themes.
- No horizontal page overflow at required viewports.

## Loading, Empty, and Error States

- Existing route `loading.tsx`, `error.tsx`, and `not-found.tsx` remain functional and inherit the global typography.
- Missing product media uses the existing truthful image-unavailable treatment.
- Missing variant media falls back to product media without an error.
- Missing colour hex uses a semantic neutral swatch plus the visible colour label.
- No compatible available variant disables purchase actions and states why.
- Review empty and aggregate-only states preserve full section layout.
- Recommendation empty states remain truthful.
- Unexpected failures stay with route/shared error boundaries rather than being swallowed in section components.

## Parallel Implementation Ownership

Implementation must be split into bounded workstreams after the specification and implementation plan are approved.

### Foundation owner: selection, media, and commerce

Owns:

- canonical variant and media types;
- snapshot and Prisma mappers;
- presentation selection adapter and unit tests;
- PDP selection controller;
- cart-line contract and tests;
- purchase integration interface.

No other agent may concurrently edit the shared provider/cart contract.

### Gallery owner

Owns only gallery/image-viewer PDP files and consumes the established controlled media interface.

### Purchase owner

Owns purchase panel and mobile purchase bar after the controller interface is stable.

### Editorial/server-section owner

Owns breadcrumb, trust strip, Why section, size guide, and service strip. If these remain in one physical file, they must stay with one agent.

### Information/recommendation owner

Owns tabs and recommendation-section containers. Shared ProductCard remains unchanged except for already-approved shared alignment work.

### Campaign owner

Owns campaign layout, controls, autoplay, and motion.

### Reviews owner

Owns review layout and truthful states without changing review data contracts unless the plan explicitly assigns them.

### Integration owner

Owns:

- `product-detail.tsx`;
- PDP reveal wrapper and composition;
- stable test hooks;
- section order and shell geometry;
- conflict resolution;
- Playwright parity tests;
- final evidence review.

Because four agent slots are available, section work will run in parallel waves. File ownership must remain exclusive inside each wave.

## Deterministic Playwright Design

The previous development-server comparison is not valid evidence. It used Portless/Next dev with HMR, recorded WebSocket and aborted-chunk noise, timed out during route compilation, and waited globally on external images.

### Server lifecycle

Use a dedicated PDP parity configuration:

- build the application first;
- start `next start` on a fixed localhost port;
- serve the reference HTML from a second fixed localhost HTTP server;
- disable server reuse;
- use one worker;
- use a 120-second test timeout and bounded 15-second assertions;
- use fixed locale, timezone, colour scheme, device scale factor, and clock.

Do not use Next dev, Turbopack HMR, Portless, `page.setContent()`, or a shared browser context for reference and implementation evidence.

### Deterministic product fixture

Default to:

```text
/products/patterned-office-shirt-capsule
```

This canonical product has multiple colours and variants and is suitable for variant interaction coverage. Allow `PLAYWRIGHT_PRODUCT_PATH` to override it.

### Reference assets

The handoff depends on Tailwind browser CDN, Lucide UMD, Google Fonts, and Unsplash media. Record and replay those assets from a Playwright HAR or equivalent deterministic local fixture.

The evidence run must record:

- handoff source SHA-256;
- asset manifest;
- expected Manrope/Newsreader faces;
- capture date;
- any unavailable dependency as a blocking failure.

Do not silently continue with unloaded reference fonts, CSS, scripts, or images.

### Readiness

Add stable semantic hooks equivalent to:

```text
data-testid="pdp-root"
data-pdp-ready="true"
data-pdp-section="hero"
data-pdp-section="information"
data-pdp-section="complete-look"
data-pdp-section="campaign"
data-pdp-section="size-guide"
data-pdp-section="reviews"
data-pdp-section="service-benefits"
data-pdp-section="recommendations"
data-selected-colour
data-selected-size
data-selected-variant-id
data-current-image-index
data-current-campaign-index
```

Navigate once to the deterministic route, wait for the PDP root/readiness hook and fonts, then scroll to and settle only the section being captured. Do not wait on every lazy image in the document or on global network idle.

### Viewports

Required projects:

- 375 x 812 mobile;
- 768 x 1024 tablet;
- 1280 x 800 desktop.

### Evidence set

Capture paired reference/implementation images for:

- full page;
- breadcrumb;
- hero/gallery default and alternate image;
- trust strip;
- Why section;
- purchase panel default and alternate colour;
- every information tab;
- Complete the look;
- campaign default and second frame;
- size guide;
- reviews;
- service strip;
- final recommendations;
- mobile purchase bar.

Store geometry and computed typography/style evidence beside screenshots.

### Layout assertions

- Shell width and gutters: 2px tolerance.
- Section gaps and positions: 2px tolerance.
- Component dimensions: 4px or 1%, whichever is larger.
- Font size and line height: 1px tolerance.
- Campaign ratio: at most 2% relative error.
- Card action alignment: 2px tolerance.
- Complete the look: at most two cards and exactly two grid tracks when two exist.
- No horizontal page overflow.

Theme comparisons assert semantic role usage rather than literal equality with the handoff's raw hex values.

### Variant interaction assertions

The multicolour fixture must prove:

1. swatches come from canonical variant data;
2. colour label and pressed state update;
3. compatible sizes update;
4. an incompatible previous size clears;
5. a size resolves one canonical variant ID;
6. price, availability, stock, and quantity reflect that variant;
7. linked media changes only when present;
8. sold-out combinations are disabled;
9. Add to bag records exact variant ID, colour, size, quantity, and unit price;
10. a different variant creates a different cart line;
11. keyboard interaction follows visual order.

### Motion assertions

Run stable screenshot tests with reduced motion. Run separate normal-motion tests with controlled time, trace, and video.

Assert:

- gallery initial, intermediate, and settled opacity/transform;
- gallery active thumbnail and viewer synchronization;
- reveal initial and settled state at threshold;
- campaign incoming/outgoing accessibility and pointer state;
- 900ms/1200ms campaign slide progression;
- eight-second cinematic image scale;
- 6200ms autoplay;
- hover pause and fresh restart;
- manual navigation restart;
- immediate stable reduced-motion behavior.

## Approved Deviation Manifest

- `DEV-SHARED-CHROME`: announcement, header, shared overlays, footer, and global toast remain repository-owned.
- `DEV-PRODUCT-DATA`: names, prices, stock, copy, measurements, and media remain truthful.
- `DEV-THEME-TOKENS`: semantic theme roles replace literal handoff theme colours.
- `DEV-COMPLETE-LOOK-CARDS`: at most two existing shared ProductCards.
- `DEV-RECOMMENDATION-CARDS`: final recommendations use the existing shared ProductCard.
- `DEV-REVIEWS`: truthful aggregate, aggregate-only, or empty review state; no fabricated entries.
- `DEV-REVIEW-SUBMISSION`: submission is explicitly unavailable.
- `DEV-CAMPAIGN-ASPECT`: 4:5 mobile, 4:3 tablet, and 16:9 desktop.
- `DEV-UNSUPPORTED-COPY`: unsupported delivery, return, material, or fit claims are replaced with truthful repository copy.

Screenshots remain honest and unmasked for human review. Automated diff masks may cover only regions tied to a documented deviation ID.

## Verification Gates

Before completion:

- unit tests cover presentation selection, colour-size compatibility, variant price/availability, media fallback, and cart-line identity;
- changed UI files pass Biome;
- TypeScript passes for the changed scope and repository-wide unless blocked by a documented pre-existing unrelated error;
- relevant Vitest suites pass;
- production build passes;
- React Doctor changed-scope findings are resolved;
- Playwright layout tests pass at all three viewports;
- Playwright variant interaction tests pass;
- Playwright motion and reduced-motion tests pass;
- console and network logs contain no font, CSS, script, image, hydration, or runtime failures;
- paired screenshots are reviewed section by section at original resolution;
- intentional and unintentional differences are reported separately;
- any material unintentional difference blocks an exact-match claim.

## Completion Definition

The work is complete only when:

1. every PDP-owned section matches the handoff's approved layout and interaction presentation;
2. shared chrome remains unchanged;
3. colour and size resolve truthful canonical variants;
4. cart lines preserve exact variants and prices;
5. Motion behavior and reduced-motion behavior match the approved contract;
6. all approved ProductCard, review, campaign, theme, and data exceptions are preserved;
7. deterministic Playwright evidence exists for all required viewports and states;
8. no material unintentional parity difference remains;
9. verification results and any unrelated blockers are reported honestly.

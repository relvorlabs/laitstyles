# Storefront Product Card, Campaign, and Handoff Parity Design

## Objective

Correct three presentation inconsistencies and establish a strict handoff-parity gate without changing product data, commerce behavior, routing, theme tokens, or the handoff's editorial hierarchy:

1. Render exactly two shared product cards in the product-detail page's **Complete the look** section.
2. Give every campaign slide a consistent responsive frame so its imagery no longer inherits an uneven fixed height.
3. Align product-card primary actions across storefront grids while keeping product names compact.
4. Replace the current application typography with the two font families used by `laitstyles-product-detail-hifi.html`, then validate the implemented PDP directly against that HTML with Playwright.

## Decisions

### Complete the look

- The recommendation selector returns at most two `styledWith` products.
- The section uses a two-column grid at supported widths.
- It continues to render `src/features/storefront/shared/product-card.tsx`; no recommendation-only card fork is permitted.
- Empty-state behavior remains truthful when fewer than two matching products exist.

### Campaign frames

- Remove the fixed `min-height: 680px` presentation.
- Use one explicit aspect ratio per responsive range:
  - mobile: `4 / 5` portrait
  - tablet: `4 / 3` landscape
  - desktop: `16 / 9` landscape
- Every slide occupies the same frame at a given viewport.
- Images remain edge-to-edge with `next/image`, `fill`, and `object-cover` so the campaign retains the approved handoff treatment.
- Existing carousel navigation, autoplay pausing, reduced-motion behavior, captions, and semantic controls remain unchanged.

### Product-card action alignment

- Product names clamp to two lines.
- Cards stretch to the height of their grid row.
- The information region grows to consume remaining vertical space.
- Inventory/availability information stays above the primary action.
- The primary action is anchored to the bottom of the card, producing a shared baseline across each grid row.
- Apply the contract to both storefront card implementations:
  - `src/features/storefront/shared/product-card.tsx`
  - `src/features/storefront/catalogue/product-card.tsx`
- Consumers on the home page, `/products`, PDP recommendations, category/collection pages, and account grids receive the correction through shared components rather than page-specific overrides.

### Application-wide typography

The handoff imports and defines two canonical families:

- `Manrope` at weights 400, 500, 600, 700, and 800 for interface, body, navigation, controls, labels, and utility text.
- `Newsreader` at weights 500 and 600, with its optical-size axis, for display and serif text.

Implementation contract:

- Replace `Geist`, `Geist_Mono`, and `Instrument_Serif` in the central `next/font/google` loader.
- Load Manrope and Newsreader through `next/font` so the app remains self-hosted and does not add runtime Google Fonts requests.
- Apply the resulting font variables at the root layout so storefront, account, admin, overlays, loading states, and error boundaries inherit the same typography.
- Map the global sans and heading roles to Manrope.
- Map the global serif/display role to Newsreader.
- Map the existing utility/mono role to Manrope as well; retain tabular-number and letter-spacing utilities where the interface needs data alignment, but do not retain a third font family.
- Remove stale comments and assumptions that name the superseded Geist/Instrument font set.
- Do not add route-specific font loaders or page-level font overrides.

### Handoff parity and Playwright comparison

`C:/Users/olaitan/OneDrive/Documents/Downloads/laitstyles-product-detail-hifi.html` remains the visual and interaction source of truth for the PDP.

- Serve or open both the reference HTML and the implemented PDP in Playwright.
- Compare them at identical light-theme viewports: 375 × 812, 768 × 1024, and 1280 × 800.
- Wait for `document.fonts.ready`, image settlement, and stable layout before capture.
- Disable or settle autoplay/reveal motion for deterministic screenshots while preserving production motion behavior.
- Capture full-page and focused section screenshots for hero, product information/Complete the look, campaign, reviews, service strip, and final recommendations.
- Compare section order, container widths, spacing rhythm, typography, image framing, responsive transitions, controls, borders, radii, and sticky behavior.
- Iterate on implementation until no material visual or interaction deviation remains.
- Do not claim the page "exactly matches" the handoff unless this comparison has been completed and the evidence supports that statement.
- Literal pixel identity is not expected where the approved repository requirements intentionally differ: live product content, canonical theme-token values, truthful empty/review states, and the shared ProductCard in both recommendation regions. Outside those explicit exceptions, the handoff controls the page's look and feel.

## Styling constraints

- Use existing semantic theme tokens and Tailwind utilities.
- Add no hardcoded colours, inline presentation styles, page-local style blocks, or raw CSS selectors.
- Preserve current button variants, card imagery, hover actions, save controls, cart behavior, and unavailable states.
- Typography is the sole expanded app-wide visual change: replace the current families with Manrope and Newsreader while preserving the existing semantic font-role tokens.

## Verification

- Add or update a unit test proving `styledWith` recommendations are capped at two.
- Observe that test fail before changing production selection logic, then make it pass.
- Add a font-contract check proving the central loader exports Manrope and Newsreader roles and no longer references Geist or Instrument Serif.
- Run changed-scope Biome, TypeScript, relevant Vitest suites, and React Doctor.
- Validate card action alignment and campaign ratios at 375 × 812, 768 × 1024, and 1280 × 800.
- Confirm the PDP's Complete the look section contains no more than two shared product cards.
- Run the same-viewport Playwright reference-versus-implementation comparison described above and retain screenshot evidence.
- Inspect console and network output for failed fonts, CSS, images, hydration, or interactions.
- Report remaining intentional and unintentional differences separately; any unintentional material difference blocks completion.

## Exclusions

- No product data or recommendation-ranking changes beyond the two-item cap.
- No redesign of button labels, card interactions, campaign copy, or carousel timing.
- No changes to unrelated admin, Prisma, asset-provider, or migration work already present on the branch.
- No changes to semantic colour tokens solely to imitate the handoff's literal colour values; repository theme roles remain authoritative.

# Storefront Product Card and Campaign Alignment Design

## Objective

Correct three presentation inconsistencies without changing product data, commerce behavior, routing, theme tokens, or the handoff's editorial hierarchy:

1. Render exactly two shared product cards in the product-detail page's **Complete the look** section.
2. Give every campaign slide a consistent responsive frame so its imagery no longer inherits an uneven fixed height.
3. Align product-card primary actions across storefront grids while keeping product names compact.

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

## Styling constraints

- Use existing semantic theme tokens and Tailwind utilities.
- Add no hardcoded colours, inline presentation styles, page-local style blocks, or raw CSS selectors.
- Preserve current typography, button variants, card imagery, hover actions, save controls, cart behavior, and unavailable states.

## Verification

- Add or update a unit test proving `styledWith` recommendations are capped at two.
- Observe that test fail before changing production selection logic, then make it pass.
- Run changed-scope Biome, TypeScript, relevant Vitest suites, and React Doctor.
- Validate card action alignment and campaign ratios at 375 × 812, 768 × 1024, and 1280 × 800.
- Confirm the PDP's Complete the look section contains no more than two shared product cards.

## Exclusions

- No product data or recommendation-ranking changes beyond the two-item cap.
- No redesign of button labels, card interactions, campaign copy, or carousel timing.
- No changes to unrelated admin, Prisma, asset-provider, or migration work already present on the branch.

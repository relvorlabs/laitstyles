# Laitstyle Control Room V2 — Phase 8 Visual System, Shell and Overview Correction

## Status

**Planned after a code and design audit. Implementation has not started.**

Phase 8 is added by the user’s explicit scope extension. It does not mark Phase 4, Phase 5, Phase 6 or Phase 7 as accepted, does not resolve the missing workflow execution, and does not resolve the branch’s divergence from `main`.

## Refined implementation brief

Review and correct the Control Room as a premium fashion-operations product rather than applying another cosmetic theme pass. Establish an editorial, calm and operationally dense visual system based on the approved Laitstyle Ink, Bone and Sage identity. Fix the broken Base UI theme menu, selected-navigation contrast, dark-mode surface hierarchy, sidebar overflow, command/search quality, Overview information architecture and Inventory presentation. Reuse the strongest structural ideas from the legacy Overview on `main` only where they improve hierarchy and task flow; do not restore the legacy monolith, raw colours, obsolete navigation or one-of-one-only assumptions.

The result must feel designed for a curated fashion marketplace: product imagery should be confident, typography should be editorial, data should remain readable, operational urgency should be clear without turning the interface into an enterprise ERP, and both themes must be composed independently rather than treated as simple colour inversions.

## Verified problems

The following issues were confirmed in the current branch and are part of Phase 8 rather than optional polish.

### Theme and component composition

- The theme menu currently renders a Base UI `GroupLabel` outside a `Menu.Group` or `Menu.RadioGroup`, producing `MenuGroupContext is missing` and preventing theme changes.
- Dark mode currently promotes Bone to the generic `primary` and sidebar selected surface, creating bright white blocks and weak selected-state hierarchy.
- Several Admin and shared component paths still require a complete raw-colour and computed-style audit.
- Existing token names describe implementation primitives but do not fully express the fashion-specific surface and action hierarchy.

### Shell and navigation

- The desktop and mobile sidebars use a fixed viewport height without a `min-h-0` plus internal scrolling boundary.
- Navigation, appearance, storefront information and account context compete inside one vertical stack and can overflow on short screens.
- Selected navigation can bury label, description or icon content because the parent and nested icon surfaces use conflicting light backgrounds.
- The Control Room search trigger is a generic pill and the command menu primarily navigates static destinations rather than useful products, orders, customers and recent actions.

### Overview

- The current Overview gives many modules equal full-width prominence, causing duplicated summary information and excessive vertical scanning.
- `Continue working`, hold urgency, fulfilment exceptions and activity are better suited to a supporting rail on desktop.
- The legacy Overview on `main` has a stronger queue, open-orders and right-rail composition, but it also contains raw colours, a page monolith and obsolete one-of-one assumptions. Phase 8 may reuse its information hierarchy, not its implementation.

### Inventory

- A fixed five-column rule at the 1280px viewport ignores the 280px Control Room sidebar and produces narrow cards with compressed typography and controls.
- The current card anatomy uses very small labels and figures, insufficient image presence and too many compressed rows for the available width.
- Card heights and visual rhythm do not feel intentional across mixed product states.
- The table includes thumbnails, but the thumbnail is not a distinct image-preview action. Table users must be able to open the same media viewer without opening the product record accidentally.

## Design direction

### Product character

- Editorial fashion studio, not generic SaaS dashboard.
- Calm and premium, not decorative luxury theatre.
- Operational density where comparison matters, generous space where product imagery and decisions matter.
- Ink owns authority and typography.
- Bone owns warm editorial canvas and quiet raised surfaces.
- Sage owns brand recognition, focus and selected intent; it must not become a low-contrast wash applied everywhere.
- Functional warning, success and destructive colours remain semantically distinct from the brand accent.

### Theme roles

Phase 8 must define and document these roles for both light and dark modes:

- app canvas
- sidebar canvas
- sunken workspace
- standard panel
- raised panel
- interactive panel
- selected navigation
- primary action
- secondary action
- input and search surface
- overlay and floating surface
- muted text
- strong text
- focus ring
- success, warning and destructive surface/foreground pairs
- data-visualisation colours

A component must consume a role token. It must not choose a raw palette value or invent a one-off dark-mode override.

## Locked scope

### Batch 8A — evidence-led theme system correction

- Inventory every Admin, Control Room and shared UI raw colour, named neutral and manual dark-mode override.
- Produce a light/dark role matrix for every semantic surface and foreground pair.
- Rebalance Ink, Bone and Sage so primary actions, selected navigation and cards do not collapse into the same bright surface.
- Establish explicit tokens for canvas, standard card, raised card, sunken surface, interactive surface, selected state and inverse content.
- Verify normal and large text contrast for all high-risk pairs.
- Review borders, shadows and elevation as one scale rather than per-component decoration.
- Keep the approved woven L/S geometry and brand meaning unchanged.

### Batch 8B — theme control, sidebar and command surface

- Correct the Base UI menu composition so labels and radio items are inside the required group context.
- Add a focused regression test that opens the theme menu, selects Light, Dark and System, and confirms no console/runtime error.
- Confirm theme control parity in the public header, Control Room top bar, desktop sidebar and mobile navigation.
- Rebuild the desktop sidebar into explicit fixed and scrollable regions using `min-h-0`, `overflow-y-auto` and short-height behavior.
- Keep the brand and essential account context discoverable without duplicating large promotional cards.
- Redesign active navigation so icon, label and description remain readable in both modes and at forced-colour/high-contrast conditions.
- Replace the generic search trigger with an editorial command surface that communicates scope and useful shortcuts.
- Expand command results to real session records and operational destinations: products, orders, customers, holds, settings sections and recent actions.
- Preserve keyboard navigation, `Cmd/Ctrl + K`, search-empty state and predictable focus return.

### Batch 8C — Overview information architecture correction

- Create a responsibility matrix for every current Overview module before moving or deleting anything.
- Retain modules only when they answer a unique operational question.
- Merge the strongest structure from the legacy `main` Overview without copying its monolith or data assumptions.
- Use a compact daily strip for revenue, order volume, units and active holds.
- Make the attention/owner-judgment queue the primary desktop work surface.
- Add a useful recent/open-orders preview with product/customer context and direct detail access.
- Compose a desktop supporting rail for `Continue working`, hold clock, fulfilment exceptions and concise activity.
- Keep Sales Pulse only as the historical trend view; remove any duplicate revenue-summary role from nearby cards.
- Keep Inventory Watch only for actionable stock/publication exceptions.
- Prevent Activity Stream from repeating events already shown as attention items.
- Recompose tablet and mobile by task priority rather than moving the desktop rail below every full-size card.
- Preserve active-store and new-store truth, loading, empty and error boundaries.

### Batch 8D — Inventory visual and media correction

- Replace the fixed five-at-1280 rule with an adaptive minimum useful card width measured inside the actual content container.
- Target approximately four useful cards at a 1280px viewport with the desktop sidebar, five on larger desktops and six only when each card retains the approved minimum width.
- Define minimum card width and image height through browser assertions rather than viewport count alone.
- Redesign card anatomy around product image, status, name, price, stock summary and one clear record action.
- Increase readable type sizes and remove nonessential micro-copy from the primary card surface.
- Establish consistent card height and footer alignment without stretching sparse content awkwardly.
- Preserve one clear image-preview action and one clear product-record action.
- Add a dedicated table-thumbnail media trigger with accessible name, focus state and the shared image viewer.
- Keep row/product-name navigation separate from media preview.
- Confirm grid, table and mobile cards show the same inventory truth.

### Batch 8E — visual and interaction acceptance

- Run the complete raw-colour/token audit for Admin, Control Room and shared UI primitives.
- Verify the theme menu has no Base UI group-context error.
- Verify selected sidebar content and icon contrast in both themes.
- Validate sidebar behavior at short heights including 800px, 700px and 600px without unreachable content.
- Validate command search with keyboard navigation and real record results.
- Review every primary Admin route in Light and Dark.
- Validate Overview hierarchy at 375 × 812, 768 × 1024, 1280 × 800 and a wide desktop target.
- Assert Inventory minimum card width, image height, equal-row rhythm and no overflow.
- Verify table image preview opens media while product navigation still opens the record.
- Generate and review screenshots rather than only asserting DOM presence.
- Run ESLint, TypeScript, Vitest, production build and React Doctor.
- Run consolidated Phase 4–8 browser regression.

## Explicit exclusions

- TanStack Query or server-state migration; that belongs to Phase 9.
- Real API routes, database persistence, authentication or production caching.
- Restoring the legacy catch-all Admin page.
- Restoring legacy one-of-one-only inventory behavior.
- Rebuilding the entire public storefront body.
- Recreating the Concept Option 3 board as editable design-software layers.
- Adding decorative gradients, glass effects or animations without operational purpose.

## Acceptance criteria

- The theme menu opens and changes mode without a Base UI context error.
- Light, Dark and System remain persistent and keyboard accessible.
- No scoped Admin or shared UI component relies on a raw colour literal or manual theme patch where a semantic role applies.
- The dark theme has a deliberate canvas/panel/elevation hierarchy and does not display unexplained white cards.
- Primary action and selected-navigation colours reflect the Laitstyle Ink/Bone/Sage philosophy and meet contrast requirements.
- Sidebar navigation remains fully reachable at short viewport heights.
- Active sidebar icons, labels and descriptions are all readable.
- The command surface looks and behaves like an operational search tool, not a static navigation list.
- Overview modules have distinct responsibilities and no duplicated KPI or activity role.
- Useful hierarchy from `main` is integrated without restoring its monolith, raw colours or obsolete inventory assumptions.
- Inventory cards retain a professional minimum width, stronger image presence and readable typography.
- The 1280px layout does not force five undersized cards beside the desktop sidebar.
- Grid image, table image and product-record actions remain clearly separated.
- All required routes and interactions pass the light/dark responsive browser matrix.
- Phase 8 remains unaccepted until executable checks and visual review pass.

## Gate

Phase 8 implementation may begin only under the user’s explicit scope extension. Phase 9 must not begin until Phase 8 passes its executable and visual gate, unless the user explicitly overrides that gate again.

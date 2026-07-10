# Laitstyle Control Room V2 — Phase 8 Visual System, Shell and Inventory Correction

## Status

**Batches 8A–8F implemented. Consolidated executable and visual acceptance blocked.**

Application implementation head: `943424f606c5a22eabaff68b832bb6cf4a87376f`.

Phase 8 was extended by the user with a focused Inventory catalogue-hardening batch after the first end-to-end implementation. This does not mark Phase 4, Phase 5, Phase 6, Phase 7 or Phase 8 as accepted, does not resolve the missing workflow execution, and does not resolve the branch’s divergence from `main`.

## Refined implementation brief

Correct the Control Room as a premium fashion-operations product rather than applying another cosmetic theme pass. Use the approved Laitstyle Ink, Bone and Sage identity to create an editorial, calm and operationally dense visual system. Fix theme composition, navigation, command search, Overview hierarchy and the complete Inventory catalogue workflow.

The Inventory model must remain suitable for a single-seller fashion store:

- a unique piece represents one physical item and one unique internal reference;
- a stocked product represents interchangeable units under one catalogue SKU and quantity, such as 50 matching Adidas jeans;
- a variant product gives every sellable size, colour or option combination its own SKU and quantity;
- operational history must never be erased merely to remove a product from sale.

## Implemented batches

### Batch 8A — evidence-led theme system correction

- Added paired Light/Dark semantic roles for canvas, standard panel, raised panel, sunken surface, interactive surface, selected state and inverse content.
- Rebalanced Ink, Bone and Sage so primary actions and selected navigation do not become unexplained white blocks.
- Added action, control, border, focus, functional-state and elevation roles.
- Migrated high-risk shared primitives away from local dark-mode colour patches.
- Upgraded the source audit to require paired role declarations and reject scoped raw/manual dark colours.

Implementation record: `docs/control-room-v2/phase8-theme-audit.md`.

### Batch 8B — theme control, sidebar and command surface

- Moved the theme-menu label inside `DropdownMenuGroup`, correcting the known Base UI context composition.
- Retained persistent Light, Dark and System modes.
- Split sidebar composition into fixed header, internally scrollable navigation and fixed footer regions.
- Added readable selected icon, label and description states with focus and forced-colour boundaries.
- Replaced the generic search pill with a record-aware command surface.
- Added live products, open orders, customers, active holds, Settings sections and operating destinations.

### Batch 8C — Overview information architecture correction

- Created a durable responsibility matrix for each Overview module.
- Retained the daily strip only for current-day revenue, order volume, units and holds.
- Kept the attention queue as the primary owner-judgment surface.
- Added a connected open-orders preview.
- Positioned Continue Working, fulfilment and activity as supporting desktop rail content.
- Kept Sales Pulse for historical movement and Inventory Watch for actionable exceptions.
- Reused useful hierarchy from `main` without restoring its catch-all monolith or obsolete assumptions.

Implementation record: `docs/control-room-v2/phase8-overview-audit.md`.

### Batch 8D — Inventory visual and media correction

- Added separate grid-image, table-image and product-record interactions.
- Added the shared zoomable media viewer to table thumbnails.
- Improved image presence, title hierarchy, price and stock readability.
- Added equal-row card behavior and responsive media checks.

### Batch 8E — visual and interaction acceptance coverage

- Covers Light, Dark and System mode changes and runtime errors.
- Covers sidebar reachability at 800px, 700px and 600px.
- Covers live-record command search.
- Covers every primary Admin route in both themes.
- Covers Overview hierarchy and responsive overflow.
- Covers Inventory grid geometry, table media and product-record separation.
- Retains consolidated Phase 4–8 browser regressions and screenshots.

### Batch 8F — Inventory catalogue and product hardening

#### Grid and pagination

- Replaced the earlier four/six adaptive target with the user-approved five-column desktop grid.
- Reduced card height through a shorter `5/6` image ratio, fewer stacked metadata rows, compact stock figures and one aligned footer action.
- Added shared URL-backed pagination for grid, mobile cards and desktop table.
- Added 10, 15, 25 and 50 item page sizes, visible result ranges, page controls and page resets after filtering.

#### Managed categories and collections

- Added one session-owned catalogue taxonomy for categories and collections.
- Existing product categories and collections hydrate into managed choices.
- Added create, rename and delete management from Inventory and the product editor.
- Rename cascades to connected product records.
- Delete is blocked while a category or collection is in use.
- Category and collection are dropdowns in product forms and remain filterable in Inventory.

#### SKU and stock modeling

- Added deterministic collision-aware SKU generation.
- Unique pieces receive one unique internal reference.
- Stocked catalogue products use one SKU with a received quantity for interchangeable units.
- Variant option combinations receive independent SKUs and quantities.
- Stocked and variant forms display total received and available-stock context.
- Existing committed quantities cannot be silently reduced through product editing.

#### Media CRUD

- Supports up to 12 product images.
- Supports multiple local-file selection and remote image URLs.
- Remote URLs can be edited; images can be removed and reordered.
- Exactly one image is the featured storefront/grid cover.
- Detail and defect images remain distinct.
- Image descriptions, duplicate detection and URL validation are enforced before publishing.

#### Pricing

- Replaced unexplained “acquisition price” wording with optional **Unit cost** and plain-language guidance.
- Selling price remains the customer-facing source of truth.
- Compare-at price is optional and must be higher than selling price.
- Added a discount-percentage calculator that derives selling price from compare-at price without storing a second conflicting discount source.
- Added gross-margin and loss warnings while keeping unit cost private.

#### Safe product CRUD

- Product editing remains the canonical update flow.
- Archive unpublishes a product and clears selling channels while preserving stock and customer history.
- Restore returns an archived product as active but unpublished.
- Permanent deletion is blocked when orders, holds, stock movements, reviews, returns or customer saves exist.
- Only unused records can be permanently removed.

#### Added coverage

- SKU generation and collision tests.
- Category/collection create, rename, cascade, duplicate and in-use deletion tests.
- Product archive, restore, protected deletion and unused-draft deletion tests.
- Image, pricing and variant validation edge-case tests.
- Browser coverage for taxonomy CRUD, product dropdowns, SKU generation, multi-image preview, cover selection, stock preview, discount calculation, category filtering and grid/table pagination.

## Acceptance criteria state

- [x] Theme menu composition corrected in source
- [x] Light, Dark and System persistence retained
- [x] Paired semantic role system implemented
- [x] Sidebar internal scrolling and selected-state roles implemented
- [x] Record-aware command search implemented
- [x] Overview responsibilities separated
- [x] Five-column desktop Inventory grid implemented
- [x] Compact professional card anatomy implemented
- [x] Grid and table pagination implemented
- [x] Category and collection dropdown CRUD implemented
- [x] SKU and stock-mode semantics implemented
- [x] Multi-image URL/file CRUD and featured-cover selection implemented
- [x] Pricing terminology and discount computation implemented
- [x] Safe product archive, restore and delete behavior implemented
- [x] Consolidated acceptance scripts and screenshots wired
- [ ] ESLint executed on the final Phase 8 head
- [ ] TypeScript executed on the final Phase 8 head
- [ ] Vitest executed on the final Phase 8 head
- [ ] Theme audit executed on the final Phase 8 head
- [ ] Production build executed on the final Phase 8 head
- [ ] React Doctor executed on the final Phase 8 head
- [ ] Browser regressions executed on the final Phase 8 head
- [ ] Generated screenshots reviewed
- [ ] Phase 8 accepted

## Explicit exclusions preserved

- TanStack Query or server-state migration; that belongs to Phase 9.
- Real API routes, database persistence, authentication, object storage or production caching.
- Per-unit serial numbers for interchangeable stocked units.
- Restoring the legacy catch-all Admin page.
- Rebuilding the full public storefront body.

## Blocker and gate

GitHub has not produced executable final-head evidence for the private-repository workflow, and no local worktree is available in the current environment. Exact evidence remains recorded in `docs/control-room-v2/phase8-blocker.md`.

Phase 8 is implemented but not accepted. Phase 9 must not start until the consolidated Phase 8 gate passes unless the user explicitly overrides it. PR #4 remains draft and non-review-ready.

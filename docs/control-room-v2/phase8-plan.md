# Laitstyle Control Room V2 — Phase 8 Visual System, Shell and Overview Correction

## Status

**Batches 8A–8D implemented. Batch 8E coverage encoded. Executable and visual acceptance blocked.**

Application implementation head: `df3b6c988d7b8843f033b0fc5ddd52473830d2d8`.

Phase 8 was completed under the user’s explicit end-to-end implementation instruction. It does not mark Phase 4, Phase 5, Phase 6, Phase 7 or Phase 8 as accepted, does not resolve the missing workflow execution, and does not resolve the branch’s divergence from `main`.

## Refined implementation brief

Correct the Control Room as a premium fashion-operations product rather than applying another cosmetic theme pass. Use the approved Laitstyle Ink, Bone and Sage identity to create an editorial, calm and operationally dense visual system. Fix the broken Base UI theme menu, selected-navigation contrast, dark-mode surface hierarchy, sidebar overflow, command/search quality, Overview information architecture and Inventory presentation.

Reuse the strongest queue, open-orders and supporting-rail hierarchy from the legacy Overview on `main` only where it improves task flow. Do not restore the legacy monolith, raw colours, obsolete navigation or one-of-one-only assumptions.

## Verified problems addressed

### Theme and component composition

- Base UI `GroupLabel` was outside the required group context.
- Dark mode promoted Bone to generic primary and selected surfaces.
- The first token pass did not distinguish standard, raised, sunken, interactive and selected roles clearly enough.
- Shared primitives still depended on component-level mode patches.

### Shell and navigation

- Sidebar content used a fixed viewport stack without an internal scroll boundary.
- Navigation, theme, storefront and account content competed vertically.
- Selected navigation nested conflicting light surfaces.
- Command search behaved mainly as a static destination list.

### Overview

- Too many modules received equal full-width prominence.
- Daily summary, attention, fulfilment and activity responsibilities overlapped.
- There was no useful open-order preview on the command centre.

### Inventory

- Five fixed columns at 1280px ignored the 280px sidebar.
- Cards had insufficient image presence and very small operational type.
- Card height and footer alignment lacked consistent rhythm.
- Table thumbnails could not open the shared media viewer independently.

## Implemented batches

### Batch 8A — evidence-led theme system correction

- Added paired Light/Dark semantic roles for canvas, standard panel, raised panel, sunken surface, interactive surface, selected state and inverse content.
- Rebalanced Ink, Bone and Sage so primary actions and selected navigation do not become unexplained white blocks.
- Added explicit primary/secondary action, control, border and focus roles.
- Added distinct success, warning and destructive surface/foreground pairs.
- Added a three-level elevation scale.
- Migrated high-risk shared primitives away from local dark-mode colour patches.
- Upgraded the source audit to require paired role declarations and reject scoped raw/manual dark colours.

Implementation record: `docs/control-room-v2/phase8-theme-audit.md`.

### Batch 8B — theme control, sidebar and command surface

- Moved the theme-menu label inside `DropdownMenuGroup`, correcting the known Base UI context composition.
- Kept persistent Light, Dark and System options through the existing root theme controller.
- Split sidebar composition into fixed header, internally scrollable navigation and fixed footer regions.
- Removed the oversized duplicated storefront promotion in favour of compact operational links.
- Added readable selected icon, label and description states with focus and forced-colour boundaries.
- Replaced the generic search pill with an editorial command trigger.
- Added live session results for products, open orders, customers, active holds, Settings sections and operating destinations.
- Preserved `Cmd/Ctrl + K`, keyboard selection, search-empty feedback and focus return through the existing command/dialog primitives.

### Batch 8C — Overview information architecture correction

- Created a durable responsibility matrix for each Overview module.
- Retained the daily strip only for current-day revenue, order volume, units and holds.
- Kept the attention queue as the primary owner-judgment surface.
- Added a connected open-orders preview with product image, customer, status, location, value and detail navigation.
- Positioned Continue Working, fulfilment and activity as supporting desktop rail content.
- Kept Sales Pulse only for historical online/offline movement.
- Kept Inventory Watch only for actionable stock/publication exceptions.
- Reordered smaller screens by task priority rather than desktop column order.
- Reused information hierarchy from `main` without restoring its catch-all monolith or obsolete data assumptions.

Implementation record: `docs/control-room-v2/phase8-overview-audit.md`.

### Batch 8D — Inventory visual and media correction

- Replaced fixed breakpoint counts with an `auto-fill` grid and 220px minimum useful card width.
- Targets four useful cards at the 1280px/sidebar layout and six only when wide content space supports them.
- Increased image height, product-title size, price hierarchy and stock readability.
- Added consistent minimum height, flexible body growth and aligned footers.
- Preserved one image-preview action and one product-record action.
- Added an accessible table-thumbnail preview trigger that opens the same shared media viewer.
- Kept row/product-name navigation separate from media preview.

### Batch 8E — visual and interaction acceptance coverage

- Updated the existing theme/media regression to assert four useful cards at 1280px, six on wide desktop, minimum card width, minimum image height and equal-row rhythm.
- Added `scripts/control-room-phase8-check.mjs` covering:
  - Light, Dark and System changes,
  - Base UI/runtime console errors,
  - live record command search,
  - sidebar reachability at 800px, 700px and 600px,
  - Overview hierarchy and responsive overflow,
  - Overview light/dark/tablet/mobile screenshots,
  - table image preview versus product-record navigation.
- Wired Phase 8 into the consolidated workflow and screenshot artifacts.
- Retained the full Light/Dark route matrix and earlier Phase 4–7 browser regressions.

## Acceptance criteria state

- [x] Theme menu composition corrected in source
- [x] Light, Dark and System persistence retained
- [x] Paired semantic role system implemented
- [x] Scoped source guard upgraded
- [x] Sidebar internal scrolling implemented
- [x] Selected navigation roles corrected
- [x] Record-aware command search implemented
- [x] Overview responsibilities separated
- [x] Open-orders preview implemented
- [x] Adaptive Inventory grid implemented
- [x] Professional card anatomy implemented
- [x] Table media preview implemented
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
- Real API routes, database persistence, authentication or production caching.
- Restoring the legacy catch-all Admin page.
- Restoring one-of-one-only inventory behaviour.
- Rebuilding the full public storefront body.
- Recreating the Concept Option 3 board as editable design-software layers.
- Decorative gradients, glass effects or animation without operational purpose.

## Blocker and gate

GitHub returned no workflow run or combined commit status for the final application head, and the available container could not resolve `github.com` to create a local worktree. Exact evidence is recorded in `docs/control-room-v2/phase8-blocker.md`.

Phase 8 is implemented but not accepted. Phase 9 must not start until the consolidated Phase 8 executable and visual gate passes unless the user explicitly overrides that gate again. PR #4 remains draft and non-review-ready.

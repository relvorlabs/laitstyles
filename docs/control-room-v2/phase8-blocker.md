# Phase 8 Acceptance Blocker

**Phase:** 8 — Visual System, Shell, Overview and Inventory Correction  
**Final compact-gallery implementation head:** `5398b7449a59bcfbd6d497e5f47208f78abc2f6c`  
**Status:** implementation complete with final gallery correction; executable and visual acceptance blocked

## Implemented scope

### 8A — theme roles and shared primitives

- Paired Light/Dark semantic role system for canvas, panels, raised, sunken, interactive, selected and inverse surfaces.
- Sage-led dark primary action and selected navigation rather than bright Bone/white blocks.
- Shared primitive migration away from local colour patches.
- Paired success, warning and destructive roles plus a three-level elevation scale.
- Static source guard requiring paired role declarations and rejecting scoped raw/manual dark colours.

### 8B — theme control, sidebar and command surface

- Corrected the Base UI menu-group composition error.
- Retained persistent Light, Dark and System choices.
- Added fixed header/footer and internal sidebar scrolling.
- Corrected selected-navigation icon, label and description contrast.
- Added a record-aware command surface for products, orders, customers, holds, Settings and destinations.

### 8C — Overview information architecture

- Added a durable module-responsibility audit.
- Kept the daily strip as current-state summary and the attention queue as the primary owner-judgment surface.
- Added connected open-order rows.
- Moved Continue Working, fulfilment and activity into supporting desktop rail positions.
- Kept Sales Pulse for historical movement and Inventory Watch for exceptions.
- Reused useful hierarchy from `main` without restoring its monolith or obsolete assumptions.

### 8D — Inventory presentation and media

- Preserved separate grid-image, table-image and record interactions.
- Added table access to the shared image viewer.
- Improved imagery, title, price, stock and row rhythm.

### 8E — encoded acceptance

- Theme menu and console/runtime checks.
- Sidebar checks at 800px, 700px and 600px heights.
- Live-record command search.
- Light/Dark Admin route matrix.
- Overview hierarchy, responsive overflow and screenshots.
- Inventory geometry, media and record-navigation checks.
- Consolidated Phase 4–8 workflow and artifacts.

### 8F — Inventory catalogue and product hardening

- Five-column desktop grid and URL-backed pagination shared by grid, mobile list and table.
- Managed category and collection CRUD with protected deletion and active-editor synchronization.
- Collision-aware product references and readable variant SKUs.
- Explicit unique-piece, interchangeable-stock and variant-stock semantics.
- Up to 12 images with file/URL CRUD and one featured cover.
- Optional Unit cost, Compare-at price validation, discount computation and margin warnings.
- Safe archive and restore with protected permanent deletion.

### Final gallery-card correction

- Retained exactly five cards per desktop row.
- Replaced the tall portrait `5/6` media area with a compact `4/3` gallery image.
- Removed the descriptor row, three-column stock block and separate footer.
- Reduced the information area to product identity, price, availability and one record action.
- Preserved media preview, selection, health status and inventory-alert visibility.
- Updated `scripts/control-room-inventory-catalogue-check.mjs` to reject a card above 290px at `1440×900`.
- Added an image-ratio assertion and `inventory-compact-gallery-1440x900.png` screenshot target.

## Missing executable evidence

No executable workflow or local worktree result exists for the compact-gallery head or the subsequent Phase 9 foundation.

Therefore none of these checks is represented as executed or passed:

- ESLint
- TypeScript
- Vitest
- static theme-role audit
- production build
- React Doctor
- Base UI theme-menu runtime regression
- sidebar short-height checks
- command search checks
- Light/Dark route matrix
- Overview responsive screenshots and visual review
- five-column compact-gallery geometry and height checks
- compact-gallery screenshot review
- grid and table pagination checks
- category and collection CRUD browser flow
- SKU generation, multi-image, stock and discount browser flow
- table media interaction
- consolidated Phase 4–8 browser regression

The absence of a run is not evidence that the implementation passed or failed.

## Local environment limitation

The available execution environment has no usable repository worktree for local lint, type, test, build or browser execution. No local result is being invented.

## Merge blocker

PR #4 remains draft and GitHub reports it as non-mergeable. The branch is 703 commits ahead and 31 commits behind `main`; the merge base is `4483156669a2b6f43218d5e27f484562ccc08a8d` and current `main` is `60ee6d199de04b1ebc0edf8da3ee9c6128f0ae20`.

Upstream integration must use reviewed conflict resolution rather than an `ours` or tree-only merge.

## Gate decision

- Phase 8 implementation complete, including compact gallery correction: **Yes**
- Phase 8 accepted: **No**
- Phase 9 started under explicit override: **Yes**
- PR ready for review: **No**
- PR remains draft: **Yes**

# Phase 8 Acceptance Blocker

**Phase:** 8 — Visual System, Shell, Overview and Inventory Correction  
**Application implementation head:** `943424f606c5a22eabaff68b832bb6cf4a87376f`  
**Status:** fully implemented through Batch 8F; executable and visual acceptance blocked

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

- Five-column desktop grid with shorter cards and a compact `5/6` product-image ratio.
- URL-backed pagination shared by grid, mobile list and table, with 10/15/25/50 page sizes.
- Managed category and collection CRUD with rename cascading and protected in-use deletion.
- Category and collection dropdowns in product forms and filters in Inventory.
- Collision-aware product and variant SKU generation.
- Explicit unique-piece, interchangeable-stock and variant-stock semantics.
- Received and available-stock previews while editing.
- Up to 12 images with multiple selection, URL editing, live preview, reorder, remove, defect/detail roles and one featured cover.
- Optional Unit cost wording, Compare-at price validation, discount computation and margin warnings.
- Safe product archive and restore; permanent deletion blocked when operational or customer history exists.
- Added unit tests and `scripts/control-room-inventory-catalogue-check.mjs` for the complete catalogue flow.

## Missing executable evidence

GitHub has not returned a pull-request workflow run or combined commit statuses for the final Inventory catalogue implementation head.

Therefore none of these checks is represented as executed or passed on the final implementation:

- ESLint
- TypeScript
- Vitest, including taxonomy, SKU, lifecycle and editor edge-case tests
- static theme-role audit
- production build
- React Doctor
- Base UI theme-menu runtime regression
- sidebar short-height checks
- command search checks
- Light/Dark route matrix
- Overview responsive screenshots and visual review
- five-column card geometry and height checks
- grid and table pagination checks
- category and collection CRUD browser flow
- SKU generation, multi-image, stock and discount browser flow
- table media interaction
- consolidated Phase 4–8 browser regression

The absence of a run is not evidence that the implementation passed or failed.

## Local environment limitation

The available execution environment has no usable repository worktree for local lint, type, test, build or browser execution. No local result is being invented.

## Merge blocker

PR #4 remains draft and GitHub reports it as non-mergeable because the feature branch remains diverged from and behind `main`. Upstream integration must use reviewed conflict resolution rather than an `ours` or tree-only merge.

## Gate decision

- Phase 8 implementation complete through 8F: **Yes**
- Phase 8 accepted: **No**
- Phase 9 started: **No**
- PR ready for review: **No**
- PR remains draft: **Yes**

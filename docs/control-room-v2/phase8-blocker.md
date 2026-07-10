# Phase 8 Acceptance Blocker

**Phase:** 8 — Visual System, Shell, Overview and Inventory Correction  
**Application implementation head:** `df3b6c988d7b8843f033b0fc5ddd52473830d2d8`  
**Status:** fully implemented; executable and visual acceptance blocked

## Implemented scope

### 8A — theme roles and shared primitives

- Paired Light/Dark semantic role system for canvas, panels, raised, sunken, interactive, selected and inverse surfaces.
- Sage-led dark primary action and selected navigation rather than bright Bone/white blocks.
- Shared primitive migration away from local colour patches.
- Paired success, warning and destructive surface/foreground roles.
- Three-level elevation scale.
- Static source guard requiring paired role declarations and rejecting scoped raw/manual dark colours.

### 8B — theme control, sidebar and command surface

- Base UI theme menu label now renders inside `DropdownMenuGroup`, removing the known missing `MenuGroupContext` composition error.
- Light, Dark and System options remain persistent through the existing root theme provider.
- Desktop and mobile sidebar now use fixed header/footer regions with an internal `min-h-0` scroll boundary.
- The large duplicated storefront promotion was replaced by compact operational links.
- Selected navigation uses one Sage-led surface with readable icon, label and description roles.
- Added focus and forced-colour boundaries.
- Rebuilt the command trigger as an editorial search surface.
- Command results now include live session products, open orders, customers, active holds, Settings sections and operating destinations.

### 8C — Overview information architecture

- Added a durable module-responsibility audit.
- Kept the daily strip as a compact current-state summary.
- Retained the attention queue as the primary owner-judgment surface.
- Added connected open-order rows with product, customer, status, location and value context.
- Moved Continue Working, fulfilment and activity into supporting desktop rail positions.
- Kept Sales Pulse only for historical movement and Inventory Watch only for exceptions.
- Reordered tablet/mobile composition by task priority.
- Reused the stronger queue/orders/right-rail hierarchy from `main` without restoring its monolith or obsolete one-of-one assumptions.

### 8D — Inventory presentation and media

- Replaced fixed viewport breakpoints with `auto-fill` and a 220px minimum useful card width.
- Targets four useful cards at the 1280px/sidebar layout and six only on sufficiently wide screens.
- Increased image presence, title size, price hierarchy and stock readability.
- Added consistent minimum card height, flexible content and aligned footers.
- Preserved separate image-preview and product-record actions.
- Added an accessible table-thumbnail media trigger using the existing shared media viewer.

### 8E — encoded acceptance

- Updated the prior theme/media regression for the new adaptive grid.
- Added `scripts/control-room-phase8-check.mjs` covering:
  - Light, Dark and System menu changes,
  - Base UI/runtime console errors,
  - live record command search,
  - sidebar reachability at 800px, 700px and 600px heights,
  - Overview desktop hierarchy,
  - Overview mobile/tablet overflow and screenshots,
  - Inventory minimum card width, image height and equal-row rhythm,
  - table media preview versus record navigation.
- Wired Phase 8 into the consolidated workflow and screenshot artifacts.

## Missing executable evidence

GitHub returned no pull-request workflow run for the final Phase 8 application head and no combined commit statuses.

Therefore none of these checks has executed on the final implementation head:

- ESLint
- TypeScript
- Vitest
- static theme-role audit
- production build
- React Doctor
- Base UI theme-menu runtime regression
- sidebar short-height checks
- command search checks
- light/dark route matrix
- Overview responsive screenshots and visual review
- Inventory card geometry assertions
- table media interaction
- consolidated Phase 4–8 browser regression

The absence of a run is not evidence that the implementation passed or failed.

## Local environment limitation

The available container could not resolve `github.com`, so a worktree could not be cloned for local execution. No local test result is being invented.

## Merge blocker

PR #4 remains draft and GitHub reports it as non-mergeable because the feature branch remains diverged from and behind `main`. Upstream integration must use reviewed conflict resolution rather than an `ours` or tree-only merge.

## Gate decision

- Phase 8 implementation complete: **Yes**
- Phase 8 accepted: **No**
- Phase 9 started: **No**
- PR ready for review: **No**
- PR remains draft: **Yes**

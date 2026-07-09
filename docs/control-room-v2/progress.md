# Laitstyle Control Room V2 — Progress Tracker

## Current score

**Phase 2 of 7 complete — Inventory domain and responsive workspace**

## Current phase

| Field | Value |
| --- | --- |
| Status | Complete |
| Branch | `feat/control-room-v2` |
| Pull request | `#4` — draft |
| Source specification | `docs/control-room-v2/spec.md` |
| Execution plan | `docs/control-room-v2/implementation-plan.md` |
| Architecture decisions | `docs/control-room-v2/decisions.md` |
| Next phase | Phase 3 — not started |

## Completed phases

### Phase 0 — Discovery, specification and execution contract

- [x] Product and UX specification
- [x] Gated implementation plan and progress tracker
- [x] Durable `AGENTS.md` skill, architecture and verification contract
- [x] Dedicated branch and draft pull request

### Phase 1 — Control Room foundation, shell and Overview

- [x] Route-level Admin shell and adaptive navigation
- [x] Active-store and new-store Overview states
- [x] Connected operational selectors and deterministic records
- [x] Loading and error boundaries
- [x] Legacy Admin catch-all monolith removed
- [x] Lint, TypeScript, tests, production build, Playwright and React Doctor gate

### Phase 2 — Inventory domain and responsive workspace

Implemented:

- Full discriminated Inventory model for unique, stocked and variant products
- Media, measurements, channels, costs, reference prices and variant-level pricing boundaries
- Quantity invariants and typed validation results
- Cross-record integrity validation for products, references, stock movements and reviews
- Deterministic stock movements, reviews, holds, orders and activity joins
- `/admin/inventory` route with loading and error boundaries
- Saved Inventory views
- Search, filters and sorting
- Deep-linkable Inventory query, presentation and selected product state
- Storefront-aligned visual grid
- Desktop operational table using the existing shadcn `Table`
- Mobile operational cards instead of a compressed desktop table
- Shared ordered result set across grid, table and mobile cards
- Product detail workspace with Summary, Stock/variants, Media, Pricing, Orders, Holds, Movements, Returns/damage, Reviews and Activity
- Selection, select-visible, clear selection and real CSV export
- Export success feedback announced with `aria-live`
- Inventory navigation in desktop, mobile and command search
- Overview attention and resume links connected to real Inventory saved views
- Meaningful default, no-result, loading, error and success states

## Phase 2 table architecture decision

Decision 001 is accepted in `docs/control-room-v2/decisions.md`.

**Decision:** do not add TanStack Table or TanStack Query in Phase 2.

Use:

```text
Inventory query state
        ↓
Typed selectors
        ↓
One ordered result set
   ↙        ↓        ↘
Grid      Table     Mobile cards
```

Reasons:

- Laitstyle inventory remains product-led and image-first like the storefront.
- The current prototype has no server pagination, grouping, resizing, dynamic columns or virtualization requirement.
- The existing shadcn Table supports the fixed operational comparison view.
- A TanStack row model would add a second abstraction without proportional value.
- The decision must be revisited when real server data, pagination or inventory volume creates those requirements.

## Phase 2 exclusions respected

- No add-product or edit-product wizard
- No Intake mutations
- No media upload/storage
- No backend persistence
- No publish, unpublish, archive or collection-assignment mutations
- No order or hold management
- No offline-sale recording
- No Customers workspace
- No Settings forms
- No Collections route
- No TanStack dependency
- No Cache Components
- No premature pagination or virtualization

The required persistent Add product action remains intentionally absent until the complete Phase 3 wizard exists. No dead action was exposed.

## Phase 2 acceptance checklist

- [x] Specification, plan, tracker and `AGENTS.md` reloaded
- [x] Current PR feedback inspected; no comments or unresolved review threads
- [x] Relevant current skills reloaded
- [x] Storefront product model and visual language inspected
- [x] Existing shadcn Table inspected
- [x] TanStack decision recorded before table implementation
- [x] Inventory types cover unique, stocked and variant products without optional-field sprawl
- [x] Quantity invariants prevent impossible stock totals
- [x] Stock movement and related operational records exist
- [x] Inventory route and route boundaries exist
- [x] Saved views, search, filters and sorting operate on one result set
- [x] Grid, desktop table and mobile cards show the same inventory truth
- [x] Botanical Jeans shows 50 received, 29 available, 3 reserved and 18 sold
- [x] Unique pieces remain quantity-one records
- [x] Variant products expose per-variant availability
- [x] Product detail sheet exposes every required read-only operational section
- [x] Bulk export and clear-selection actions work without fake persistence
- [x] Empty and no-results states are distinct and useful
- [x] Inventory is available in desktop, mobile and command navigation
- [x] No Add product action is exposed before the Phase 3 wizard exists
- [x] No horizontal desktop table is forced onto mobile
- [x] No feature file became a replacement monolith
- [x] Latest Web Interface Guidelines review passes
- [x] ESLint passes
- [x] TypeScript passes
- [x] Available tests pass
- [x] Production build passes
- [x] React Doctor changed-scope analysis passes at 100/100
- [x] Playwright renders pass at 375 × 812, 768 × 1024 and 1280 × 800
- [x] Grid, table and product-detail screenshots were visually inspected
- [x] The first desktop detail defect was corrected and the full gate rerun
- [x] PR body and this tracker are updated before Phase 3 begins

## Phase 2 verification evidence

GitHub Actions run `29021124884` passed on application head `ab1dc9df7b4bf3ba9c3db1911d511c153de1f31d`:

- pnpm frozen-lockfile installation
- ESLint
- `tsc --noEmit`
- Inventory and URL-state Vitest suites
- Next.js production build
- Playwright Chromium production rendering
- React Doctor changed-scope analysis
- Final required-check enforcement

React Doctor result: **100/100 — no issues found.**

Playwright rendered and uploaded:

- Active Overview — 375 × 812, 768 × 1024 and 1280 × 800
- New-store Overview — 375 × 812, 768 × 1024 and 1280 × 800
- Inventory grid — 375 × 812, 768 × 1024 and 1280 × 800
- Inventory table — 1280 × 800
- Botanical Jeans detail workspace — 375 × 812 and 1280 × 800

### Screenshot-driven correction

The first production render exposed a real desktop defect: Base UI’s default `sm:max-w-sm` kept the product sheet at roughly 384px and crushed the Summary column. The sheet width was explicitly corrected, catalogue panels were split, the Summary image column was balanced, and the complete gate was rerun. The accepted desktop detail render now shows a readable wide product workspace; mobile remains stacked and task-focused.

Chrome DevTools MCP was unavailable, so no DevTools-specific console, network or performance claim is made. Browser evidence is the successful production Playwright matrix above.

## Phase 2 implementation structure

### Domain and validation

- `inventory-types.ts`
- `inventory-constants.ts`
- `inventory-derivations.ts`
- `inventory-query.ts`
- `inventory-validation-types.ts`
- `inventory-product-validation.ts`
- `inventory-validation.ts`
- `inventory-selectors.ts` public façade
- `result.ts`

### Inventory feature

Inventory routing, controls, URL state, grid, table, mobile cards, selection/export and product-detail sections are split into focused files under `src/features/control-room/inventory/`. The largest controller file remains below the repository’s review threshold and does not own domain data or validation.

## Blockers

None for the completed Phase 2 scope.

## Next phase gate

Phase 3 is **not started**. It is limited to the complete Add-product wizard and Intake queue described in the implementation plan. Before Phase 3 code begins, the specification, plan, tracker, relevant skills, current PR feedback and repository state must be reloaded.

# Laitstyle Control Room V2 — Progress Tracker

## Current score

**Phase 2 of 7 — Inventory domain and responsive workspace**

## Current phase

| Field | Value |
| --- | --- |
| Status | In progress |
| Branch | `feat/control-room-v2` |
| Pull request | `#4` — draft |
| Source specification | `docs/control-room-v2/spec.md` |
| Execution plan | `docs/control-room-v2/implementation-plan.md` |
| Architecture decisions | `docs/control-room-v2/decisions.md` |

## Completed phases

### Phase 0 — Discovery, specification and execution contract

- [x] Existing Control Room architecture inspected
- [x] Requested skills searched and available skills loaded
- [x] Missing dedicated TanStack skill recorded without fabrication
- [x] Product and UX specification committed and reloaded
- [x] Phased plan derived from the committed specification and reloaded
- [x] `AGENTS.md` updated with durable skill and phase rules
- [x] Draft pull request `#4` opened
- [x] Pull request body records Phase 0 scope and the next-phase gate
- [x] No Control Room UI code entered Phase 0

### Phase 1 — Control Room foundation, shell and Overview

- [x] Route-based Admin layout and Overview page
- [x] Editorial desktop sidebar and adaptive mobile navigation
- [x] Working command bar and Overview search
- [x] Typed unique, stocked and variant inventory foundation
- [x] Connected active-store and new-store Overview states
- [x] Loading and route error boundaries
- [x] Legacy Admin catch-all monolith removed
- [x] Lint, TypeScript, tests, build, Playwright and React Doctor gates passed
- [x] Six final screenshots inspected at the required viewports

## Phase 2 scope

- Complete discriminated inventory product types required by the Inventory workspace
- Inventory quantity invariants and typed selectors
- Stock movement, review, media and product activity seed records
- `/admin/inventory` route
- Inventory loading and error boundaries
- Saved views: All, Live, Drafts, Intake, Low stock, Out of stock, Held, Sold, Unpublished and Needs attention
- Search across product name, archive number, SKU, category, brand and variants
- Product-mode, stock-status, category, collection and channel filters
- Sort by recently updated, stock, sales, price and name
- Visual product grid aligned with the storefront’s editorial product language
- Operational desktop table
- Mobile operational cards instead of a compressed table
- Shared result set across grid, table and mobile cards
- Read-only product detail sheet with Summary, Stock/variants, Media, Pricing, Orders, Holds, Movements, Reviews and Activity
- Row selection and truthful non-destructive bulk actions
- Inventory navigation exposed only after the route is complete
- Default, empty, loading, error and export-success feedback

## Phase 2 exclusions

- Add-product or edit-product wizard
- Intake stage mutations
- Media upload/storage
- Persisted backend stock mutations
- Publish/unpublish/archive actions
- Collection assignment mutations
- Order and hold management
- Offline-sale recording
- Customers workspace
- Settings forms
- Collections route unless Inventory is fully complete and the route can be delivered without weakening it
- TanStack Table
- TanStack Query
- Cache Components
- Pagination or virtualization without demonstrated data volume

## Table architecture decision

Decision 001 is accepted in `docs/control-room-v2/decisions.md`:

- Use the existing shadcn `Table`.
- Use one typed query/selector pipeline for grid, table and mobile cards.
- Keep the table a secondary desktop operational lens.
- Do not introduce TanStack for static local data without server pagination, grouping, dynamic columns, resizing or virtualization.
- Revisit the decision when real server data or higher inventory volume creates those requirements.

## Phase 2 acceptance checklist

- [x] Specification, plan, tracker and `AGENTS.md` reloaded
- [x] Current PR feedback inspected; no comments or unresolved review threads
- [x] Relevant current skills reloaded
- [x] Storefront product model and visual language inspected
- [x] Existing shadcn Table inspected
- [x] TanStack decision recorded before table implementation
- [ ] Inventory types cover unique, stocked and variant products without optional-field sprawl
- [ ] Quantity invariants prevent impossible stock totals in selectors
- [ ] Stock movement and related operational records exist
- [ ] Inventory route and route boundaries exist
- [ ] Saved views, search, filters and sorting operate on one result set
- [ ] Grid, desktop table and mobile cards show the same inventory truth
- [ ] Botanical Jeans shows 50 received, 29 available, 3 reserved and 18 sold
- [ ] Unique pieces remain quantity-one records
- [ ] Variant products expose per-variant availability
- [ ] Product detail sheet exposes every required read-only operational section
- [ ] Bulk export and clear-selection actions work without fake persistence
- [ ] Empty and no-results states are distinct and useful
- [ ] Inventory is added to desktop and mobile navigation only after route completion
- [ ] No Add product action is exposed before the Phase 3 wizard exists
- [ ] No horizontal desktop table is forced onto mobile
- [ ] No feature file becomes a replacement monolith
- [ ] Latest Web Interface Guidelines review passes
- [ ] ESLint passes
- [ ] TypeScript passes
- [ ] Available tests pass
- [ ] Production build passes
- [ ] React Doctor changed-scope errors are resolved
- [ ] Playwright renders pass at 375 × 812, 768 × 1024 and 1280 × 800
- [ ] Final screenshots are visually inspected
- [ ] PR body and this tracker are updated before Phase 3 begins

## Phase 2 implementation batches

### Batch 2A — Inventory domain and selectors

- Extend product types and related records
- Add quantity validation and derived inventory status
- Add shared query, saved-view, filtering and sorting selectors
- Expand deterministic seed data
- Add focused unit tests for invariants and selectors

### Batch 2B — Inventory route and responsive browsing workspace

- Route boundaries
- Inventory header and summary
- Saved views and filter controls
- Storefront-aligned grid
- Desktop table
- Mobile cards
- Selection and export feedback

### Batch 2C — Product detail workspace and integration

- Read-only detail sheet and operational tabs
- Product, order, hold, movement, review and activity joins
- Shell navigation and command-search integration
- Empty/error/success state polish

### Batch 2D — Verification and visual QA

- Guideline audit
- Lint, TypeScript, tests and build
- React Doctor changed-scope review
- Playwright render pass
- Screenshot inspection and corrections
- Tracker and PR update

## Skill activation record for Phase 2

Reloaded from `relvorlabs/agent-controller`:

- `using-superpowers`
- `find-skills`
- `product-designer`
- `shadcn`
- `frontend-design`
- `ui-ux-pro-max`
- `next-best-practices`
- `vercel-react-best-practices`

The remaining mandatory implementation and completion skills are reloaded before their applicable batches and verification gate.

## Blockers

None at the start of Phase 2.

## Next phase gate

Phase 3 may not begin until every Phase 2 acceptance item is complete or an explicit blocker is recorded and accepted in the draft PR.

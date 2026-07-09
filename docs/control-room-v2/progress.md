# Laitstyle Control Room V2 — Progress Tracker

## Current score

**Phase 4 of 7 in progress — Sales workspace**

Active batch: **4B — Orders workspace**.

## Current phase

| Field | Value |
| --- | --- |
| Status | In progress |
| Branch | `feat/control-room-v2` |
| Pull request | `#4` — draft |
| Source specification | `docs/control-room-v2/spec.md` |
| Execution plan | `docs/control-room-v2/implementation-plan.md` |
| Phase 4 plan | `docs/control-room-v2/phase4-plan.md` |
| Architecture decisions | `docs/control-room-v2/decisions.md` |
| Accepted Batch 4A head | `2b14028c4e60c3395a9bbe819506adca8bfdcae1` |
| Accepted Batch 4A run | `29044424035` |
| Active batch | 4B — Orders workspace |
| Next batch | 4C — blocked until 4B passes |
| Next phase | Phase 5 — blocked until Phase 4 is complete |

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
- [x] Full lint, TypeScript, tests, production build, Playwright and React Doctor gate

### Phase 2 — Inventory domain and responsive workspace

- [x] Unique, stocked and variant inventory model
- [x] Quantity invariants and cross-record validation
- [x] Saved views, search, filters and sorting
- [x] Storefront-aligned grid, desktop table and mobile cards
- [x] Deep-linkable product detail workspace
- [x] Real CSV export and selection feedback
- [x] Responsive browser matrix and screenshot-driven corrections
- [x] React Doctor 100/100

Final Phase 2 application verification: GitHub Actions run `29021779448` on `b5ad5c64a906cef216a6b8e441893d095b09e4ff`.

### Phase 3 — Add-product wizard and Intake queue

- [x] Seven-step unique, stocked and variant product editor
- [x] React Hook Form and Zod validation
- [x] Back/Next preservation and dirty-close confirmation
- [x] Session-only media controls
- [x] Draft, publish and schedule actions
- [x] Existing-product editing
- [x] Connected Intake queue and adjacent transitions
- [x] Explicit subscribed catalogue store
- [x] Live Inventory updates after draft save
- [x] Full-viewport mobile editor
- [x] 30 tests, production build, browser interactions and React Doctor 100/100

Final Phase 3 application verification: GitHub Actions run `29035766157` on `ba05d413d62154f1b41a415e5d31003bdf2c20f1`.

## Phase 4 locked scope

### Goal

Connect Orders, Holds, Offline Sales and Returns to the same inventory, revenue, customer and activity truth.

### In scope

- Orders route and status views
- Order detail and timeline
- Permitted order transitions
- Holds route and risk views
- Extend, release and convert-hold actions
- Global Record Sale dialog
- Product/variant and quantity validation
- Channel, customer and payment capture
- Connected offline-sale action
- Returns route and return/refund states
- Typed Result errors
- Loading, empty, error, success and confirmation states

### Out of scope

- Real payment capture
- Courier integration
- Messaging integration
- Production refunds
- Backend, database, API or auth work
- Phase 5 customer workspace
- Supplier, accounting, warehouse or multi-store expansion

## Phase 4 batches

### Batch 4A — sales domain and typed actions — accepted

- [x] Focused sales domain types
- [x] Expanded connected order, hold and return records
- [x] Explicit order transition graph
- [x] Atomic stock reserve, release, sale, cancellation and return helpers
- [x] Payment-confirmed orders own sold stock
- [x] Typed order transition action
- [x] Typed hold extend/release/convert actions
- [x] Typed offline-sale action
- [x] Typed return and refund actions
- [x] Partial refund and net-revenue tracking
- [x] Shared store integration
- [x] Focused tests for unique, stocked and variant products
- [x] Existing Phase 1–3 browser regression gate
- [x] React Doctor 100/100

Accepted evidence:

- Application head `2b14028c4e60c3395a9bbe819506adca8bfdcae1`
- Control Room run `29044424035`
- Parity run `29044424098`
- 46 tests passed across 7 files
- Production build passed
- Existing Overview, Inventory, Product Editor and Intake browser interactions passed
- React Doctor 100/100 — no issues found
- Screenshot and log artifacts uploaded

No Sales route or global action was exposed during Batch 4A.

### Batch 4B — Orders workspace — active

- [ ] `/admin/orders`
- [ ] Status views and search/filter controls
- [ ] Desktop operational table
- [ ] Mobile order cards
- [ ] Order detail sheet and timeline
- [ ] Permitted transition controls
- [ ] Confirmation for cancellation/refund actions
- [ ] Recoverable transition errors
- [ ] Empty, loading, error and success states
- [ ] Orders navigation exposed only after full workspace verification
- [ ] Desktop, tablet and mobile browser evidence
- [ ] React Doctor 100/100

### Batch 4C — Holds workspace

- [ ] `/admin/holds`
- [ ] Active, expiring, expired and payment-risk views
- [ ] Responsive hold list/cards
- [ ] Extend action
- [ ] Release confirmation
- [ ] Convert-to-order action
- [ ] Recoverable error feedback

### Batch 4D — global Record Sale

- [ ] Global entry point
- [ ] Guided sale form
- [ ] Product, variant and quantity validation
- [ ] Channel, customer, payment and notes capture
- [ ] Connected offline-sale action
- [ ] Inventory, orders, revenue inputs, stock movement and activity updates
- [ ] Success summary and conflict errors

### Batch 4E — Returns workspace

- [ ] `/admin/returns`
- [ ] Return states and filters
- [ ] Order-line context
- [ ] Quantity and prior-return validation
- [ ] Restock/damage disposition
- [ ] Confirmation and recoverable errors

### Batch 4F — acceptance

- [ ] Scope and PR diff audit
- [ ] ESLint
- [ ] TypeScript
- [ ] Full Vitest suite
- [ ] Production build
- [ ] React Doctor changed-scope review
- [ ] Required viewport matrix
- [ ] Orders browser interactions
- [ ] Holds browser interactions
- [ ] Offline-sale browser interactions
- [ ] Return/restock browser interactions
- [ ] Overview and Inventory cross-workspace regression
- [ ] Tracker and PR body updated

## Batch 4A accepted invariants

- [x] Unique-item sale prevents a second sale
- [x] Stocked and variant mutations affect only the selected quantity bucket
- [x] Holds reserve quantities correctly
- [x] Release restores reserved stock
- [x] Paid hold conversion moves reserved stock to sold
- [x] Pending hold conversion preserves reservation ownership
- [x] Payment confirmation marks order stock as sold
- [x] Pre-dispatch cancellation restores sold stock
- [x] Offline sale creates an order/sales record rather than only changing stock
- [x] Invalid transitions return understandable typed errors
- [x] Only delivered sold lines can enter customer Returns
- [x] Returns cannot exceed the eligible sold quantity
- [x] Partial refunds reduce net revenue without falsely closing the whole order
- [x] Shared store subscribers receive sales commits
- [x] No UI route or later batch action was exposed
- [x] Required checks pass

## Batch 4B implementation contract

- Orders consumes the shared Control Room store; it must not own a parallel order array.
- The existing shadcn table decision remains valid; no TanStack dependency is added.
- Search, saved status views and lightweight filters stay local because the dataset is session-only.
- Destructive cancellation/refund transitions require confirmation.
- Only transitions returned by `getPermittedOrderTransitions` may be shown.
- The detail workspace must show customer, channel, lines, payment boundary, delivery boundary, notes and timeline without claiming courier/payment integration.
- `/admin/orders` and Orders navigation remain hidden until the full batch passes browser verification.
- Holds, Record Sale and Returns UI remain out of scope for this batch.

## Loaded implementation contract

Before Phase 4 code began:

- [x] Reloaded `docs/control-room-v2/spec.md`
- [x] Reloaded `docs/control-room-v2/implementation-plan.md`
- [x] Reloaded the prior progress tracker
- [x] Reloaded `AGENTS.md`
- [x] Confirmed the Phase 3 closure head is green
- [x] Inspected current order, hold, customer, product and stock-movement seed records
- [x] Reloaded current controller process, product, UI, React, Next.js, shadcn, TypeScript and error-handling guidance
- [x] Searched for the expected `brainstorming` skill; it remains absent and no replacement was invented

## Blockers

None for Batch 4B.

## Next action

Implement and verify the complete Orders workspace only. Do not begin Holds, Record Sale or Returns UI until Batch 4B passes.

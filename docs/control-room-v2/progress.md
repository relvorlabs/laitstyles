# Laitstyle Control Room V2 — Progress Tracker

## Current score

**Phase 4 of 7 in progress — Sales workspace**

Active batch: **4A — sales domain and typed actions**.

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
| Active batch | 4A — sales domain and typed actions |
| Next batch | 4B — blocked until 4A passes |
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

The documentation-only Phase 3 closure head `c897d5a7135cf7c93ee048016514c0bdebf27780` also passed both required workflows.

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

### Batch 4A — sales domain and typed actions

- [ ] Focused sales domain types
- [ ] Expanded connected order, hold and return records
- [ ] Explicit order transition graph
- [ ] Stock reserve, release, sale and return helpers
- [ ] Typed order transition action
- [ ] Typed hold extend/release/convert actions
- [ ] Typed offline-sale action
- [ ] Typed return actions
- [ ] Shared store integration
- [ ] Focused tests for unique, stocked and variant products
- [ ] Existing Phase 1–3 browser regression gate
- [ ] React Doctor 100/100

No Sales route or global action is exposed during Batch 4A.

### Batch 4B — Orders workspace

- [ ] `/admin/orders`
- [ ] Status views and search/filter controls
- [ ] Desktop operational table
- [ ] Mobile order cards
- [ ] Order detail sheet and timeline
- [ ] Permitted transition controls
- [ ] Empty, loading, error and success states

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

## Batch 4A acceptance criteria

- [ ] Unique-item sale prevents a second sale
- [ ] Stocked and variant mutations affect only the selected quantity bucket
- [ ] Holds reserve quantities correctly
- [ ] Release restores reserved stock
- [ ] Hold conversion creates an order and consumes reserved stock
- [ ] Offline sale creates an order/sales record rather than only changing stock
- [ ] Invalid transitions return understandable typed errors
- [ ] Returns cannot exceed the eligible sold quantity
- [ ] Revenue selectors can distinguish paid online and offline sales
- [ ] No UI route or later batch action is exposed
- [ ] Required checks pass

## Loaded implementation contract

Before Batch 4A code begins:

- [x] Reloaded `docs/control-room-v2/spec.md`
- [x] Reloaded `docs/control-room-v2/implementation-plan.md`
- [x] Reloaded the prior progress tracker
- [x] Reloaded `AGENTS.md`
- [x] Confirmed the Phase 3 closure head is green
- [x] Inspected current order, hold, customer, product and stock-movement seed records
- [x] Reloaded current controller process, product, UI, React, Next.js, shadcn, TypeScript and error-handling guidance
- [x] Searched for the expected `brainstorming` skill; it remains absent and no replacement was invented

## Blockers

None for Batch 4A.

## Next action

Implement and verify Batch 4A only. Do not expose Orders, Holds, Record Sale or Returns UI until the corresponding later batch is complete.

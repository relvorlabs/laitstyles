# Laitstyle Control Room V2 — Progress Tracker

## Current score

**Phase 4 of 7 in progress — Sales workspace**

Active batch: **4C — Holds workspace**.

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
| Accepted Batch 4B head | `2dd8442898703354d34e292361e0f5f70064ebdc` |
| Accepted Batch 4B run | `29046530809` |
| Active batch | 4C — Holds workspace |
| Next batch | 4D — blocked until 4C passes |
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
- [x] Full verification gate

### Phase 2 — Inventory domain and responsive workspace

- [x] Unique, stocked and variant inventory model
- [x] Quantity invariants and cross-record validation
- [x] Saved views, search, filters and sorting
- [x] Storefront-aligned grid, desktop table and mobile cards
- [x] Deep-linkable product detail workspace
- [x] Real CSV export and selection feedback
- [x] Responsive browser matrix and React Doctor 100/100

Final Phase 2 verification: run `29021779448` on `b5ad5c64a906cef216a6b8e441893d095b09e4ff`.

### Phase 3 — Add-product wizard and Intake queue

- [x] Seven-step unique, stocked and variant product editor
- [x] React Hook Form and Zod validation
- [x] Back/Next preservation and dirty-close confirmation
- [x] Draft, publish and schedule actions
- [x] Existing-product editing
- [x] Connected Intake queue and adjacent transitions
- [x] Explicit subscribed catalogue store
- [x] Live Inventory updates after draft save
- [x] Full-viewport mobile editor
- [x] 30 tests, build, browser interactions and React Doctor 100/100

Final Phase 3 verification: run `29035766157` on `ba05d413d62154f1b41a415e5d31003bdf2c20f1`.

## Phase 4 locked scope

Connect Orders, Holds, Offline Sales and Returns to the same inventory, revenue, customer and activity truth.

### In scope

- Orders route, detail, timeline and permitted transitions
- Holds route, risk views, extend, release and convert actions
- Global Record Sale workflow
- Product/variant, quantity, channel, customer and payment capture
- Connected offline-sale action
- Returns route and return/refund states
- Typed Result errors
- Loading, empty, error, success and confirmation states

### Out of scope

- Real payment capture or refunds
- Courier or messaging integration
- Backend, database, API or auth work
- Phase 5 customer workspace
- Supplier, accounting, warehouse or multi-store expansion

## Phase 4 batches

### Batch 4A — sales domain and typed actions — accepted

- [x] Focused sales domain types
- [x] Explicit order and return transition graphs
- [x] Atomic reserve, release, sale, cancellation and return helpers
- [x] Payment-confirmed orders own sold stock
- [x] Typed order, hold, offline-sale and return actions
- [x] Partial refund and net-revenue tracking
- [x] Shared store integration
- [x] Unique, stocked and variant tests
- [x] Existing Phase 1–3 browser regression
- [x] React Doctor 100/100

Accepted evidence:

- Head `2b14028c4e60c3395a9bbe819506adca8bfdcae1`
- Control Room run `29044424035`
- Parity run `29044424098`
- 46 tests across 7 files

### Batch 4B — Orders workspace — accepted

- [x] `/admin/orders`
- [x] Saved status views, search, channel/payment filters and sorting
- [x] Desktop operational table
- [x] Responsive order cards
- [x] Connected order detail sheet and timeline
- [x] Only domain-permitted transitions exposed
- [x] Confirmation for cancellation/refund actions
- [x] Recoverable transition errors and success feedback
- [x] Empty, loading and route error states
- [x] Desktop and mobile Sales navigation
- [x] Full-width mobile detail with safe-area handling
- [x] Desktop, tablet and mobile browser evidence
- [x] React Doctor 100/100

Accepted evidence:

- Head `2dd8442898703354d34e292361e0f5f70064ebdc`
- Control Room run `29046530809`
- Parity run `29046530866`
- 52 tests across 9 files
- Production build passed
- Orders search, detail opening, normal transition, cancellation confirmation and confirmed cancellation passed in Chromium
- Desktop and mobile navigation passed
- Mobile detail passed exact 375 × 812 viewport geometry
- Phase 3 interaction regression passed
- Screenshot and log artifacts uploaded

### Batch 4C — Holds workspace — active

- [ ] `/admin/holds`
- [ ] Active, expiring, expired and payment-risk views
- [ ] Search and lightweight filters
- [ ] Desktop operational table
- [ ] Responsive hold cards
- [ ] Hold detail context
- [ ] Extend action
- [ ] Release confirmation
- [ ] Convert-to-order workflow
- [ ] Recoverable error and success feedback
- [ ] Holds navigation exposed only after verification
- [ ] Desktop, tablet and mobile browser evidence
- [ ] React Doctor 100/100

### Batch 4D — global Record Sale

- [ ] Global entry point
- [ ] Guided sale form
- [ ] Product, variant and quantity validation
- [ ] Channel, customer, payment and notes capture
- [ ] Connected offline-sale action
- [ ] Inventory, orders, revenue, stock movement and activity updates
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
- [ ] ESLint, TypeScript, full tests and production build
- [ ] React Doctor changed-scope review
- [ ] Required viewport matrix
- [ ] Orders, Holds, Offline Sale and Return browser interactions
- [ ] Overview and Inventory cross-workspace regression
- [ ] Tracker and PR body updated

## Accepted sales invariants

- [x] Unique-item sale prevents a second sale
- [x] Stocked and variant mutations affect only the selected bucket
- [x] Holds reserve quantities correctly
- [x] Release restores reserved stock
- [x] Paid hold conversion moves reserved stock to sold
- [x] Pending hold conversion preserves reservation ownership
- [x] Payment confirmation marks order stock as sold
- [x] Pre-dispatch cancellation restores sold stock
- [x] Offline sale creates an order/sales record
- [x] Only delivered sold lines can enter Returns
- [x] Returns cannot exceed eligible sold quantity
- [x] Partial refunds reduce net revenue without falsely closing the whole order
- [x] Shared store subscribers receive sales commits

## Batch 4C implementation contract

- Holds consumes the shared Control Room store; no parallel hold or stock arrays.
- Active, expiring, expired and payment-risk states derive from `getHoldRisk` and the current session time.
- Extend mutates only expiry metadata.
- Release requires confirmation and restores exactly the held quantity.
- Convert-to-order captures payment status, payment method, delivery city and notes, then uses the existing typed action.
- Product and variant context must stay visible in cards and detail.
- The current shadcn table decision remains valid; no TanStack dependency.
- `/admin/holds` and Holds navigation remain hidden until the full batch passes.
- Record Sale and Returns UI remain out of scope.

## Loaded implementation contract

- [x] Reloaded specification, plan, tracker and `AGENTS.md`
- [x] Confirmed Phase 3 closure and Batch 4A/4B heads are green
- [x] Reloaded process, product, UI, React, Next.js, shadcn, TypeScript, error-handling and acceptance skills
- [x] Searched for `brainstorming`; it remains absent and no replacement was invented
- [x] Reviewed current Web Interface Guidelines before Orders closure

## Blockers

None for Batch 4C.

## Next action

Implement and verify the complete Holds workspace only. Do not begin Record Sale or Returns UI until Batch 4C passes.

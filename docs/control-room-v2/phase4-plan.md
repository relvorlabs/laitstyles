# Control Room V2 — Phase 4 sales execution plan

## Status

Phase 4 is active. Only Batch 4A may receive feature code until its domain gate passes.

## Goal

Connect Orders, Holds, Offline Sales and Returns to the same inventory, revenue, customer and activity truth without pretending that payments, couriers, refunds or persistence are production integrations.

## Locked scope

- Orders route and status views
- Order detail sheet, timeline and permitted transitions
- Holds route, risk views and typed extend/release/convert actions
- Global Record Sale dialog
- Product or variant selection and quantity validation
- Channel, customer and payment capture
- Offline-sale action that updates inventory, orders, revenue inputs, customer history boundary, stock movements and activity
- Returns route and typed return/refund states
- Recoverable Result errors, confirmations, loading, empty, error and success states

## Explicit exclusions

- Real payment capture or settlement
- Courier or tracking-provider integration
- Customer messaging integration
- Production refunds or bank reversals
- Backend persistence, APIs, database work or inventory locking
- Phase 5 customer workspace implementation
- Supplier, accounting, warehouse or multi-store expansion

## Connected invariants

1. Every stock mutation passes through one typed sales action boundary.
2. Unique products cannot be sold or reserved more than once.
3. Stocked and variant products mutate only the selected stock bucket.
4. Available, reserved, sold, returned and damaged quantities remain non-negative and reconcile to total received.
5. A hold reserves stock; release restores it; conversion consumes the reserved quantity and creates an order.
6. An offline sale creates an order/sales record and stock movement rather than only changing product status.
7. Returns reference an existing order line and cannot exceed the sold quantity minus prior accepted returns.
8. Revenue selectors include paid online and offline orders without counting pending, failed, cancelled, refunded or returned amounts incorrectly.
9. Destructive actions require confirmation in the UI batches.
10. Session refresh restores deterministic seed state; no persistence claim is made.

## Batches

### Batch 4A — sales domain and typed actions

Scope:

- Extract focused sales domain types from the existing broad type file
- Expand order, hold, payment, timeline and return records
- Define explicit order transition graph
- Add stock reservation, release, sale and return helpers
- Add typed Result errors for invalid transitions, missing records, insufficient stock and duplicate unique-piece sale
- Implement pure actions for order transition, hold extension/release/conversion, offline sale and return progression
- Extend the shared Control Room store interface without exposing UI routes
- Add focused unit and integration tests

Gate:

- Lint
- TypeScript
- Full Vitest suite
- Production build
- Existing Phase 1–3 browser regression matrix
- React Doctor 100/100

### Batch 4B — Orders workspace

Scope:

- `/admin/orders`
- Status views, search and operational filtering
- Responsive desktop table and mobile order cards
- Order detail sheet with customer, lines, payment, delivery boundary, notes and timeline
- Only permitted transitions exposed
- Empty, loading, error and success states

Orders navigation remains hidden until this batch is complete and browser-verified.

### Batch 4C — Holds workspace

Scope:

- `/admin/holds`
- Active, expiring, expired and payment-risk views
- Product-led hold cards/table
- Extend, release and convert-to-order actions
- Confirmation and recoverable error states
- Responsive detail/action presentation

Holds navigation remains hidden until this batch is complete and browser-verified.

### Batch 4D — global Record Sale workflow

Scope:

- Global Record Sale entry point
- Guided product, variant/unit, quantity, final price, channel, customer, payment and notes flow
- Connected offline-sale action
- Conflict and insufficient-stock feedback
- Success receipt/summary
- Inventory, orders, overview revenue inputs, stock movements and activity update in the same session

The action remains hidden until the complete flow passes browser interaction tests.

### Batch 4E — Returns workspace

Scope:

- `/admin/returns`
- Requested, approved, received, inspecting, refunded, restocked, damaged, rejected and closed states as justified by the domain
- Return detail and order-line context
- Quantity and prior-return validation
- Restock or damage disposition
- Confirmation and recoverable error states

Returns navigation remains hidden until this batch is complete and browser-verified.

### Batch 4F — cross-workspace acceptance

Scope:

- Full scope audit
- Revenue and Overview regression checks
- Unique, stocked and variant sales browser flows
- Hold reserve/release/convert browser flows
- Offline sale browser flow
- Return/restock browser flow
- Required viewport matrix
- Keyboard, focus, confirmation and reduced-motion review
- Latest Web Interface Guidelines review
- Tracker and PR update

## Batch 4A initial file boundary

```text
src/lib/control-room/sales-types.ts
src/lib/control-room/sales-stock.ts
src/lib/control-room/order-actions.ts
src/lib/control-room/hold-actions.ts
src/lib/control-room/offline-sale-actions.ts
src/lib/control-room/return-actions.ts
src/lib/control-room/sales-selectors.ts
src/lib/control-room/types.ts
src/lib/control-room/seed.ts
src/features/control-room/state/control-room-store.ts
src/features/control-room/state/control-room-provider.tsx
```

The exact split may be refined when responsibilities become clear, but no universal sales action monolith may replace these focused boundaries.

## Phase 4 completion criteria

Phase 4 is complete only when all six batches pass their gates and the browser proves that Orders, Holds, Offline Sales and Returns mutate one connected session state correctly at 375 × 812, 768 × 1024 and 1280 × 800.

# Control Room V2 — Phase 4 sales execution plan

## Status

Phase 4 is active. Batches 4A and 4B are accepted. Only Batch 4C Holds may receive feature code until its gate passes.

## Goal

Connect Orders, Holds, Offline Sales and Returns to the same inventory, revenue, customer and activity truth without pretending that payments, couriers, refunds or persistence are production integrations.

## Locked scope

- Orders route and status views
- Order detail, timeline and permitted transitions
- Holds route, risk views and typed extend/release/convert actions
- Global Record Sale dialog
- Product or variant selection and quantity validation
- Channel, customer and payment capture
- Connected offline-sale action
- Returns route and typed return/refund states
- Recoverable Result errors, confirmations, loading, empty, error and success states

## Explicit exclusions

- Real payment capture or settlement
- Courier or tracking-provider integration
- Customer messaging integration
- Production refunds or bank reversals
- Backend persistence, APIs, database work or inventory locking
- Phase 5 customer workspace implementation
- Supplier, accounting or warehouse expansion

## Connected invariants

1. Every stock mutation passes through one typed sales action boundary.
2. Unique products cannot be sold or reserved more than once.
3. Stocked and variant products mutate only the selected stock bucket.
4. Available, reserved, sold, returned and damaged quantities remain non-negative and reconcile to total received.
5. A hold reserves stock; release restores it; paid conversion moves it to sold; pending conversion transfers the reservation to the order.
6. An offline sale creates an order/sales record and stock movement rather than only changing product status.
7. Returns reference delivered sold order lines and cannot exceed the sold quantity minus prior accepted returns.
8. Revenue selectors use net paid revenue after refunds.
9. Destructive actions require confirmation.
10. Session refresh restores deterministic seed state; no persistence claim is made.

## Batches

### Batch 4A — sales domain and typed actions — accepted

Accepted head `2b14028c4e60c3395a9bbe819506adca8bfdcae1`; run `29044424035`.

### Batch 4B — Orders workspace — accepted

Accepted head `2dd8442898703354d34e292361e0f5f70064ebdc`; run `29046530809`.

Delivered:

- `/admin/orders`
- Saved views, search, filters and sorting
- Responsive cards and operational table
- Deep-linked detail workspace and timeline
- Guarded transitions and cancellation/refund confirmation
- Loading, empty, error and success states
- Desktop/mobile Sales navigation
- Browser acceptance at 375 × 812, 768 × 1024 and 1280 × 800

### Batch 4C — Holds workspace — active

Scope:

- `/admin/holds`
- Active, expiring, expired and payment-risk views
- Search and lightweight filters
- Responsive desktop table and mobile cards
- Product, variant, customer, stage, source and expiry context
- Extend action
- Release confirmation
- Convert-to-order workflow with payment status, method, delivery city and notes
- Recoverable error/success states
- Loading, empty and route error states
- Navigation exposed only after browser acceptance

Gate:

- Lint
- TypeScript
- Full test suite
- Production build
- Existing Phase 1–4B browser regression
- Holds browser interactions at required viewports
- React Doctor 100/100

### Batch 4D — global Record Sale workflow

Scope:

- Global Record Sale entry point
- Guided product, variant/unit, quantity, final price, channel, customer, payment and notes flow
- Connected offline-sale action
- Conflict and insufficient-stock feedback
- Success receipt/summary
- Inventory, orders, Overview revenue inputs, stock movements and activity update in the same session

### Batch 4E — Returns workspace

Scope:

- `/admin/returns`
- Return states and filters
- Return detail and order-line context
- Quantity and prior-return validation
- Restock or damage disposition
- Confirmation and recoverable error states

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

## Batch 4C file boundary

```text
src/features/control-room/holds/
src/app/admin/holds/
src/features/control-room/shell/navigation.ts
scripts/control-room-phase4-holds-check.mjs
.github/workflows/control-room-v2.yml
```

Holds must consume the existing shared store and typed hold actions. No route-local hold or inventory state is permitted.

## Phase 4 completion criteria

Phase 4 is complete only when all six batches pass their gates and the browser proves that Orders, Holds, Offline Sales and Returns mutate one connected session state correctly at 375 × 812, 768 × 1024 and 1280 × 800.

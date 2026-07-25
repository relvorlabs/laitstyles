# Phase 5 — Admin Dummy Domain Cutover Status

**Branch:** `refactor/phase-5-admin-dummy-domain-cutover`  
**Base merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Pull request:** #43  
**Current workstream:** Orders repairs and Holds source cutover  
**Phase status:** Orders blockers repaired; Holds source implemented; exact-head certification pending  
**Next domain:** Returns, locked until the current Orders/Holds head executes its acceptance gates  
**UI contract:** Existing admin UI preserved except the explicitly requested in-person Paystack payment controls

## Authority and migration order

The owner-supplied architecture decision remains the controlling mission source. Phase 5 runs in this order:

1. Orders
2. Holds and reservations
3. Returns
4. Customers
5. Settings
6. Overview/reporting projections
7. Admin seed/store/repository deletion

The owner explicitly directed implementation of the listed Orders blockers and Holds before the queued runner produced evidence. That direction authorizes source work only; it does not convert queued checks into passing evidence or certify either domain.

## Validation truth

Phase 4 was squash-merged as `646ad2942ec2afbdb42e5269bad6d1993b01444b` at the repository owner’s direction while exact-head workflows remained queued. The initial Phase 5 bootstrap runs also completed as cancelled.

Cancelled, queued, skipped, superseded or unavailable checks remain debt rather than evidence.

The current exact head must still execute and pass:

- architecture guard and Biome;
- TypeScript;
- Prisma validation, migration status and database integrity;
- unit, component, integration and API contract tests;
- production build;
- React Doctor;
- HTTP smoke;
- desktop, tablet and mobile Playwright contract;
- retained artifacts and review reconciliation.

Until these execute successfully, Orders and Holds are source-implemented but not certified.

## Remaining global legacy runtime

The admin shell still starts with a seeded snapshot for domains that have not moved:

```text
src/app/admin/layout.tsx
  -> activeAdminSeed
  -> AdminShell(initialState)
  -> AdminProvider
  -> AdminStore
  -> AdminRepositoryProvider
  -> createInMemoryAdminRepositories
```

The in-memory repository surface now serves only Returns, Customers, Settings and Overview. Orders and Holds repositories were removed.

AdminStore no longer exposes Orders, offline-sale or Holds mutation actions. Its legacy snapshot still contains order/hold records because the not-yet-migrated Overview projection reads the aggregate snapshot. That read-only compatibility debt is removed with the Overview workstream; it is not a second mutation owner.

## Orders cutover and repairs

### Persisted data path

```text
Orders Client Component
  -> TanStack Query
  -> modules/orders/client/api
  -> /api/v1/admin/orders/**
  -> authenticated Orders query/command
  -> Prisma
```

Delivered source boundaries:

- canonical Orders schemas, types, transition rules and explicit read models;
- Prisma list/detail reads;
- database filtering, search, sorting, saved-view counts, summaries and pagination;
- URL-owned view, search, channel, payment, sort, page, page size and selected order;
- authenticated list, detail, transition, sale-customer and offline-sale routes;
- typed browser clients, query keys and TanStack hooks;
- existing table, mobile cards and detail sheet rendered from persisted read models;
- persisted Paystack-ready customer options for the in-person sale dialog;
- no Orders page, workspace, detail or record-sale dependency on AdminStore or in-memory repositories.

### In-person Paystack sales

“Offline sale” means the customer and staff are physically together. It does not mean cash, POS or a manually declared transfer.

```text
Admin selects product + customer
  -> authenticated offline-sales API
  -> validate products, variants, quantity and price
  -> create pending order and payment attempt in Prisma
  -> reserve exact stock against exact order ID
  -> initialize one-time Paystack transaction server-side
  -> persist access code/reference/authorization result
  -> open InlineJS Checkout or recover through authorization URL
```

Enforced rules:

- only `physical-store`, `pop-up` and `staff-assisted` channels;
- customer email required;
- no cash, POS, manual transfer, paid or deposit fields in the transport schema;
- legacy clients sending manual payment fields receive a validation error;
- initialization reserves stock but does not recognise revenue;
- popup completion is never authoritative;
- manual `payment-confirmed` is hidden and rejected for in-person Paystack orders;
- every stock movement is created with the exact persisted order ID;
- failed initialization cancels the exact draft and releases only its recorded lines;
- validation completes before a new CRM customer is created;
- no broad time-window movement relinking remains.

Phase 8 still owns verification, signed webhook settlement, idempotency, reference/amount/currency checks, reserved-to-committed stock, committed-to-sold handoff, checkout expiry and refund/reversal reconciliation.

### Orders defects repaired

- pre-delivery `dispatched -> returned` and `out-for-delivery -> returned` transitions are prohibited;
- delivery moves committed stock to sold;
- cancellation releases reserved or committed stock according to line state;
- `stock-write-conflict` remains distinct from genuine insufficient stock;
- `available`, `requested` and `conflictingHoldIds` survive the server and browser HTTP boundary;
- the reducer-backed Orders mutation and old order/offline-sale reducer implementations were deleted;
- the record-sale customer picker now reads a narrow persisted customer projection;
- Orders and Holds share one admin pagination component rather than duplicate implementations.

## Holds cutover

### Persisted data path

```text
HoldsWorkspace
  -> TanStack Query
  -> modules/holds/client/api
  -> /api/v1/admin/holds/**
  -> authenticated Holds query/command
  -> Prisma holds/customers/products/variants/orders
```

Delivered source boundaries:

- canonical Holds schemas, types and explicit read models;
- Prisma list/detail reads with database filters, search, sorting, saved-view counts, summary and pagination;
- exact UUID hold search plus customer/product/SKU text search;
- URL-owned view, search, source, stage, sort, page, page size and selected hold;
- authenticated list, detail, extend, release and convert routes;
- typed browser API, complete query keys and TanStack hooks;
- existing desktop table, mobile cards, detail sheet and action dialogs rendered from persisted read models;
- Holds page no longer validates selected records through `activeAdminSeed`;
- Holds workspace no longer imports AdminProvider, AdminRepositories or reducer mutation hooks;
- legacy Holds repository/query/mutation/reducer files deleted.

### Holds command rules

- extending changes only the persisted expiry and records an audit event;
- releasing moves only the exact hold quantity from reserved to available stock;
- expired, released, converted or cancelled holds cannot be changed;
- conversion creates one pending-payment order and keeps stock reserved;
- conversion cannot accept cash, POS, transfer method or client-declared payment success;
- converted order and hold are linked by persisted UUIDs;
- Inventory owns the operational stock mutation and immutable stock movement.

## Architecture guards

`src/lib/admin/data/in-memory/phase-5-boundary.test.ts` now enforces:

- no expansion of production seed/in-memory repository imports;
- Orders and Holds UI consumers cannot import seed, AdminProvider or repository context;
- removed reducer, query-adapter and duplicate pagination files remain deleted;
- in-person checkout and Hold conversion cannot restore manual payment controls;
- the Paystack/server-verification and pending-payment wording remains present.

## Focused tests authored

Orders:

- Paystack configuration and initialization contract;
- offline-sales authorization and strict payload validation;
- exact order-linked stock reservation;
- failed-initialization compensation of exact draft lines;
- delivery, cancellation and pre-delivery return stock invariants;
- distinct concurrency conflict mapping;
- available/requested/active-hold metadata across HTTP;
- transition-rule regression coverage.

Holds:

- authenticated paginated list contract;
- extension expiry and audit behavior;
- exact reserved-stock release;
- pending-payment conversion without a stock sale;
- architecture guards preventing legacy ownership and payment controls.

These are authored source tests only until the exact-head workflow executes them. They are not passing evidence yet.

## Task matrix

| ID | Task | Source status | Evidence status |
| --- | --- | --- | --- |
| P5-T01 | Record Phase 4 merge and unresolved debt | Complete | Recorded |
| P5-T02 | Freeze seed/provider/repository/query/mutation map | Complete | Recorded |
| P5-T05 | Orders module, list/detail APIs and database pagination | Implemented | Pending exact-head execution |
| P5-T06 | In-person sale transaction, exact reservation and Paystack attempt | Implemented and repaired | Pending exact-head execution |
| P5-T07 | Cut Orders consumers and mutations from legacy ownership | Implemented | Pending exact-head execution |
| P5-T08 | Holds module and transactional commands | Implemented | Pending exact-head execution |
| P5-T09 | Cut Holds consumers from local reducers/repositories | Implemented | Pending exact-head execution |
| P5-T19 | Permanent seed/in-memory/reducer guards | In progress | Orders/Holds guards authored |
| P5-T20 | Persistence/auth/validation/error/invalidation/reload proof | In progress | Tests authored; database/runtime execution pending |
| P5-T21 | Static, DB, test, build, React Doctor, HTTP and Playwright gates | Not complete | Awaiting executed exact-head runs |
| Remaining | Returns, Customers, Settings, Overview and final legacy deletion | Not started | Follows mission order |

## Certification rule

Orders and Holds are certified only when:

- list and detail reads execute against Prisma;
- writes persist and survive reload;
- server authorization and validation pass tests;
- exact stock reservation/release/compensation pass database tests;
- cache invalidation refreshes affected domain boundaries;
- no runtime fallback restores seed or reducer data;
- desktop, tablet and mobile UI evidence is retained;
- final-head checks execute successfully.

Source implementation alone is not a 10/10 certification.

# Phase 5 — Admin Dummy Domain Cutover Status

**Branch:** `refactor/phase-5-admin-dummy-domain-cutover`  
**Base merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Pull request:** #43  
**Current workstream:** Orders  
**Phase status:** Orders source cutover implemented; exact-head validation pending  
**Next domain:** Holds, blocked until Orders validation executes successfully  
**UI contract:** Existing admin UI preserved except the explicitly requested in-person Paystack payment controls

## Authority and migration order

The owner-supplied architecture decision is the controlling mission source. Phase 5 runs in this order:

1. Orders
2. Holds and reservations
3. Returns
4. Customers
5. Settings
6. Overview/reporting projections
7. Admin seed/store/repository deletion

The earlier Customers-first bootstrap is superseded. Holds must not begin because source code exists; it begins only after the Orders static, database, test, HTTP and Playwright gates execute successfully.

## Validation truth

Phase 4 was squash-merged as `646ad2942ec2afbdb42e5269bad6d1993b01444b` at the repository owner’s direction while its exact-head workflows remained queued. Those checks later provided no passing evidence.

The initial Phase 5 bootstrap runs also completed as cancelled. Cancelled, queued, skipped, superseded or unavailable checks remain debt rather than evidence.

The current Orders head must still prove:

- architecture guard and Biome;
- TypeScript;
- Prisma validation, migration status and database integrity;
- unit, component, integration and API contract tests;
- production build;
- React Doctor;
- HTTP smoke;
- desktop, tablet and mobile Playwright contract;
- retained artifacts and review reconciliation.

Until those execute successfully, Orders is not certified and Holds remains locked.

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

This global layer still serves Holds, Returns, Customers, Settings and Overview. It is removed only after those consumers migrate.

Orders no longer uses that chain for its page, workspace, detail, transitions or in-person checkout mutation.

## Orders cutover

### Persisted read path

```text
OrdersWorkspace
  -> TanStack Query
  -> modules/orders/client/api
  -> GET /api/v1/admin/orders
  -> modules/orders/server/queries
  -> Prisma orders/order_lines/customers/timeline/payment events
```

Delivered source boundaries:

- canonical Orders schemas, types, transition rules and explicit read models;
- Prisma list and detail queries;
- database filtering, search, sorting, saved-view counts, summaries and pagination;
- URL-owned view, search, channel, payment, sort, page, page size and selected order;
- authenticated list, detail and transition routes;
- typed browser clients, query keys and TanStack hooks;
- existing desktop table, mobile cards and detail sheet rendered from persisted read models;
- Orders page no longer validates selected records through `activeAdminSeed`;
- Orders workspace no longer imports `useAdmin` or reducer-owned mutation hooks.

### In-person Paystack sales

The repository owner clarified that an offline sale means the customer and staff are physically together. It does not mean cash, POS or a manually declared transfer.

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
- Checkout presents the payment channels enabled in Paystack;
- initialization reserves stock but does not recognise revenue;
- popup completion is never authoritative;
- manual `payment-confirmed` is hidden and rejected for in-person Paystack orders;
- every stock movement is created with the exact order ID;
- failed initialization cancels the exact draft and releases only its recorded lines;
- validation is completed before a new CRM customer can be created;
- no broad time-window movement relinking remains.

### Payment saga boundary

The database draft transaction is atomic. Paystack is an external service, so initialization is coordinated as an explicit saga rather than by holding a database transaction open across the network.

- Before Paystack succeeds: initialization failure compensates the draft and releases stock.
- After Paystack succeeds: a later local persistence failure does **not** release stock because the customer may still pay the live Paystack transaction. The payment reference remains an operational reconciliation item.

Phase 8 owns:

- payment verification endpoint;
- signed Paystack webhook;
- idempotent settlement and duplicate protection;
- verified reference, amount and currency checks;
- reserved-to-committed stock movement after verified payment;
- committed-to-sold movement at customer handoff;
- abandonment/expiry cleanup and reservation release;
- reversal and refund reconciliation.

Until Phase 8 settlement exists, an initialized checkout remains `pending-payment` and cannot be fulfilled.

## Architecture guards

`src/lib/admin/data/in-memory/phase-5-boundary.test.ts` now enforces:

- no expansion of production seed/in-memory repository imports;
- Orders page, workspace and record-sale orchestration cannot import the admin seed, AdminProvider or legacy order reducer hooks;
- record-sale payment UI cannot restore payment-status, payment-method, cash, POS or bank-transfer controls;
- the Paystack/server-verification wording remains present.

## Focused tests added

- Paystack initialization fails before a request when no secret key exists;
- successful initialization sends the exact email, amount in kobo, currency, reference and metadata;
- Paystack rejection becomes a stable initialization failure;
- offline-sales API requires `sales:record`;
- new customer email is validated before command execution;
- legacy cash/manual-paid payloads are rejected;
- unavailable Paystack returns a stable service response;
- successful API response contains a persisted pending order and recoverable Checkout details.

These are source-level test additions only until the workflow executes them.

## Task matrix

| ID | Task | Source status | Evidence status |
| --- | --- | --- | --- |
| P5-T01 | Record Phase 4 merge and unresolved debt | Complete | Recorded |
| P5-T02 | Freeze seed/provider/repository/query/mutation map | Complete | Recorded |
| P5-T05 | Orders module, list/detail APIs and database pagination | Implemented | Pending exact-head execution |
| P5-T06 | In-person sale transaction, exact reservation and Paystack attempt | Implemented | Pending exact-head execution |
| P5-T07 | Cut Orders page/workspace/record-sale mutation from legacy ownership | Implemented | Pending exact-head execution |
| P5-T19 | Permanent seed/in-memory/reducer guards | In progress | Focused Orders guards added |
| P5-T20 | Persistence/auth/validation/error/invalidation/reload proof | In progress | Tests authored, not yet executed on final head |
| P5-T21 | Static, DB, test, build, React Doctor, HTTP and Playwright gates | Not complete | Awaiting executed final-head runs |
| P5-T08 | Holds module and transactional commands | Blocked | Requires P5-T20/P5-T21 Orders evidence |
| P5-T09 | Holds UI cutover | Blocked | Requires Holds implementation |
| Remaining | Returns, Customers, Settings, Overview and legacy deletion | Not started | Follows mission order |

## Orders completion rule

Orders is certified only when:

- list and detail reads execute against Prisma;
- in-person checkout writes persist and survive reload;
- server authorization and validation pass tests;
- exact reservation and failure compensation pass database tests;
- cache invalidation refreshes Orders, Inventory, Customers and Overview boundaries;
- no runtime fallback restores seed/reducer data;
- desktop, tablet and mobile UI evidence is retained;
- final-head checks execute successfully.

Source implementation alone is not a 10/10 certification.

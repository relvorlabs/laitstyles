# Phase 5 — Remove Remaining Admin Dummy Domains

**Controlling source:** User-supplied `update(3).md` architecture decision and migration review  
**Repository:** `relvorlabs/laitstyles`  
**Branch:** `refactor/phase-5-admin-dummy-domain-cutover`

## Objective

Migrate orders, holds, returns, customers, overview, and settings away from AdminStore and in-memory repositories.

## Migration order

1. Orders
2. Holds and reservations
3. Returns
4. Customers
5. Settings
6. Overview/reporting projections

This order is authoritative for Phase 5. Any departure requires repository evidence that the sequence is unsafe and an explicit recorded override. The earlier bootstrap choice to start Customers first is superseded by the attached controlling decision.

Holds must not begin until the Orders workstream has been repaired and its required validation has executed. A queued, skipped, cancelled or unavailable Orders check is not permission to move forward.

## Recorded product override — in-person sales

The repository owner clarified on July 25, 2026 that an “offline sale” means a sale happening physically in front of staff rather than through the storefront. It does **not** mean an untracked cash or manually confirmed payment.

The approved Phase 5 behaviour is:

```text
Admin selects an in-person product and customer
  -> authenticated Orders API
  -> create pending Prisma order
  -> reserve exact stock against that order
  -> create Paystack payment attempt/reference
  -> initialize one-time Paystack Checkout on the server
  -> return access code and authorization URL
  -> open Paystack Popup or recover through the stored URL
```

Required rules:

- in-person channels are `physical-store`, `pop-up`, or `staff-assisted`;
- the customer must have an email because Paystack transaction initialization requires it;
- the form cannot declare cash, transfer, card, POS, deposit, or paid status;
- Paystack Checkout owns the customer’s available payment-channel choice;
- checkout initialization reserves stock but does not recognise revenue;
- no frontend callback may mark the order paid;
- only later server verification or a signed webhook may confirm the payment and commit stock;
- initialization failure must cancel the exact draft and release its exact reservation;
- no broad time-window query may attach stock movements to an order.

## Phase 8 payment handoff retained

This Phase 5 slice deliberately initializes and tracks the Paystack attempt so the requirement is not forgotten. Phase 8 remains responsible for:

- `POST /api/v1/payments/verify`;
- signed Paystack webhook verification;
- idempotent settlement;
- verified amount/reference checks;
- payment success, failure, abandonment, reversal and refund reconciliation;
- moving reserved stock to committed stock after verified payment;
- moving committed stock to sold stock at physical handoff/delivery;
- releasing expired or abandoned checkout reservations;
- duplicate callback/webhook protection.

Until those Phase 8 gates exist, a generated or completed popup remains `pending-payment` and may not be fulfilled.

## Tasks for each domain

- [ ] Define Prisma-backed source of truth.
- [ ] Create domain module.
- [ ] Define schemas and types.
- [ ] Create server queries.
- [ ] Create server commands.
- [ ] Create policy rules.
- [ ] Create API Route Handlers.
- [ ] Create typed API client.
- [ ] Create TanStack hooks.
- [ ] Replace in-memory repository consumers.
- [ ] Remove domain data from AdminStore.
- [ ] Remove manual QueryClient/AdminStore synchronization.
- [ ] Add API contract tests.
- [ ] Add persistence tests.
- [ ] Add authorization tests.
- [ ] Verify existing UI screenshots.

## Deliverables

Every admin business screen reads persisted data.

## Acceptance gate

- no production admin screen depends on in-memory repository data;
- no successful write disappears after reload;
- the AdminStore no longer contains server-record collections;
- current admin UI remains visually unchanged except for the explicitly requested in-person Paystack payment controls;
- Orders static, database, unit, HTTP and Playwright checks execute successfully before Holds starts.

## Rollback trigger

A migrated domain loses existing interactions, status transitions, table behaviour, filters, responsive layout, stock integrity, payment traceability or server-authoritative settlement boundaries.

## Evidence rule

Source code, tests and documentation may describe intended behaviour, but Phase 5 cannot be rated complete or 10/10 until final-head static, database, unit, build, HTTP and Playwright checks execute successfully and retained artifacts exist. Queued, skipped, cancelled, superseded or unavailable runs are not passing evidence.

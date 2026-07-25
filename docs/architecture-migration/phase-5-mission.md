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
- current admin UI remains visually unchanged.

## Rollback trigger

A migrated domain loses existing interactions, status transitions, table behaviour, filters, or responsive layout.

## Evidence rule

Source code, tests and documentation may describe intended behaviour, but Phase 5 cannot be rated complete or 10/10 until final-head static, database, unit, build, HTTP and Playwright checks execute successfully and retained artifacts exist. Queued, skipped, cancelled, superseded or unavailable runs are not passing evidence.

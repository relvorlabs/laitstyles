# Phase 4 — Products and Inventory Cutover Status

**Branch:** `refactor/phase-4-products-inventory-cutover`  
**Base merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Status:** In progress — source inventory and cutover contract established  
**Acceptance gate:** Prisma-backed read/write parity through the Phase 3 transport contract, with no UI change

## 1. Predecessor status carried into Phase 4

Phase 3 was squash-merged through PR #40 as `d7e3149c96f234d7deb41151ac603d6f652ceb4d` by explicit repository-owner direction.

Phase 3 is recorded as **Merged with validation debt**, not as fully accepted or 10/10.

Confirmed Phase 3 delivery:

- typed browser HTTP client;
- standard success, error and pagination envelopes;
- reusable JSON and search validation;
- API authentication and staff-capability helpers;
- permission-policy helpers;
- structured logging and `x-request-id` correlation;
- admin-scoped QueryClient defaults and cancellation contract;
- `/api/v1/health` as the versioned transport proof;
- repaired Prisma 7.8 runtime dependency and self-hosted PostgreSQL routing;
- database gates and the 460-test Vitest suite passed on earlier Phase 3 repair heads.

Outstanding Phase 3 acceptance debt:

```text
Implementation Quality: 30118703848
Playwright UI Contract: 30118703866
```

Those final-head runs were queued without execution at merge time. Phase 4 must not rewrite that state as a pass. Phase 1 and Phase 2 also retain their previously recorded validation debt.

## 2. Controlling Phase 4 decision

Phase 4 cuts over the canonical `products` and `inventory` domains while preserving the existing admin and storefront presentation.

```text
Client Component
  -> TanStack Query hook
  -> typed API client
  -> /api/v1 Route Handler
  -> products or inventory domain operation
  -> Prisma
```

```text
Server Component
  -> products or inventory server query
  -> Prisma
```

Product owns definition and CRUD. Inventory owns stock, availability, reservations and stock movements. Catalogue remains a customer-facing read model, not a CRUD synonym.

Route Handlers and Server Actions are alternative transport adapters. They must not call each other.

## 3. Current source inventory at Phase 4 start

### Already Prisma-backed

- `src/server/commerce/inventory/inventory-read.ts`
  - lists admin products;
  - loads product detail;
  - lists categories and collections;
  - lists stock movements.
- `src/server/commerce/inventory/inventory-product-service.ts`
  - saves product definitions and associated stock transactionally.
- `src/server/commerce/inventory/inventory-lifecycle-service.ts`
  - archives, restores and deletes products.
- `src/server/commerce/inventory/inventory-taxonomy-service.ts`
  - creates, renames and deletes category/collection records.
- `src/app/admin/inventory/page.tsx`
  - performs the server-rendered inventory read directly without an internal HTTP round trip.

Phase 4 is therefore not a first persistence implementation. It is an ownership, transport and consumer cutover around existing persisted operations.

### Legacy browser read transport

- `src/app/api/admin/inventory/products/route.ts`
- `src/app/api/admin/inventory/products/[id]/route.ts`
- `src/app/api/admin/inventory/taxonomy/route.ts`
- `src/app/api/admin/inventory/stock-movements/route.ts`
- `src/lib/admin/data/remote/inventory-repository.ts`

These endpoints use unversioned `/api/admin/**` URLs, bespoke `fetchJson`, raw response bodies and route-local error shapes instead of the Phase 3 `/api/v1/**` envelope and shared HTTP adapter.

### Legacy browser write transport

`src/features/admin/inventory/inventory-mutations.ts` imports Server Actions directly from `src/features/admin/inventory/inventory-actions.ts`.

The architecture guard records this exact temporary edge:

```text
src/features/admin/inventory/inventory-mutations.ts
  -> src/features/admin/inventory/inventory-actions.ts
```

Phase 4 must replace it with typed API mutations before removing the exception.

### Legacy ownership

Product definition, taxonomy and stock operations are still grouped under `src/server/commerce/inventory/**` and shared admin types live under `src/lib/admin/**`. The target ownership is `src/modules/products/**` plus `src/modules/inventory/**`, migrated incrementally without wrapper-only abstractions.

## 4. Approved execution tasks

| ID | Task | Status |
| --- | --- | --- |
| P4-T01 | Record Phase 3 handoff and current products/inventory source map | Complete |
| P4-T02 | Define products and inventory module contracts from the existing persisted operations | Not started |
| P4-T03 | Move product definition, lifecycle and taxonomy server ownership into `src/modules/products/server/**` | Not started |
| P4-T04 | Move stock and stock-movement server ownership into `src/modules/inventory/server/**` | Not started |
| P4-T05 | Add authenticated versioned `/api/v1/admin/products/**` and `/api/v1/admin/inventory/**` read endpoints using Phase 3 envelopes | Not started |
| P4-T06 | Replace the bespoke remote inventory repository with typed product/inventory API clients and TanStack Query options | Not started |
| P4-T07 | Add versioned product and taxonomy mutation endpoints that call transport-neutral domain commands | Not started |
| P4-T08 | Replace TanStack-to-Server-Action mutations and remove the exact legacy exception | Not started |
| P4-T09 | Remove unversioned inventory endpoints and compatibility adapters only after every consumer moves | Not started |
| P4-T10 | Prove authorization, validation, error envelopes, persistence, reload retention and cache invalidation | Not started |
| P4-T11 | Run static, database, unit, build, React Doctor, HTTP and desktop/tablet/mobile Playwright parity gates | Not started |
| P4-T12 | Reconcile outstanding Phase 3 validation debt with executed evidence when available | Not started |

## 5. Scope boundaries

Phase 4 does not migrate orders, holds, returns, customers, settings, checkout, payments, delivery or authentication ownership.

Phase 4 does not:

- redesign the Inventory workspace or product editor;
- change header, footer, homepage, product cards, catalogue, PDP, typography, spacing, themes or responsive behaviour;
- move Server Components to internal HTTP;
- copy remote records into Zustand or another client store;
- introduce generic repository or service classes without a real replaceable backend;
- delete legacy routes or actions before all consumers move;
- declare completion from queued, skipped or unavailable checks.

## 6. Required acceptance evidence

Before Phase 4 can be complete:

- admin product list and detail reads use Prisma-backed product-domain queries;
- taxonomy writes persist through authenticated product-domain commands;
- inventory stock and movement reads use inventory-domain queries;
- all interactive browser reads and writes use typed `/api/v1/**` clients;
- no TanStack Query module imports a Server Action;
- the Phase 4 legacy exception is removed rather than broadened;
- changes survive reload and preserve database integrity;
- unauthorized and malformed requests return stable sanitized errors;
- cache invalidation updates list, detail, taxonomy, stock movement and overview consumers correctly;
- existing admin and storefront routes, interactions and presentation remain unchanged;
- final static, test, database, build, React Doctor, HTTP and Playwright evidence executes successfully.

## 7. Rollback

Each cutover slice must keep its old adapter until the replacement consumer is proven. Roll back by reverting the current slice; do not retain two active browser transports or partially remove the legacy exception.
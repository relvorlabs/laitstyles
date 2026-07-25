# Phase 4 — Products and Inventory Implementation Report

**Branch:** `refactor/phase-4-products-inventory-cutover`  
**Pull request:** #41  
**Source status:** Complete  
**Certification status:** Pending executed final-head evidence  
**UI contract:** No intentional redesign

## Predecessor truth

Phase 4 starts from Phase 3 merge commit `d7e3149c96f234d7deb41151ac603d6f652ceb4d`.

Phase 3 was merged with validation debt. Its final-head Implementation Quality and Playwright UI Contract runs (`30118703848` and `30118703866`) did not execute before merge. Phase 4 does not reinterpret queued, skipped, cancelled or superseded runs as passing evidence.

## Canonical ownership

### Products

`src/modules/products/**` owns:

- product, variant, media, lifecycle, publication and taxonomy contracts;
- admin product list/detail queries;
- product save, archive, restore, delete and taxonomy commands;
- validation, authorization rules and Prisma-to-domain mapping;
- browser API transport, TanStack Query keys, reads and mutations;
- public catalogue queries, public mapping, visibility rules and catalogue-page database pagination under `server/storefront/**`.

### Inventory

`src/modules/inventory/**` owns:

- stock balance and movement contracts;
- stock and variant write invariants;
- stock movement reads;
- stock-aware database filtering, sorting and pagination;
- Inventory summaries and saved-view counts;
- typed browser transport, TanStack Query reads and the stock-adjustment mutation;
- transactional stock adjustment with balance guards, optimistic concurrency, immutable ledger movement and audit event.

## Versioned API adapters

Implemented machine-readable adapters:

- `GET /api/v1/admin/products`
- `POST /api/v1/admin/products`
- `GET /api/v1/admin/products/[id]`
- `PATCH /api/v1/admin/products/[id]`
- `DELETE /api/v1/admin/products/[id]`
- `POST /api/v1/admin/products/[id]/archive`
- `POST /api/v1/admin/products/[id]/restore`
- `GET /api/v1/admin/products/taxonomy`
- `POST /api/v1/admin/products/taxonomy`
- `PATCH /api/v1/admin/products/taxonomy/[id]`
- `DELETE /api/v1/admin/products/taxonomy/[id]`
- `GET /api/v1/admin/inventory`
- `GET /api/v1/admin/inventory/stock-movements`
- `POST /api/v1/admin/inventory/adjustments`

Each adapter uses the Phase 3 request boundary, Zod validation, staff capability checks, request correlation, stable envelopes and direct domain operations. Route Handlers do not call Server Actions.

Publishing is represented by the existing product create/update contract with `intent: "publish"`. A separate unused publish endpoint was not introduced because no current consumer needs one.

## Browser cutover

Interactive admin consumers use:

```text
Client Component
  -> TanStack Query
  -> typed domain API client
  -> /api/v1 Route Handler
  -> domain query or command
  -> Prisma
```

Migrated consumers include:

- Inventory workspace and detail sheet;
- lifecycle controls;
- taxonomy manager;
- product editor;
- record-sale product selection and review;
- admin command menu.

The Inventory module also exposes a typed stock-adjustment request and TanStack mutation with invalidation for Inventory pages, product list/detail data and the admin overview. No existing UI was redesigned or forced to expose a new control during this architecture phase.

No TanStack mutation imports a Server Action.

## Public storefront cutover

Public product reads now have one Prisma implementation owner:

```text
src/modules/products/server/storefront/**
```

The following live consumers import the product module directly:

- shared catalogue loader;
- `/products` page;
- `/collections/[slug]` page.

The legacy `src/server/commerce/catalogue/**` query, mapper, visibility, page-selection and page-repository files are export-only compatibility shims. They contain no second Prisma implementation and remain only for unchanged legacy tests/imports until the approved Phase 9 deletion.

A broad architecture test scans production `src/**` files and fails if any consumer outside the legacy shim folder imports `@/server/commerce/catalogue/**`.

The previously duplicated storefront product writer was deleted. The runtime storefront smoke now creates through the canonical `saveProduct` command and reloads through the canonical public product query.

## Inventory database pagination

The Inventory workspace no longer downloads a fixed product collection and slices it in the browser.

PostgreSQL now handles:

- text search;
- saved views;
- inventory mode;
- stock health;
- category and collection;
- publication channel;
- sorting;
- page and page size;
- filtered total;
- global Inventory summary;
- saved-view counts.

Only requested product IDs are hydrated into detailed product read models. All saved views, including Intake, expose the existing pagination component.

## Removed legacy paths

Deleted or removed from production ownership:

- TanStack mutations importing Server Actions;
- Inventory Server Actions and their action-specific tests;
- the temporary architecture exception for that dependency;
- bespoke browser Inventory repository and tests;
- Inventory ownership from `AdminRepositories` and its provider;
- production in-memory Inventory repository fallback;
- unversioned `/api/admin/inventory/**` routes;
- transitional Inventory query-options and mutation files;
- former `src/server/commerce/inventory/**` implementation;
- duplicate storefront product writers and obsolete writer test;
- duplicate Prisma catalogue/query/page implementations from the legacy catalogue folder.

## Behavioral preservation

No intentional changes were made to:

- header or footer;
- homepage composition;
- product cards;
- catalogue or product-detail layouts;
- Inventory grid, table or editor composition;
- typography, spacing, colours, themes or breakpoints;
- dialogs, drawers or buttons.

The Intake view reuses the existing Inventory pagination component when the result spans multiple database pages. This exposes previously inaccessible results without creating a new visual system.

## Focused tests and evidence added

Source tests cover:

- product API authorization, pagination, create and validation behavior;
- Inventory API authorization, complete search parsing and page-size rejection;
- stock-adjustment API authorization, body validation, stable conflict mapping and successful response behavior;
- browser transport cancellation, method selection, URL serialization, adjustment error mapping and metadata;
- product transaction orchestration, durable media and uniqueness handling;
- stock balance preservation and variant-history protection;
- stock adjustment validation, variant ownership, concurrency protection, movement and audit writes;
- lifecycle archive, restore and permanent-delete safety;
- taxonomy creation, uniqueness and in-use protection;
- database Inventory page metadata, summaries and saved-view counts;
- public loader detail behavior through the canonical module mock;
- architecture protection against any renewed production legacy catalogue import.

HTTP smoke verifies health, the versioned admin product read contract and the protected Inventory adjustment mutation boundary. The runtime storefront smoke uses the canonical product write/read loop.

## Task status

| Task | Status | Evidence |
| --- | --- | --- |
| P4-T01 Phase 3 handoff and source map | Complete | Phase 3 debt and merge SHA recorded |
| P4-T02 Define product/inventory contracts | Complete | Canonical module-owned contracts |
| P4-T03 Move product definition/lifecycle/taxonomy/public-read ownership | Complete | `modules/products/**`; live storefront consumers use module paths |
| P4-T04 Move stock/movement/adjustment ownership | Complete | `modules/inventory/**`; old Inventory server implementation removed |
| P4-T05 Add authenticated versioned reads | Complete | Product, taxonomy, Inventory and movement endpoints |
| P4-T06 Typed API clients and TanStack reads | Complete | Direct module consumers with cancellation and keyed URL state |
| P4-T07 Versioned mutation endpoints | Complete | Product save/lifecycle/taxonomy and Inventory adjustment commands |
| P4-T08 Remove TanStack-to-Server-Action edge | Complete | Actions and exact exception deleted |
| P4-T09 Remove unversioned compatibility endpoints | Complete | Unversioned Inventory API routes deleted after consumer cutover |
| P4-T10 Persistence/auth/validation/error/invalidation parity | Implemented; execution pending | Focused source tests, cache rules and runtime smoke exist |
| P4-T11 Static, DB, unit, build, React Doctor, HTTP and Playwright gates | Pending execution | Requires final-head workflow results and artifacts |
| P4-T12 Reconcile Phase 3 validation debt | Pending | Requires executed evidence, not queue state |

## Certification rule

Phase 4 must not be called 10/10, fully validated or merge-ready until the current final head executes and passes:

- architecture guard and Biome;
- TypeScript;
- Prisma validation, migrations and database-backed checks;
- unit, component, integration and API contract tests;
- production build;
- React Doctor;
- HTTP smoke;
- desktop, tablet and mobile Playwright UI contract;
- retained workflow artifacts;
- review-thread and final-head reconciliation.

A queued, skipped, cancelled or superseded workflow is not passing evidence.

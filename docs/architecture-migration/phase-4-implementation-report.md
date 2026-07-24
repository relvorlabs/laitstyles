# Phase 4 — Products and Inventory Implementation Report

**Branch:** `refactor/phase-4-products-inventory-cutover`  
**Pull request:** #41  
**Status:** Implementation substantially complete; final validation is not yet executed  
**UI contract:** No intentional redesign

## Predecessor truth

Phase 4 starts from the merged Phase 3 foundation at merge commit `d7e3149c96f234d7deb41151ac603d6f652ceb4d`.

Phase 3 was merged with validation debt. Its final-head Implementation Quality and Playwright UI Contract runs (`30118703848` and `30118703866`) were queued without executing. Phase 4 must not reinterpret those runs as passing.

## Implemented architecture

### Product domain

Canonical product ownership now lives under `src/modules/products/**`:

- schemas and product/taxonomy identifiers;
- product, variant, media, lifecycle, publication and taxonomy contracts;
- admin product queries and ordered ID hydration;
- product save, lifecycle and taxonomy commands;
- product policy and rule enforcement;
- Prisma-to-domain mappers;
- cache invalidation;
- typed browser API client;
- TanStack Query keys, read options and mutations;
- public/storefront product queries and page read models under `server/storefront/**`.

### Inventory domain

Canonical stock ownership now lives under `src/modules/inventory/**`:

- stock balances and stock movement contracts;
- stock and variant write invariants;
- stock movement queries;
- inventory URL/search schema;
- stock-aware database filtering and sorting;
- database pagination;
- summary and saved-view counts;
- typed browser API client;
- TanStack Query keys and read options.

### Versioned API adapters

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

Each adapter uses Phase 3 request handling, Zod validation, staff capability checks, request correlation, stable envelopes and direct domain operations. No Route Handler calls a Server Action.

### Browser cutover

Interactive product and inventory consumers now use:

```text
Client Component
  → TanStack Query
  → typed domain API client
  → /api/v1 Route Handler
  → domain query or command
  → Prisma
```

The migrated consumers include the Inventory workspace, detail sheet, lifecycle controls, taxonomy manager, product editor, record-sale product selection and the admin command menu.

### Database pagination

The Inventory workspace no longer downloads a fixed product collection and paginates it in the browser.

The versioned Inventory endpoint validates every result-affecting URL value and executes stock-aware PostgreSQL filtering, searching, sorting, total counting, saved-view counting and summary aggregation before loading only the requested product page.

All saved views, including Intake, expose the existing pagination control.

### Removed legacy paths

Deleted:

- TanStack mutations importing Server Actions;
- the inventory Server Actions and their action-specific tests;
- the temporary architecture exception for that dependency;
- the bespoke browser inventory repository and its tests;
- inventory ownership from `AdminRepositories` and the provider;
- the in-memory inventory repository fallback;
- unversioned `/api/admin/inventory/**` routes;
- the transitional inventory query-options and mutation files;
- the former `src/server/commerce/inventory/**` implementation.

### Public catalogue transition

The canonical storefront product implementation now lives under:

```text
src/modules/products/server/storefront/**
```

The live catalogue loader imports the product module directly. Existing legacy catalogue files contain transitional exports only so unchanged page and test imports do not retain duplicate Prisma logic. Those export-only files are explicit legacy-deletion debt for the later cleanup phase; they are not represented as a second implementation.

## Behavioral preservation

No intentional changes were made to:

- header or footer;
- homepage composition;
- product cards;
- catalogue and product-detail layouts;
- admin Inventory grid/table/editor composition;
- typography, spacing, colours, themes or breakpoints;
- dialogs, drawers or button presentation.

The Intake view now reuses the existing Inventory pagination component when more than one database page exists. This is a correctness repair required by database pagination, not a new visual system.

## Tests and evidence added

Focused tests now cover:

- product collection API authorization, pagination and create validation;
- Inventory API authorization, complete search parsing and page-size rejection;
- product browser transport, cancellation, POST/PATCH selection and field-error mapping;
- Inventory browser URL serialization, cancellation and response metadata;
- product command transaction orchestration, durable media and uniqueness mapping;
- stock balance preservation and variant-history protection;
- product lifecycle archive, restore and deletion safety;
- taxonomy creation, uniqueness and in-use protection;
- database inventory page metadata, summaries and saved-view counts.

The HTTP smoke suite now verifies `/api/v1/admin/products` success or authorization envelopes in addition to the Phase 3 health endpoint.

## Task status

| Task | Status | Evidence |
| --- | --- | --- |
| P4-T01 Phase 3 handoff and source map | Complete | Phase 3 debt and exact merge SHA recorded |
| P4-T02 Define product/inventory contracts | Complete | Canonical module-owned contracts |
| P4-T03 Move product definition/lifecycle/taxonomy ownership | Complete | `modules/products/**`; legacy public files export only |
| P4-T04 Move stock/movement ownership | Complete | `modules/inventory/**`; old inventory server folder deleted |
| P4-T05 Add authenticated versioned reads | Complete | Product, taxonomy, inventory and movement endpoints |
| P4-T06 Typed API clients and TanStack reads | Complete | Direct module consumers with cancellation and keyed URL state |
| P4-T07 Versioned mutation endpoints | Complete | Save, archive, restore, delete and taxonomy commands |
| P4-T08 Remove TanStack-to-Server-Action edge | Complete | Actions and exception deleted |
| P4-T09 Remove compatibility endpoints | Complete | Unversioned inventory API routes deleted |
| P4-T10 Persistence/auth/validation/error/invalidation parity | Implemented; execution pending | Focused tests and cache rules exist; final suites not executed |
| P4-T11 Static, DB, unit, build, React Doctor, HTTP and Playwright gates | Pending execution | Current final-head workflows remain queued |
| P4-T12 Reconcile Phase 3 validation debt | Pending | Requires executed evidence, not queue state |

## 10/10 certification rule

Phase 4 must not be called 10/10, complete, validated or merge-ready until the current final head has executed and passed:

- formatting and Biome;
- architecture guard;
- TypeScript;
- Prisma validation and database-backed tests;
- unit/integration/API contract tests;
- production build;
- React Doctor;
- HTTP smoke;
- Playwright UI contract with retained artifacts;
- review-thread and final-head reconciliation.

A queued, skipped, cancelled or superseded run is not passing evidence.

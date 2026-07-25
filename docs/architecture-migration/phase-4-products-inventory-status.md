# Phase 4 — Products and Inventory Cutover Status

**Branch:** `refactor/phase-4-products-inventory-cutover`  
**Base merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Pull request:** #41  
**Source status:** Complete  
**Certification status:** Pending executed final-head evidence  
**UI contract:** No intentional redesign

## Predecessor truth

Phase 3 was merged with validation debt. Its final-head Implementation Quality and Playwright runs (`30118703848` and `30118703866`) did not execute before merge. Phase 4 does not reinterpret queued, skipped, cancelled or superseded runs as passing evidence.

## Current architecture

Interactive admin consumers use:

```text
Client Component
  -> TanStack Query
  -> typed module API client
  -> /api/v1 Route Handler
  -> product or inventory domain operation
  -> Prisma
```

Server-rendered storefront reads use:

```text
Server Component or server loader
  -> modules/products/server/storefront/**
  -> Prisma
```

Product owns definition, lifecycle, taxonomy and public product read models. Inventory owns balances, movements, database pagination and stock adjustments. Catalogue remains a public read-model term rather than a second persistence domain.

## Completed source work

- Product and inventory contracts are module-owned.
- Product save, lifecycle and taxonomy commands are module-owned and Prisma-backed.
- Inventory balances, stock movements, page filtering, aggregation and adjustment are module-owned.
- Product and inventory browser consumers use typed API clients and TanStack Query.
- Versioned authenticated endpoints replace the unversioned Inventory API.
- The stock-adjustment command is exposed through a validated versioned endpoint, typed request client and TanStack mutation with targeted invalidation.
- TanStack mutations no longer import Server Actions.
- The bespoke browser Inventory repository and production in-memory fallback are deleted.
- Inventory list pagination, filtering, sorting, totals and saved-view counts execute in PostgreSQL.
- Public catalogue queries, mappers, visibility rules and page pagination have one implementation owner under `src/modules/products/server/storefront/**`.
- The live catalogue loader, collection page and products page import that module directly.
- `src/server/commerce/catalogue/**` contains export-only compatibility shims; it contains no duplicate Prisma implementation.
- The duplicate storefront product writer and its obsolete test were deleted.
- The runtime storefront smoke uses the same canonical `saveProduct` command as the API.
- A transactional inventory adjustment command guards invalid balances and concurrent changes, then records an immutable stock movement and audit event.
- An architecture test rejects any production `src/**` import from the legacy catalogue path.

## Versioned APIs

- `GET/POST /api/v1/admin/products`
- `GET/PATCH/DELETE /api/v1/admin/products/[id]`
- `POST /api/v1/admin/products/[id]/archive`
- `POST /api/v1/admin/products/[id]/restore`
- `GET/POST /api/v1/admin/products/taxonomy`
- `PATCH/DELETE /api/v1/admin/products/taxonomy/[id]`
- `GET /api/v1/admin/inventory`
- `GET /api/v1/admin/inventory/stock-movements`
- `POST /api/v1/admin/inventory/adjustments`

Publishing is an explicit `publish` intent on the existing create/update product contract. A separate unused publish route was not added because no current consumer requires it.

## Task state

| ID | Task | Status |
| --- | --- | --- |
| P4-T01 | Record Phase 3 handoff and source map | Complete |
| P4-T02 | Define product and inventory contracts | Complete |
| P4-T03 | Move product definition, lifecycle, taxonomy and public reads | Complete |
| P4-T04 | Move stock, movement and adjustment ownership | Complete |
| P4-T05 | Add authenticated versioned reads | Complete |
| P4-T06 | Replace bespoke browser reads with typed clients and TanStack Query | Complete |
| P4-T07 | Add versioned product, taxonomy and inventory mutations | Complete |
| P4-T08 | Remove TanStack-to-Server-Action mutations and exception | Complete |
| P4-T09 | Remove unversioned Inventory endpoints after consumer cutover | Complete |
| P4-T10 | Prove authorization, validation, errors, persistence and invalidation | Implemented; execution pending |
| P4-T11 | Pass static, DB, unit, build, React Doctor, HTTP and Playwright gates | Pending execution |
| P4-T12 | Reconcile Phase 3 validation debt with executed evidence | Pending execution |

## Current final-head evidence

The latest final-head workflows must execute and pass before Phase 4 can be called complete, 10/10 or merge-ready. Required evidence:

- architecture guard and Biome;
- TypeScript;
- Prisma validation, migration and database-backed checks;
- unit, component, integration and API contract tests;
- production build;
- React Doctor;
- HTTP smoke;
- desktop, tablet and mobile Playwright UI contract;
- retained workflow artifacts;
- final review-thread reconciliation.

A queued workflow is not a pass.

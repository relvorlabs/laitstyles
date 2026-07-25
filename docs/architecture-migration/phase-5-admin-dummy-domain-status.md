# Phase 5 — Admin Dummy Domain Cutover Status

**Branch:** `refactor/phase-5-admin-dummy-domain-cutover`  
**Base merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Pull request:** #43  
**Source status:** Complete for the approved Phase 5 scope  
**Certification status:** Pending exact-head executed evidence  
**Merge status:** Draft and unmerged  
**UI contract:** Existing admin composition, typography, spacing, themes and responsive behavior preserved except the explicitly approved Paystack payment-control correction

## Decision authority

The owner-supplied architecture decision remains the controlling contract:

```text
Client Component
  -> TanStack Query
  -> typed API client
  -> versioned Route Handler
  -> authenticated domain query/command
  -> Prisma
```

Production admin business records must not be owned by seed arrays, AdminStore, reducer persistence or in-memory repositories.

## Phase 5 source result

| Domain | Persisted reads | Persisted commands | Typed API/TanStack | Legacy consumer cutover | Source status |
| --- | ---: | ---: | ---: | ---: | ---: |
| Orders | Complete | Complete | Complete | Complete | Implemented and repaired |
| Holds | Complete | Complete | Complete | Complete | Implemented |
| Returns | Complete | Complete | Complete | Complete | Implemented |
| Customers | Complete | Complete | Complete | Complete | Implemented |
| Settings | Complete | Complete | Complete | Complete | Implemented and concurrency-hardened |
| Overview | Complete | Read projection | Complete | Complete | Implemented |
| Seed/store/repository removal | — | — | — | Complete | Implemented |

Source-complete does not mean certified. Exact-head static, database, runtime and browser evidence must still execute successfully.

## Orders

```text
Orders UI
  -> modules/orders/client/hooks
  -> modules/orders/client/api
  -> /api/v1/admin/orders/**
  -> modules/orders/server/**
  -> Prisma
```

Delivered and repaired:

- database list/detail reads with filtering, search, sorting, summaries and pagination;
- URL-owned query and selected-order state;
- authenticated transition, sale-customer and in-person-sale endpoints;
- persisted Paystack-ready customer options;
- exact order-linked stock reservation for in-person checkout;
- no client-authoritative cash, POS, transfer, paid or deposit fields;
- pre-delivery returns prohibited;
- delivery and cancellation stock transitions corrected;
- distinct stock-write conflicts retained through HTTP;
- reducer-backed Orders mutations and duplicate pagination removed.

Phase 8 still owns signed Paystack settlement, verification, webhooks, idempotency and final payment reconciliation.

## Holds

```text
Holds UI
  -> modules/holds/client/hooks
  -> modules/holds/client/api
  -> /api/v1/admin/holds/**
  -> modules/holds/server/**
  -> Prisma
```

Delivered:

- database list/detail reads and pagination;
- exact UUID and customer/product/SKU search;
- URL-owned filters, sort, page and selected hold;
- authenticated extend, release and convert commands;
- transaction-safe expiry changes;
- exact reserved-stock release;
- pending-payment conversion that preserves the reservation;
- no client-declared payment success;
- legacy Hold reducer, mutation, query adapter and duplicate query keys removed.

## Returns

```text
Returns UI
  -> modules/returns/client/hooks
  -> modules/returns/client/api
  -> /api/v1/admin/returns/**
  -> modules/returns/server/**
  -> Prisma
```

Delivered:

- database list/detail reads, saved views, search, sort, summaries and pagination;
- eligible delivered-line projection for return creation;
- authenticated create and transition routes;
- transaction advisory locks for line eligibility and return transitions;
- quantity checks against previously returned units;
- sold-to-returned stock receipt;
- returned-to-available restock;
- returned-to-damaged disposition;
- persisted refund accounting that explicitly does not impersonate a payment-provider refund;
- exact order, line, payment, stock, activity and audit updates;
- legacy Return reducer, query adapter and mutation ownership removed.

## Customers

```text
Customers UI
  -> modules/customers/client/hooks
  -> modules/customers/client/api
  -> /api/v1/admin/customers/**
  -> modules/customers/server/**
  -> Prisma
```

Delivered:

- database segmentation, filtering, sorting and pagination;
- relationship value, order, hold, return, cancellation and review metrics;
- persisted addresses, delivery history, notes, activities and product relationships;
- authenticated detail and note routes;
- persisted note, activity and audit writes in one transaction;
- no browser joins against AdminState product/order/customer arrays;
- legacy Customer reducer, repository query adapter, mutation and duplicate keys removed.

## Settings

```text
Settings UI
  -> modules/settings/client/hooks
  -> modules/settings/client/api
  -> /api/v1/admin/settings
  -> modules/settings/server/**
  -> Prisma
```

Delivered:

- persisted `store_settings` singleton for identity, selling, payments and notifications;
- normalized delivery zones and pickup locations;
- transactional saves across singleton and normalized delivery records;
- removed delivery records disabled rather than deleted to preserve historical references;
- explicitly namespaced supplemental pickup fields persisted through the settings JSON contract;
- first-read baseline persisted on the server rather than hydrated in the browser;
- advisory-lock and upsert protection for concurrent first-read initialization;
- legacy Settings reducer, repository adapter and mutation ownership removed.

## Overview

```text
Overview UI
  -> modules/overview/client/hooks
  -> modules/overview/client/api
  -> /api/v1/admin/overview
  -> modules/overview/server/queries
  -> Prisma projections
```

Delivered persisted projections for:

- today’s revenue split by online and offline channel;
- order and unit counts;
- active and expiring holds;
- fulfilment lane counts;
- attention items;
- open-order previews;
- low-stock and unpublished products;
- seven-day sales pulse;
- recent activity;
- continue-working intake state.

The production `?view=new-store` seed shortcut was removed.

## Final legacy deletion

The production chain is removed:

```text
activeAdminSeed
  -> AdminShell(initialState)
  -> AdminStore
  -> AdminRepositoryProvider
  -> createInMemoryAdminRepositories
```

Deleted production ownership includes:

- `src/features/admin/state/admin-store.ts`;
- admin repository context;
- repository contracts;
- in-memory repository implementation;
- `src/lib/admin/shared/admin-seed.ts`;
- all physical `src/lib/admin/shared/seed/**` business fixtures;
- migrated Orders, Holds, Returns, Customers and Settings reducers/mutation/query adapters;
- obsolete seed-backed reducer tests.

The remaining admin provider holds only a local reporting-date value used for CSV filenames. It does not own persistent business records.

## Permanent architecture guard

`src/modules/admin-persistence-boundary.test.ts` now enforces:

- production code cannot import the deleted seed, AdminStore or repository paths;
- production code cannot import test/story/development fixtures;
- Orders, Holds, Returns, Customers, Settings and Overview consumers remain off legacy ownership;
- deleted seed/store/repository/reducer paths remain absent;
- canonical module and versioned API ownership remains present;
- in-person checkout and Hold conversion cannot restore browser-authoritative paid/cash/POS/transfer controls.

The stale guard under `src/lib/admin/data/in-memory/**` was deleted.

## Canonical tests added

New canonical route tests cover:

- Returns authorization, URL parsing and paginated envelope;
- Customers authorization, segmentation/search/sort parsing and paginated envelope;
- Settings authorization, persisted singleton read and private no-store behavior;
- Overview authorization, persisted projection read and private no-store behavior.

Existing Orders and Holds command/route tests remain the canonical coverage for their domains.

## HTTP smoke expansion

The retained HTTP smoke now probes:

- Products;
- Holds;
- Returns;
- Customers;
- Settings;
- Overview;
- Inventory adjustment authorization;
- Hold release authorization.

A `200` response must match the versioned resource or pagination envelope. Anonymous protected responses must match the standard error envelope and include request correlation headers.

## Source audit result

The manual TypeScript/Prisma review covered:

- generated relation names used by Returns, Customers, Settings and Overview;
- persisted enum mappings for Returns dispositions and terminal UI states;
- transaction boundaries and advisory locks;
- customer metric SQL against the current schema;
- Settings normalized-row and singleton ownership;
- Overview product/order/stock projections;
- cross-domain query invalidation.

Concrete repair made during the audit:

- Settings first-read initialization now takes a transaction advisory lock and uses an idempotent singleton upsert.

This is source review, not a replacement for compiler, migration or runtime execution.

## Task matrix

| ID | Task | Source status | Evidence status |
| --- | --- | --- | --- |
| P5-T01 | Record Phase 4 merge and unresolved debt | Complete | Recorded |
| P5-T02 | Freeze seed/provider/repository/query/mutation map | Complete | Recorded |
| P5-T03 | Orders module, APIs and database pagination | Complete | Exact-head execution pending |
| P5-T04 | In-person Paystack sale and exact reservation | Complete and repaired | Exact-head execution pending |
| P5-T05 | Orders consumer/reducer cutover | Complete | Exact-head execution pending |
| P5-T06 | Holds reads and transactional commands | Complete | Exact-head execution pending |
| P5-T07 | Holds consumer/repository cutover | Complete | Exact-head execution pending |
| P5-T08 | Returns reads, creation and transitions | Complete | Exact-head execution pending |
| P5-T09 | Returns consumer/reducer cutover | Complete | Exact-head execution pending |
| P5-T10 | Customer reads, detail and notes | Complete | Exact-head execution pending |
| P5-T11 | Customer consumer/repository cutover | Complete | Exact-head execution pending |
| P5-T12 | Persisted Store settings | Complete | Exact-head execution pending |
| P5-T13 | Settings consumer/default-hydration cutover | Complete | Exact-head execution pending |
| P5-T14 | Database-backed Overview projections | Complete | Exact-head execution pending |
| P5-T15 | Remove AdminRepositories/context | Complete | Guard execution pending |
| P5-T16 | Remove AdminStore and active admin seed | Complete | Guard execution pending |
| P5-T17 | Remove duplicate legacy implementations | Complete for Phase 5 domains | Guard execution pending |
| P5-T18 | Permanent seed/store/repository/reducer guards | Complete | Test execution pending |
| P5-T19 | Persistence/auth/error/invalidation/reload proof | Source tests and smoke authored | Database/runtime execution pending |
| P5-T20 | Static, DB, test, build, React Doctor, HTTP and Playwright gates | Requested | Exact-head execution pending |

## Certification rule

Phase 5 is certified only when the exact final head executes and passes:

- architecture guard and Biome;
- TypeScript;
- Prisma validation, migration deployment/status and database integrity;
- unit, component, integration and API tests;
- production build;
- React Doctor;
- HTTP smoke;
- desktop, tablet and mobile Playwright UI contract;
- retained artifacts and review reconciliation.

Queued, skipped, cancelled, superseded or unavailable runs are not passing evidence. PR #43 remains draft and unmerged until the repository owner explicitly directs otherwise.

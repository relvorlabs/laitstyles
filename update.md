# Laitstyles Architecture Decision and Migration Review

**Document type:** Architecture decision canvas and execution plan
**Status:** Approved target direction
**Date:** July 24, 2026
**Repository:** `relvorlabs/laitstyles`

---

# 1. Purpose

This document defines the architecture Laitstyles will migrate toward and converts the earlier architecture review into an actionable, phased implementation plan.

This is not an argument between different architecture styles. The decisions below are the working direction for the codebase unless repository evidence discovered during implementation proves that a specific decision is unsafe.

The migration has four primary goals:

1. Remove production dummy data, in-memory repositories, duplicated caches, and misleading asynchronous abstractions.
2. Establish a clear API-first data path for interactive Client Components.
3. Organize shared business capabilities by domain rather than separately duplicating them across storefront and admin.
4. Preserve the current user interface and every intentional visual and responsive behaviour.

---

# 2. Non-negotiable UI preservation contract

This architecture migration must not redesign the application.

Every phase must preserve the existing:

* header;
* footer;
* homepage composition;
* product cards;
* catalogue layout;
* product-detail page;
* account layouts;
* cart and checkout presentation;
* admin layout;
* typography;
* font sizes and weights;
* colours and theme behaviour;
* spacing;
* borders and shadows;
* image aspect ratios;
* animation behaviour;
* responsive breakpoints;
* mobile navigation;
* desktop navigation;
* component positioning;
* button appearance;
* form appearance;
* modal and drawer appearance.

Architecture changes may alter data ownership, file placement, imports, server boundaries, API transport, state management, caching, and validation.

They must not alter visible presentation unless a change is required to fix an existing verified defect.

## UI implementation rule

During migration:

* preserve existing JSX structure where possible;
* preserve existing class names and styling tokens;
* move components instead of rewriting them;
* avoid replacing working UI components merely because a different abstraction is preferred;
* do not combine architecture migration with visual cleanup;
* do not introduce new layouts, cards, dialogs, tables, buttons, or typography;
* do not rename visible labels unless the label is factually incorrect;
* do not change route URLs unless an explicit redirect preserves the original route.

Any unexpected screenshot difference is considered a regression until proven intentional.

---

# 3. Executive architecture decision

Laitstyles will use the following architecture:

> **Domain modules, API-first browser data access, direct server access for Server Components, optional thin Server Actions, TanStack Query for remote client state, Zustand for browser-owned shared state, and Prisma as the persistent source of truth.**

The standard browser data flow will be:

```text
Client Component
  → TanStack Query hook
  → typed API client
  → Route Handler
  → domain use case
  → Prisma
```

Server-rendered reads will use:

```text
Server Component
  → domain query/use case
  → Prisma
```

Form-specific Server Actions may use:

```text
Form or Client Component
  → thin Server Action
  → domain command/use case
  → Prisma
```

External callbacks will use:

```text
Webhook
  → Route Handler
  → domain use case
  → Prisma transaction
```

The following flow is prohibited:

```text
Client
  → Route Handler
  → Server Action
  → Prisma
```

A Route Handler and a Server Action are separate transport adapters. Neither should call the other for code reuse.

Both may call the same domain use case.

---

# 4. Locked architecture decisions

| ID     | Decision                                                              | Required outcome                                                                               |
| ------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| ADR-01 | Client-side remote data uses TanStack Query through typed API clients | Client Components do not import database functions or server actions as query functions        |
| ADR-02 | Route Handlers call domain use cases directly                         | No Route Handler calls a Server Action                                                         |
| ADR-03 | Server Components read directly from domain server queries            | Server Components do not call internal API routes                                              |
| ADR-04 | Server Actions remain optional and thin                               | Actions contain transport concerns, not reusable business logic                                |
| ADR-05 | Runtime dummy and in-memory data are removed                          | Production screens read persisted data rather than local fixture arrays                        |
| ADR-06 | Business code is organized by domain modules                          | Products, inventory, orders, customers, payments, and returns are not duplicated by surface    |
| ADR-07 | Storefront and admin share domains, not unrestricted actions          | Access policies and audience-specific queries control capabilities                             |
| ADR-08 | Product is the canonical sellable-item domain                         | Catalogue and inventory must not be used as synonyms for product                               |
| ADR-09 | URL owns navigation state                                             | Filters, pagination, sorting, search, and selected route tabs remain in the URL                |
| ADR-10 | TanStack Query owns remote client state                               | Product, inventory, order, customer, and payment server data do not live in Zustand            |
| ADR-11 | Zustand owns shared browser state                                     | Cart UI, saved items, drawers, overlays, and other browser-owned state may use Zustand         |
| ADR-12 | `useState` owns component-local state                                 | Local dialog fields and temporary component state stay local                                   |
| ADR-13 | Prisma owns persistent business state                                 | Orders, products, inventory, payments, customers, and returns are not client-authoritative     |
| ADR-14 | The top-level `server/**` catch-all is retired                        | Server code lives under the domain module that owns it                                         |
| ADR-15 | `features/**` is replaced by explicit domain modules                  | “Feature” no longer means components, state, data, server actions, and adapters simultaneously |
| ADR-16 | Query and mutation files are kept minimal                             | Files are split only when they own a distinct responsibility                                   |
| ADR-17 | TanStack Query is scoped to surfaces that need it                     | QueryProvider is not automatically application-wide                                            |
| ADR-18 | Architecture work preserves the UI                                    | No phase may intentionally redesign existing screens                                           |

---

# 5. Data-source rule: API routes must replace dummy data

The objective is not merely to place an API endpoint in front of existing dummy arrays.

This does not satisfy the migration:

```text
Client
  → API Route
  → in-memory repository
  → dummy array
```

This also does not satisfy it:

```text
Client
  → TanStack Query
  → fake Promise
  → local AdminStore
```

The required result is:

```text
Client
  → API Route
  → authenticated domain use case
  → Prisma
  → persisted database data
```

For Server Components, the required result is:

```text
Server Component
  → authenticated or public domain query
  → Prisma
```

## Allowed dummy data locations

Dummy data may remain only in:

```text
tests/fixtures/
tests/factories/
stories/fixtures/
scripts/seed/
development/fixtures/
```

Production route files, production providers, production hooks, and production domain modules must not import these fixtures.

## Production-data acceptance rule

A domain is not considered migrated until:

* its lists come from the database;
* its details come from the database;
* its mutations write to the database;
* reloads retain changes;
* authorization is enforced on the server;
* client cache invalidation works;
* no runtime fallback silently restores mock data.

---

# 6. Domain language contract

Contradictory naming is a major source of the current confusion. The following definitions are now authoritative.

## 6.1 Product

A **product** is the canonical sellable-item definition.

It may include:

* name;
* slug;
* description;
* media;
* pricing;
* category;
* collection;
* variants;
* sizes;
* colours;
* product status;
* publication status;
* merchandising information.

The canonical domain and folder name is:

```text
products
```

Avoid using `catalogue`, `inventory`, `piece`, or `storefront-product` as interchangeable replacements for the product domain.

---

## 6.2 Inventory

**Inventory** represents stock and availability associated with products.

It may include:

* stock quantity;
* individual pieces;
* SKU;
* stock movements;
* reservations;
* holds;
* sold state;
* warehouse or location;
* availability;
* damaged or returned stock.

Inventory is not a replacement name for products.

A product may exist while inventory is zero.

---

## 6.3 Catalogue

The **catalogue** is a public read model of published products.

It includes:

* product browsing;
* public search;
* public filters;
* public sorting;
* category views;
* collection views;
* product-card projections.

Catalogue is not a CRUD domain.

Do not create catalogue commands such as:

```text
createCatalogueProduct
deleteCatalogueProduct
archiveCatalogueProduct
```

Those belong to products.

The word `catalogue` may remain in UI names such as:

```text
ProductCatalogue
CatalogueFilters
CatalogueGrid
```

It should not become a second product persistence layer.

Use the British spelling `catalogue` consistently. Do not mix `catalog` and `catalogue`.

---

## 6.4 Storefront

**Storefront** describes the customer-facing application surface.

It includes:

* site header;
* site footer;
* homepage;
* product cards;
* catalogue presentation;
* product-detail presentation;
* cart presentation;
* saved-items presentation;
* customer-facing overlays.

Storefront must not own Prisma queries, product persistence, inventory persistence, or payment settlement.

---

## 6.5 Admin

**Admin** describes the staff-facing application surface.

It includes:

* admin navigation;
* admin shells;
* product management UI;
* inventory management UI;
* order management UI;
* customer management UI;
* reporting UI;
* settings UI.

Admin is not a business domain.

Do not create duplicate admin-specific persistence merely because the UI is under `/admin`.

Admin UI calls the same product, inventory, order, and customer domains with staff permissions.

---

## 6.6 Commerce

`commerce` is a conceptual umbrella covering:

* products;
* inventory;
* orders;
* checkout;
* payments;
* returns.

It will not be used as an additional folder layer under `src`.

Avoid:

```text
src/server/commerce/products/
src/server/commerce/inventory/
```

Prefer direct domain ownership:

```text
src/modules/products/
src/modules/inventory/
```

---

## 6.7 Repository

The word `repository` is reserved for a real infrastructure abstraction.

It is justified only when Laitstyles genuinely needs to switch or isolate persistence implementations, for example:

* Prisma versus another database adapter;
* local database versus external commerce platform;
* production storage versus a test implementation;
* a third-party fulfilment provider;
* multiple actual persistence mechanisms.

Do not call a wrapper around an array, React store, or `fetch()` function a repository merely for architectural symmetry.

Prefer:

```text
queries.ts
commands.ts
api.ts
policy.ts
mappers.ts
```

unless a repository boundary is truly required.

---

# 7. State ownership matrix

Every state value must have one clear owner.

| State type                     | Owner                   | Examples                                                   |
| ------------------------------ | ----------------------- | ---------------------------------------------------------- |
| Persistent business data       | Prisma                  | Products, inventory, orders, payments, customers, returns  |
| Remote browser cache           | TanStack Query          | Product list, inventory page, order list, customer details |
| Route and navigation state     | URL search parameters   | Page, filters, sorting, search, selected status            |
| Shared browser-owned state     | Zustand                 | Guest cart, saved IDs, drawer visibility, search overlay   |
| Local component state          | `useState` or reducer   | Input value, local step, temporary open state              |
| Form validation                | React Hook Form and Zod | Product editor, address form, authentication form          |
| Server-rendered data           | Server Component props  | Initial public product page, account order detail          |
| Authentication and permissions | Server session/policy   | Staff capabilities, customer access, anonymous access      |

## Prohibited ownership

Do not store these in Zustand:

* complete product collections;
* orders;
* inventory records;
* customer records;
* payment status as authoritative state;
* server permissions;
* admin CRUD records.

Do not store these in TanStack Query:

* purely local modal state;
* cart drawer visibility;
* temporary tab animation state;
* static constants;
* local arrays masquerading as server data.

Do not keep these in both the URL and React context:

* page number;
* sort;
* product filters;
* search text that affects navigation;
* selected catalogue category.

---

# 8. Data-flow decisions by consumer

## 8.1 Public Server Component read

Use for:

* homepage products;
* collection pages;
* product-detail pages;
* public catalogue initial render;
* SEO-sensitive content;
* account pages rendered on the server.

```text
Page
  → modules/products/server/queries
  → Prisma
  → read model
  → UI component
```

Do not call `/api/v1/products` from the Server Component.

---

## 8.2 Interactive Client Component read

Use for:

* admin tables;
* infinite queries;
* client-side pagination;
* background refresh;
* searchable command interfaces;
* live order status;
* customer-side interactive history;
* client-owned filtering where the page remains mounted.

```text
Client Component
  → useProducts()
  → productsApi.list()
  → GET /api/v1/...
  → product query
  → Prisma
```

---

## 8.3 Client Component mutation

Use for:

* create product;
* update product;
* archive product;
* stock adjustment;
* cancel order;
* approve return;
* customer update;
* admin settings update.

```text
Client Component
  → useMutation()
  → typed API client
  → POST/PATCH/DELETE Route Handler
  → domain command
  → Prisma transaction
```

TanStack Query then updates or invalidates the relevant cache.

---

## 8.4 Server Action

Keep only where it provides a clear advantage:

* progressively enhanced form;
* form that must work before client hydration;
* route-owned mutation requiring `redirect()`;
* mutation tightly coupled to Next.js revalidation;
* authentication form where direct action handling remains simpler.

A Server Action should be thin:

```text
Validate transport input
  → call domain use case
  → map result
  → redirect or revalidate
```

It must not contain reusable database rules that API routes need to duplicate.

---

## 8.5 Webhook

Use Route Handlers for:

* Paystack webhooks;
* delivery callbacks;
* external integrations;
* event notifications.

Webhooks call the same idempotent domain settlement operation used by verification endpoints.

---

# 9. Target source architecture

```text
src/
├── app/
│   ├── layout.tsx
│   │
│   ├── (storefront)/
│   │   ├── layout.tsx
│   │   ├── (home)/
│   │   │   └── page.tsx
│   │   ├── products/
│   │   ├── collections/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── order-confirmation/
│   │   └── account/
│   │       ├── layout.tsx
│   │       ├── orders/
│   │       ├── profile/
│   │       ├── addresses/
│   │       └── privacy/
│   │
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── orders/
│   │   ├── holds/
│   │   ├── returns/
│   │   ├── customers/
│   │   └── settings/
│   │
│   ├── auth/
│   │   ├── actions.ts
│   │   ├── callback/
│   │   │   └── route.ts
│   │   ├── google/
│   │   │   └── route.ts
│   │   ├── sign-out/
│   │   │   └── route.ts
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │     └── reset-password/
│   │
│   └── api/
│       └── v1/
│           ├── products/
│           ├── inventory/
│           ├── admin/
│           │   ├── products/
│           │   ├── inventory/
│           │   ├── orders/
│           │   ├── holds/
│           │   ├── returns/
│           │   ├── customers/
│           │   └── settings/
│           ├── account/
│           │   ├── orders/
│           │   ├── profile/
│           │   └── addresses/
│           ├── checkout/
│           └── payments/
│               ├── initialize/
│               ├── verify/
│               └── webhook/
│
├── modules/
│   ├── auth/
│   ├── products/
│   ├── inventory/
│   ├── orders/
│   ├── holds/
│   ├── returns/
│   ├── customers/
│   ├── cart/
│   ├── checkout/
│   ├── payments/
│   ├── delivery/
│   ├── storefront-shell/
│   └── admin-shell/
│
├── components/
│   └── ui/
│
├── hooks/
│   ├── use-debounced-value.ts
│   ├── use-media-query.ts
│   ├── use-mounted.ts
│   └── use-document-visibility.ts
│
├── stores/
│   ├── cart.store.ts
│   ├── saved-items.store.ts
│   └── storefront-ui.store.ts
│
├── providers/
│   ├── app-provider.tsx
│   ├── theme-provider.tsx
│   └── toaster.tsx
│
└── lib/
    ├── prisma/
    ├── supabase/
    ├── http/
    ├── errors/
    ├── logging/
    ├── money.ts
    └── utils.ts
```

---

# 10. Domain module contract

Each business domain owns its complete implementation without becoming a dumping ground.

Example:

```text
src/modules/products/
├── schema.ts
├── types.ts
│
├── server/
│   ├── queries.ts
│   ├── commands.ts
│   ├── policy.ts
│   └── mappers.ts
│
├── client/
│   ├── api.ts
│   ├── hooks.ts
│   └── keys.ts
│
└── ui/
    ├── storefront/
    │   ├── product-card.tsx
    │   ├── product-grid.tsx
    │   └── product-detail.tsx
    │
    └── admin/
        ├── product-table.tsx
        ├── product-editor.tsx
        └── product-editor-dialog.tsx
```

## Module responsibilities

### `schema.ts`

Contains transport and domain input schemas where sharing is appropriate.

Examples:

* product list query schema;
* create-product input;
* update-product input;
* product identifier schema.

### `types.ts`

Contains domain contracts and public read models.

Avoid one global `types.ts` containing every application domain.

### `server/queries.ts`

Contains read-only server operations.

Examples:

```ts
listPublicProducts()
getPublicProductBySlug()
listAdminProducts()
getAdminProductById()
```

### `server/commands.ts`

Contains server-side mutations.

Examples:

```ts
createProduct()
updateProduct()
publishProduct()
archiveProduct()
deleteProduct()
```

### `server/policy.ts`

Contains access and capability rules.

Examples:

```ts
canReadDraftProducts()
canManageProducts()
canDeleteProducts()
```

### `server/mappers.ts`

Maps database records to explicit read models.

Mapping should exist only where the database shape is not appropriate for transport or presentation.

### `client/api.ts`

Contains browser HTTP calls only.

It must not import Prisma, server sessions, or Server Actions.

### `client/hooks.ts`

Contains TanStack Query hooks.

It may import:

* query functions from `client/api.ts`;
* query keys;
* client-compatible types.

It must not import domain server modules.

### `ui/**`

Contains the existing visual components.

Storefront and admin presentation may differ while sharing the same domain data.

---

# 11. API contract decision

## 11.1 API prefix

Machine-readable application APIs use:

```text
/api/v1/**
```

Browser redirect flows such as OAuth callbacks may remain under:

```text
/auth/**
```

Not every `route.ts` file belongs under `/api`.

The route path depends on whether it is:

* a browser navigation flow;
* or a machine-readable API.

---

## 11.2 Success response

List response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 0,
    "pageCount": 0
  }
}
```

Single-resource response:

```json
{
  "data": {}
}
```

Mutation response:

```json
{
  "data": {},
  "meta": {
    "message": "Product updated."
  }
}
```

---

## 11.3 Error response

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "The selected product could not be found.",
    "fieldErrors": {
      "name": "Enter a product name."
    }
  }
}
```

Every API error should have:

* stable machine-readable code;
* human-readable message;
* appropriate HTTP status;
* optional field errors;
* no leaked stack trace;
* no raw database error.

---

## 11.4 HTTP status rules

| Status | Meaning                                         |
| ------ | ----------------------------------------------- |
| `200`  | Successful read or update                       |
| `201`  | Resource created                                |
| `204`  | Successful operation with no body               |
| `400`  | Invalid request shape                           |
| `401`  | User is not authenticated                       |
| `403`  | User lacks required permission                  |
| `404`  | Resource does not exist or must not be revealed |
| `409`  | State conflict, duplicate, reservation conflict |
| `422`  | Valid request shape but invalid domain input    |
| `429`  | Rate limit reached                              |
| `500`  | Unexpected internal failure                     |

---

# 12. Authentication route decision

The following routes may remain under `app/auth/**`:

```text
/auth/google
/auth/callback
/auth/sign-out
```

They are browser flows that redirect rather than general JSON APIs.

The architectural defect is not their URL.

The defect is fragmented ownership across:

```text
app/auth/actions.ts
lib/auth/server/**
server/auth/**
```

## Target auth ownership

```text
src/modules/auth/
├── schema.ts
├── types.ts
├── server/
│   ├── session.ts
│   ├── authenticate.ts
│   ├── account-provisioning.ts
│   ├── permissions.ts
│   ├── redirects.ts
│   └── diagnostics.ts
└── ui/
    ├── sign-in-form.tsx
    ├── sign-up-form.tsx
    └── auth-dialog.tsx
```

`app/auth/actions.ts` may remain, but only as a thin Next.js adapter.

It must not continue acting as the primary auth service.

---

# 13. Shared domain and permission decision

Admin and storefront do not need separate product implementations.

They share the product domain with different access policies and output models.

## Public and customer capabilities

```ts
listPublicProducts(filters)
getPublicProductBySlug(slug)
listRelatedProducts(productId)
reserveProduct(customer, productId)
saveProduct(customer, productId)
```

## Staff capabilities

```ts
listAdminProducts(actor, filters)
getAdminProductById(actor, productId)
createProduct(actor, input)
updateProduct(actor, productId, input)
publishProduct(actor, productId)
archiveProduct(actor, productId)
deleteProduct(actor, productId)
```

## Prohibited generic operation

Avoid:

```ts
manageProduct({
  actorType,
  operation,
  audience,
  productId,
  input
})
```

That would recreate ambiguity inside a god service.

Use explicit operations with explicit policy checks.

---

# 14. Detailed architecture findings and decided actions

## Finding A — Runtime in-memory repositories

**Severity:** Critical

### Problem

The current architecture uses synchronous client-memory data wrapped in promise-returning repository interfaces.

This creates the appearance of a backend without real persistence.

### Decision

Remove runtime in-memory repositories.

### Actions

* Remove in-memory admin repositories from production providers.
* Remove `Promise.resolve()` wrappers around client-store reads.
* Migrate every affected domain to Prisma-backed APIs.
* Keep fixtures only in tests, seeds, and development tooling.
* Prevent production imports from fixture locations.

### Completion condition

Reloading the page must preserve all successful writes.

---

## Finding B — Duplicate admin state systems

**Severity:** Critical

### Problem

Some domains use:

* AdminStore;
* repository context;
* TanStack Query cache;
* manual cache synchronization.

### Decision

One remote-data owner per production domain: TanStack Query.

### Actions

* Remove server-record collections from AdminStore.
* Replace repository context reads with typed API clients.
* Remove manual synchronization between AdminStore and QueryClient.
* Retain local state only for temporary admin UI interactions.

### Completion condition

Products, orders, customers, returns, and settings must not exist simultaneously in AdminStore and TanStack Query.

---

## Finding C — TanStack mutations calling Server Actions

**Severity:** High

### Problem

TanStack mutation hooks currently import Server Actions directly.

### Decision

Interactive client mutations use API routes.

### Actions

* Create typed API functions.
* Create corresponding Route Handlers.
* Move business logic to domain commands.
* Make both optional Server Actions and Route Handlers call commands.
* Remove Server Actions that have no remaining form-based consumer.

### Completion condition

No TanStack `mutationFn` imports a `"use server"` module.

---

## Finding D — Ambiguous `features/**` ownership

**Severity:** High

### Problem

`features/**` currently contains UI, state, server actions, loaders, adapters, types, repositories, and providers.

### Decision

Replace audience-oriented feature buckets with domain modules.

### Actions

* Introduce `src/modules/**`.
* Move code by domain, not by current folder name.
* Keep storefront and admin components under domain UI subfolders.
* Remove old feature directories only after imports are migrated.

### Completion condition

A developer can locate all product behaviour under `modules/products`.

---

## Finding E — Top-level server folder is too broad

**Severity:** High

### Problem

`src/server/**` groups unrelated domains beneath a technical layer and introduces an unnecessary `commerce` umbrella.

### Decision

Server code lives inside the domain module.

### Actions

Move:

```text
server/commerce/catalogue
→ modules/products/server
```

Move:

```text
server/commerce/inventory
→ modules/inventory/server
```

Move:

```text
server/commerce/orders
→ modules/orders/server
```

Move:

```text
server/auth
→ modules/auth/server
```

### Completion condition

No new business operation is added to a generic top-level `server` folder.

---

## Finding F — Product, catalogue, and inventory naming conflict

**Severity:** High

### Problem

The terms currently overlap, making ownership unclear.

### Decision

* Product = canonical sellable item.
* Inventory = stock and availability.
* Catalogue = public presentation/read model.
* Storefront = public UI.
* Admin = staff UI.
* Commerce = conceptual term only.

### Actions

* Rename misleading server and client files.
* Remove `catalog` spelling.
* Remove CRUD operations named after catalogue.
* Move stock-specific operations out of product presentation files.
* Add naming checks to architecture guard.

### Completion condition

Every new module and operation follows the language contract.

---

## Finding G — Storefront god provider

**Severity:** High

### Problem

One provider owns catalogue, cart, saved items, filters, overlays, measurements, search, notifications, and other unrelated state.

### Decision

Split state by ownership.

### Actions

* Move URL-owned state out of context.
* Move cart and saved state to focused Zustand stores.
* Move local modal state closer to modal components.
* Keep authentication in an auth boundary.
* Keep product-detail measurements in the product-detail module.
* Remove catalogue data from global providers.

### Completion condition

Changing a local product-detail option must not rerender the complete storefront shell.

---

## Finding H — URL state duplicated in context and local state

**Severity:** High

### Problem

Filters, pagination, and sorting may be copied between URL, context, and component state.

### Decision

The URL is authoritative.

### Actions

* Create domain search-parameter schemas.
* Parse search parameters once.
* Include all result-affecting values in TanStack query keys.
* Update navigation using the Next.js router.
* Remove synchronization effects.
* Remove direct `window.history.replaceState` use where router navigation is appropriate.

### Completion condition

Browser back and forward restore the exact filter, sort, and pagination state.

---

## Finding I — App-wide QueryProvider

**Severity:** Medium

### Problem

TanStack Query is mounted beyond the surfaces that currently need it.

### Decision

Scope providers to actual ownership.

### Actions

* Keep ThemeProvider global.
* Keep Toaster global.
* Mount QueryProvider under admin initially.
* Add a storefront QueryProvider only when storefront client queries require it.
* Do not create duplicate QueryClient instances within the same surface.

### Completion condition

Public server-rendered pages do not mount TanStack Query without a client-query requirement.

---

## Finding J — Repeated storefront layouts

**Severity:** Medium

### Problem

Multiple route folders repeat the same storefront wrapper.

### Decision

Use one nested storefront route-group layout.

### Actions

* Introduce `app/(storefront)/layout.tsx`.
* Move storefront route folders into the route group.
* Preserve public URLs.
* Retain one true `app/layout.tsx`.
* Retain `admin/layout.tsx`.

### Completion condition

Every storefront route inherits the same shell without one-line forwarding layouts.

---

## Finding K — Excessive query, mutation, key, persistence, and adapter files

**Severity:** Medium

### Problem

Simple operations are fragmented across too many files.

### Decision

Start with the minimum domain contract.

For a normal domain:

```text
client/api.ts
client/hooks.ts
server/queries.ts
server/commands.ts
```

Add more files only when size or responsibility justifies them.

### Actions

* Merge tiny query-key files into hooks where appropriate.
* Remove one-line forwarding modules.
* Remove duplicate storage and persistence wrappers.
* Remove files that simply rename another export.
* Avoid broad barrel exports.

### Completion condition

Every remaining file has a distinct responsibility that cannot be named more clearly by its parent module.

---

## Finding L — Modal and overlay ambiguity

**Severity:** Medium

### Problem

Domain overlays live in generic shared folders.

### Decision

Use three categories.

### UI primitives

```text
components/ui/dialog.tsx
components/ui/drawer.tsx
components/ui/sheet.tsx
```

### Domain-owned overlays

```text
modules/products/ui/admin/product-editor-dialog.tsx
modules/products/ui/storefront/quick-view-dialog.tsx
modules/orders/ui/admin/cancel-order-dialog.tsx
modules/auth/ui/auth-dialog.tsx
```

### Truly global overlays

```text
components/overlays/global-command-menu.tsx
```

### Completion condition

No generic overlays folder becomes a container for unrelated domain features.

---

## Finding M — Incorrect pagination

**Severity:** High

### Decision

Pagination follows:

```text
URL
  → query key
  → API request
  → database pagination
```

### Actions

* Accept `page`, `pageSize`, `sort`, `status`, and filters in API schemas.
* Use Prisma `skip/take` or cursor pagination as appropriate.
* Return total count and page metadata.
* Include all result-affecting parameters in query keys.
* Keep previous page data where it improves UX.
* Do not fetch the complete database table and paginate in the browser.

### Completion condition

The browser receives only the requested page.

---

## Finding N — Incorrect polling

**Severity:** Medium

### Decision

Polling is used only for asynchronously changing remote processes.

Allowed examples:

* pending payment verification;
* import job;
* export job;
* delivery status;
* background processing;
* temporary reservation awaiting settlement.

Disallowed examples:

* product lists;
* categories;
* settings;
* completed orders;
* static catalogue pages;
* local countdown display.

### Completion condition

Every polling query has:

* a documented reason;
* a bounded interval;
* a stop condition;
* visibility/background behaviour;
* an error strategy.

---

## Finding O — Client-authoritative checkout

**Severity:** Critical before production

### Problem

The browser must not decide that payment succeeded or that an order was created.

### Decision

Payment and order settlement become server-authoritative.

### Actions

* Create payment initialization endpoint.
* Create verification endpoint.
* Create Paystack webhook.
* Create idempotent settlement command.
* Use Prisma transaction for payment, order, inventory, and reservation updates.
* Create server-generated order confirmation.
* Remove browser-generated authoritative receipts.

### Completion condition

A browser refresh, repeated callback, or duplicate webhook cannot create duplicate orders or stock deductions.

---

## Finding P — Architecture tests protect previous decisions

**Severity:** Medium

### Problem

Some tests enforce current file placement or provider scope instead of correct ownership.

### Decision

Architecture tests enforce principles.

### Actions

Test that:

* Client Components cannot import server modules.
* TanStack hooks cannot import Server Actions.
* Route Handlers cannot import action modules.
* Server Components do not fetch internal API routes.
* production code cannot import fixture directories;
* domain modules cannot import another domain’s internal UI;
* URL-owned state is not recreated in global stores;
* QueryProvider remains scoped;
* Prisma remains server-only.

---

# 15. Endpoint migration map

## Products

```text
GET    /api/v1/products
GET    /api/v1/products/[slug]

GET    /api/v1/admin/products
POST   /api/v1/admin/products
GET    /api/v1/admin/products/[id]
PATCH  /api/v1/admin/products/[id]
DELETE /api/v1/admin/products/[id]

POST   /api/v1/admin/products/[id]/publish
POST   /api/v1/admin/products/[id]/archive
POST   /api/v1/admin/products/[id]/restore
```

## Inventory

```text
GET  /api/v1/admin/inventory
GET  /api/v1/admin/inventory/[productId]
GET  /api/v1/admin/inventory/[productId]/movements
POST /api/v1/admin/inventory/[productId]/adjustments
POST /api/v1/admin/inventory/[productId]/reservations
```

## Orders

```text
GET   /api/v1/admin/orders
GET   /api/v1/admin/orders/[id]
PATCH /api/v1/admin/orders/[id]

GET   /api/v1/account/orders
GET   /api/v1/account/orders/[id]
POST  /api/v1/account/orders/[id]/cancel
```

## Customers

```text
GET   /api/v1/admin/customers
GET   /api/v1/admin/customers/[id]
PATCH /api/v1/admin/customers/[id]
```

## Returns

```text
GET   /api/v1/admin/returns
GET   /api/v1/admin/returns/[id]
POST  /api/v1/admin/returns/[id]/approve
POST  /api/v1/admin/returns/[id]/reject
```

## Payments and checkout

```text
POST /api/v1/checkout/initialize
POST /api/v1/payments/verify
POST /api/v1/payments/webhook
```

Endpoints must be added according to actual application requirements. Do not create unused API routes only to complete a theoretical CRUD set.

---

# 16. Phased migration plan

No phase may begin until its predecessor passes its acceptance gate.

---

## Phase 0 — Freeze and record the current behaviour

### Objective

Create a reliable baseline before moving architecture.

### Tasks

* [ ] P0-T01 Record the current default branch commit SHA.
* [ ] P0-T02 Record every current storefront, auth, account, and admin route.
* [ ] P0-T03 Capture desktop screenshots of all primary routes.
* [ ] P0-T04 Capture mobile screenshots of all primary routes.
* [ ] P0-T05 Capture light and dark theme screenshots.
* [ ] P0-T06 Record header, footer, homepage, catalogue, product-card, and PDP behaviour.
* [ ] P0-T07 Record cart, saved-item, modal, drawer, and checkout interactions.
* [ ] P0-T08 Record admin table, form, inventory, and navigation behaviour.
* [ ] P0-T09 Add or confirm Playwright characterization tests.
* [ ] P0-T10 Create a production dummy-data inventory.
* [ ] P0-T11 Create a map of every current provider, store, query cache, and context.
* [ ] P0-T12 Create a map of all production imports from fixture or in-memory modules.

### Deliverables

* baseline route list;
* screenshot archive;
* current-state data map;
* dummy-data removal list;
* provider and store ownership map.

### Acceptance gate

No architecture changes begin until the baseline is captured.

### Rollback trigger

Not applicable. This phase must not change runtime behaviour.

---

## Phase 1 — Establish architecture rules and language

### Objective

Prevent new ambiguity while migration proceeds.

### Tasks

* [ ] P1-T01 Add the product, inventory, catalogue, storefront, and admin language contract.
* [ ] P1-T02 Mark `features/**` as legacy for new code.
* [ ] P1-T03 Mark top-level `server/**` as legacy for new business modules.
* [ ] P1-T04 Add import-boundary rules.
* [ ] P1-T05 Prevent production imports from fixture directories.
* [ ] P1-T06 Prevent Client Components from importing Prisma or server modules.
* [ ] P1-T07 Prevent TanStack hooks from importing `"use server"` modules.
* [ ] P1-T08 Prevent Route Handlers from importing Server Actions.
* [ ] P1-T09 Prevent mixed `catalog` and `catalogue` spelling.
* [ ] P1-T10 Add a migration-status document listing every domain.

### Deliverables

* architecture contract;
* updated architecture guard;
* migration tracker.

### Acceptance gate

The current application still builds and all new guard rules pass or have explicitly documented temporary exceptions.

### Rollback trigger

A guard rule must be removed or narrowed if it blocks valid Next.js behaviour rather than an actual repository problem.

---

## Phase 2 — Consolidate layouts and provider scope

### Objective

Fix structural ownership without altering domain behaviour.

### Tasks

* [ ] P2-T01 Create `app/(storefront)/layout.tsx`.
* [ ] P2-T02 Move storefront routes into the route group.
* [ ] P2-T03 Preserve all public URLs.
* [ ] P2-T04 Remove repeated forwarding layouts.
* [ ] P2-T05 Keep `app/layout.tsx` as the true root.
* [ ] P2-T06 Keep `admin/layout.tsx` as the admin shell.
* [ ] P2-T07 Move QueryProvider into admin ownership.
* [ ] P2-T08 Keep ThemeProvider and Toaster global.
* [ ] P2-T09 Update architecture tests.
* [ ] P2-T10 Run full visual comparison.

### Deliverables

* one root layout;
* one storefront layout;
* one admin layout;
* scoped QueryProvider.

### Acceptance gate

* every original URL works;
* screenshots match;
* no header or footer change;
* no theme regression;
* no responsive regression.

### Rollback trigger

Any route, shell, modal portal, theme, or responsive behaviour differs from baseline.

---

## Phase 3 — Create the shared HTTP and module foundation

### Objective

Build the reusable infrastructure required for API-first client data.

### Tasks

* [ ] P3-T01 Create `src/modules`.
* [ ] P3-T02 Create a typed browser HTTP client.
* [ ] P3-T03 Define standard success and error envelopes.
* [ ] P3-T04 Add JSON parsing and malformed-response handling.
* [ ] P3-T05 Add request validation helpers.
* [ ] P3-T06 Add API authentication helpers.
* [ ] P3-T07 Add permission-policy helpers.
* [ ] P3-T08 Add API logging and request correlation.
* [ ] P3-T09 Define pagination response metadata.
* [ ] P3-T10 Define API contract tests.
* [ ] P3-T11 Add admin-scoped QueryClient defaults.
* [ ] P3-T12 Document cache and invalidation rules.

### Deliverables

```text
lib/http/
modules/_shared/      # only when genuinely cross-domain
app/api/v1/
```

### Acceptance gate

A small test endpoint and client query prove:

* success parsing;
* validation error handling;
* authentication failure;
* permission failure;
* query cancellation;
* typed response handling.

### Rollback trigger

The abstraction becomes more complicated than direct `fetch()` without providing consistent errors, authentication, or typing.

---

## Phase 4 — Products and inventory cutover

### Objective

Create the canonical example that all remaining domains will follow.

### Tasks

#### Products module

* [ ] P4-T01 Create `modules/products/schema.ts`.
* [ ] P4-T02 Create `modules/products/types.ts`.
* [ ] P4-T03 Move public product queries into the module.
* [ ] P4-T04 Move admin product queries into the module.
* [ ] P4-T05 Move product commands into the module.
* [ ] P4-T06 Add product permission policy.
* [ ] P4-T07 Create explicit public and admin read models.
* [ ] P4-T08 Create typed product API client.
* [ ] P4-T09 Create TanStack product hooks.

#### Product APIs

* [ ] P4-T10 Add admin product list endpoint.
* [ ] P4-T11 Add admin product-detail endpoint.
* [ ] P4-T12 Add create endpoint.
* [ ] P4-T13 Add update endpoint.
* [ ] P4-T14 Add publish, archive, restore, and delete endpoints.
* [ ] P4-T15 Replace TanStack-to-Server-Action mutations with API mutations.

#### Inventory module

* [ ] P4-T16 Create `modules/inventory`.
* [ ] P4-T17 Separate stock data from product definition.
* [ ] P4-T18 Add paginated inventory API.
* [ ] P4-T19 Add stock movement API.
* [ ] P4-T20 Add inventory adjustment command.
* [ ] P4-T21 Remove inventory in-memory fallback.
* [ ] P4-T22 Remove duplicate server and browser initial reads.
* [ ] P4-T23 Hydrate TanStack data or choose a single browser read path.

#### UI preservation

* [ ] P4-T24 Reuse existing product cards unchanged.
* [ ] P4-T25 Reuse existing catalogue grid unchanged.
* [ ] P4-T26 Reuse existing PDP unchanged.
* [ ] P4-T27 Reuse existing admin product editor unchanged.
* [ ] P4-T28 Verify image order, pricing, labels, and stock badges.

### Deliverables

A complete Prisma-backed product and inventory architecture with no runtime dummy data.

### Acceptance gate

* product list is database-backed;
* product detail is database-backed;
* create/update/archive/delete persist after reload;
* inventory reflects database changes;
* no Server Action is imported by a TanStack hook;
* existing product-card and PDP screenshots match baseline.

### Rollback trigger

Any mismatch in product rendering, images, pricing, variants, card sizing, catalogue composition, or responsive layout.

---

## Phase 5 — Remove remaining admin dummy domains

### Objective

Migrate orders, holds, returns, customers, overview, and settings away from AdminStore and in-memory repositories.

### Migration order

1. Orders
2. Holds and reservations
3. Returns
4. Customers
5. Settings
6. Overview/reporting projections

### Tasks for each domain

* [ ] Define Prisma-backed source of truth.
* [ ] Create domain module.
* [ ] Define schemas and types.
* [ ] Create server queries.
* [ ] Create server commands.
* [ ] Create policy rules.
* [ ] Create API Route Handlers.
* [ ] Create typed API client.
* [ ] Create TanStack hooks.
* [ ] Replace in-memory repository consumers.
* [ ] Remove domain data from AdminStore.
* [ ] Remove manual QueryClient/AdminStore synchronization.
* [ ] Add API contract tests.
* [ ] Add persistence tests.
* [ ] Add authorization tests.
* [ ] Verify existing UI screenshots.

### Deliverables

Every admin business screen reads persisted data.

### Acceptance gate

* no production admin screen depends on in-memory repository data;
* no successful write disappears after reload;
* the AdminStore no longer contains server-record collections;
* current admin UI remains visually unchanged.

### Rollback trigger

A migrated domain loses existing interactions, status transitions, table behaviour, filters, or responsive layout.

---

## Phase 6 — Storefront state and Zustand migration

### Objective

Replace the storefront god provider with explicit state ownership.

### Tasks

#### Zustand setup

* [ ] P6-T01 Add Zustand.
* [ ] P6-T02 Create `cart.store.ts`.
* [ ] P6-T03 Create `saved-items.store.ts`.
* [ ] P6-T04 Create `storefront-ui.store.ts`.
* [ ] P6-T05 Add versioned persistence where required.
* [ ] P6-T06 Add hydration-safe selectors.
* [ ] P6-T07 Prevent complete product records from being persisted unnecessarily.

#### URL state

* [ ] P6-T08 Move catalogue filters to URL parameters.
* [ ] P6-T09 Move pagination to URL parameters.
* [ ] P6-T10 Move sorting to URL parameters.
* [ ] P6-T11 Move navigational search state to URL parameters.
* [ ] P6-T12 Remove URL/context synchronization effects.

#### Local ownership

* [ ] P6-T13 Move image-viewer state to its component boundary.
* [ ] P6-T14 Move product measurements to the PDP boundary.
* [ ] P6-T15 Move newsletter state to its form.
* [ ] P6-T16 Move delivery-estimate state to its form.
* [ ] P6-T17 Move header scroll behaviour into the header.
* [ ] P6-T18 Separate authentication-dialog state.

#### Provider removal

* [ ] P6-T19 Remove migrated values from StorefrontProvider.
* [ ] P6-T20 Remove unused context selectors.
* [ ] P6-T21 Delete the old provider after its final consumer is migrated.

### Deliverables

Focused stores and smaller provider boundaries.

### Acceptance gate

* cart remains stable across navigation;
* saved items remain stable;
* filters survive browser back and forward;
* no hydration warning;
* no product-card or catalogue visual difference;
* no global rerender caused by unrelated local state.

### Rollback trigger

Cart loss, saved-item loss, hydration mismatch, filter-loop behaviour, modal regression, or screenshot difference.

---

## Phase 7 — Consolidate authentication

### Objective

Create one clear auth domain while preserving browser redirect routes.

### Tasks

* [ ] P7-T01 Create `modules/auth`.
* [ ] P7-T02 Move session resolution.
* [ ] P7-T03 Move account provisioning.
* [ ] P7-T04 Move permission logic.
* [ ] P7-T05 Move redirect helpers.
* [ ] P7-T06 Move auth diagnostics.
* [ ] P7-T07 Reduce `app/auth/actions.ts` to thin adapters.
* [ ] P7-T08 Keep OAuth browser routes under `/auth`.
* [ ] P7-T09 Add JSON auth APIs only where an actual machine client needs them.
* [ ] P7-T10 Remove duplicate auth ownership from `lib/auth/server` and `server/auth`.
* [ ] P7-T11 Preserve all existing auth URLs.
* [ ] P7-T12 Run authentication Playwright tests.

### Deliverables

One auth module and thin route/action adapters.

### Acceptance gate

* password sign-in works;
* sign-up works;
* OAuth works;
* callback works;
* reset password works;
* sign-out remains POST-only;
* admin permission checks work;
* account provisioning works;
* no visual change to auth forms.

### Rollback trigger

Any authentication, redirect, session-cookie, or account-provisioning regression.

---

## Phase 8 — Server-authoritative checkout and payment

### Objective

Remove client-authoritative order completion.

### Tasks

* [ ] P8-T01 Create checkout domain module.
* [ ] P8-T02 Create payments domain module.
* [ ] P8-T03 Create payment initialization endpoint.
* [ ] P8-T04 Create payment verification endpoint.
* [ ] P8-T05 Create Paystack webhook endpoint.
* [ ] P8-T06 Add signature verification.
* [ ] P8-T07 Add idempotency keys.
* [ ] P8-T08 Create settlement transaction.
* [ ] P8-T09 Persist payment attempt.
* [ ] P8-T10 Create order server-side.
* [ ] P8-T11 Commit inventory changes server-side.
* [ ] P8-T12 Release reservations server-side.
* [ ] P8-T13 Create delivery request server-side.
* [ ] P8-T14 Replace browser-generated receipt with server order result.
* [ ] P8-T15 Keep existing checkout interface and composition.
* [ ] P8-T16 Add failure, retry, duplicate-webhook, and refresh tests.

### Deliverables

A production-safe checkout flow.

### Acceptance gate

* duplicate verification cannot duplicate an order;
* duplicate webhook cannot duplicate stock deduction;
* failed payments create no paid order;
* payment state survives browser closure;
* order confirmation comes from the server;
* checkout UI remains visually unchanged.

### Rollback trigger

Any incorrect order creation, payment mismatch, stock corruption, reservation leak, or checkout visual regression.

---

## Phase 9 — Delete legacy architecture

### Objective

Remove transitional files after every consumer has migrated.

### Tasks

* [ ] P9-T01 Delete in-memory repositories.
* [ ] P9-T02 Delete repository provider context.
* [ ] P9-T03 Delete server-record data from AdminStore.
* [ ] P9-T04 Delete obsolete query wrappers.
* [ ] P9-T05 Delete direct TanStack-to-Server-Action mutations.
* [ ] P9-T06 Delete legacy catalogue adapters after parity is proven.
* [ ] P9-T07 Delete broad shared type barrels.
* [ ] P9-T08 Delete repeated storefront layouts.
* [ ] P9-T09 Delete obsolete provider files.
* [ ] P9-T10 Delete unused `features/**` directories.
* [ ] P9-T11 Delete obsolete top-level `server/**` directories.
* [ ] P9-T12 Remove temporary compatibility exports.
* [ ] P9-T13 Run circular-dependency analysis.
* [ ] P9-T14 Run unused-export analysis.
* [ ] P9-T15 Update all architecture documentation.

### Acceptance gate

* no legacy import paths remain;
* no compatibility export remains without a documented reason;
* no production dummy data remains;
* full verification passes.

### Rollback trigger

Deletion reveals a hidden runtime dependency that was not covered by tests.

---

## Phase 10 — Final validation and release readiness

### Objective

Prove the architecture migration did not change the product experience.

### Tasks

* [ ] P10-T01 Run lint.
* [ ] P10-T02 Run typecheck.
* [ ] P10-T03 Run unit tests.
* [ ] P10-T04 Run API contract tests.
* [ ] P10-T05 Run integration tests.
* [ ] P10-T06 Run production build.
* [ ] P10-T07 Run architecture guard.
* [ ] P10-T08 Run React Doctor.
* [ ] P10-T09 Run complete Playwright suite.
* [ ] P10-T10 Compare baseline and final screenshots.
* [ ] P10-T11 Test mobile layout.
* [ ] P10-T12 Test tablet layout.
* [ ] P10-T13 Test desktop layout.
* [ ] P10-T14 Test light theme.
* [ ] P10-T15 Test dark theme.
* [ ] P10-T16 Verify no dummy-data imports.
* [ ] P10-T17 Verify no internal API calls from Server Components.
* [ ] P10-T18 Verify no Server Actions imported by TanStack hooks.
* [ ] P10-T19 Verify API permissions.
* [ ] P10-T20 Verify persistence after reload.

### Acceptance gate

All required checks pass and all known architecture exceptions are documented.

---

# 17. Recommended pull-request sequence

The migration must not be one giant pull request.

## PR 1 — Architecture contract and baseline

Includes:

* route inventory;
* screenshot baseline;
* naming contract;
* migration tracker;
* architecture guards.

No runtime architecture changes.

---

## PR 2 — Storefront route group and provider scope

Includes:

* `(storefront)` route group;
* repeated layout removal;
* admin QueryProvider scoping;
* no domain changes.

---

## PR 3 — HTTP and domain-module foundation

Includes:

* typed HTTP client;
* API envelope;
* validation;
* initial module conventions;
* contract tests.

---

## PR 4 — Product read migration

Includes:

* products module;
* public product queries;
* admin product queries;
* paginated API;
* TanStack read hooks;
* no product UI redesign.

---

## PR 5 — Product mutation and inventory migration

Includes:

* product API mutations;
* inventory API;
* removal of TanStack-to-Server-Action calls;
* database persistence;
* cache invalidation.

---

## PR 6 — Admin operational domains

Includes separate commits or smaller PRs for:

* orders;
* holds;
* returns;
* customers;
* settings;
* overview.

Do not migrate all of them in one unreviewable commit.

---

## PR 7 — Zustand and storefront provider split

Includes:

* cart store;
* saved-items store;
* storefront UI store;
* URL-owned filters;
* provider reduction.

---

## PR 8 — Auth consolidation

Includes:

* auth module;
* thin actions;
* preserved redirect routes;
* removal of duplicate auth server locations.

---

## PR 9 — Checkout and payments

Includes:

* payment initialization;
* verification;
* webhook;
* settlement;
* server order creation.

---

## PR 10 — Legacy deletion and final architecture guard

Includes:

* removal of old providers;
* removal of in-memory repositories;
* removal of compatibility exports;
* final dependency enforcement.

---

# 18. Required validation commands

The implementation should run the repository’s actual commands, but the required verification categories are:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:architecture
pnpm test:e2e
```

Also run:

```bash
npx -y react-doctor@latest . --verbose --diff
```

Where available, add:

```bash
pnpm prisma:validate
pnpm verify
```

No phase should be declared complete based only on TypeScript compilation.

---

# 19. Playwright preservation matrix

The following behaviours must be covered.

## Storefront shell

* header renders correctly;
* mobile menu opens and closes;
* footer remains unchanged;
* theme toggle works;
* no horizontal overflow;
* reduced-motion behaviour works.

## Homepage

* composition order remains unchanged;
* hero remains unchanged;
* product-card dimensions remain unchanged;
* featured sections remain unchanged;
* responsive stacking remains unchanged.

## Catalogue

* filters work;
* sorting works;
* pagination works;
* browser history works;
* product-card layout remains unchanged;
* mobile drawers remain unchanged;
* desktop filters remain unchanged.

## Product detail

* image gallery works;
* image viewer works;
* size selection works;
* colour selection works;
* quantity behaviour works;
* save action works;
* add-to-cart works;
* typography remains unchanged;
* responsive composition remains unchanged.

## Cart and checkout

* cart drawer works;
* cart page works;
* quantity update works;
* remove works;
* hold status works;
* checkout steps work;
* payment failure works;
* payment success works;
* order confirmation works.

## Account

* authentication guard works;
* order list works;
* order detail works;
* profile works;
* addresses work;
* mobile account navigation works.

## Admin

* role guard works;
* overview works;
* product list works;
* inventory works;
* product editor works;
* orders work;
* customers work;
* returns work;
* pagination works;
* responsive sidebar works;
* dialogs and drawers work.

---

# 20. Architecture completion checklist

The migration is complete only when all of the following are true.

## Data

* [ ] No production page reads runtime dummy arrays.
* [ ] No production provider creates in-memory business repositories.
* [ ] Product data comes from Prisma.
* [ ] Inventory data comes from Prisma.
* [ ] Order data comes from Prisma.
* [ ] Customer data comes from Prisma.
* [ ] Return data comes from Prisma.
* [ ] Settings persist.
* [ ] Writes survive reload.

## Transport

* [ ] Client remote reads use typed API clients.
* [ ] Client remote mutations use typed API clients.
* [ ] TanStack hooks do not import Server Actions.
* [ ] Route Handlers do not call Server Actions.
* [ ] Server Components do not call internal APIs.
* [ ] Webhooks use shared domain commands.
* [ ] API responses follow one envelope.

## State

* [ ] URL owns filters and pagination.
* [ ] TanStack Query owns remote client data.
* [ ] Zustand owns only browser state.
* [ ] `useState` owns local state.
* [ ] Prisma owns persistent state.
* [ ] No domain is duplicated between AdminStore and QueryClient.

## Structure

* [ ] Business code is under domain modules.
* [ ] `features/**` is removed or contains no ambiguous legacy code.
* [ ] Top-level `server/**` business code is removed.
* [ ] Product and inventory are clearly separated.
* [ ] Catalogue is a read-model/UI term.
* [ ] Storefront and admin share domains.
* [ ] Auth has one ownership location.
* [ ] Domain modals live with their domains.
* [ ] UI primitives remain generic.

## UI

* [ ] Header is unchanged.
* [ ] Footer is unchanged.
* [ ] Homepage composition is unchanged.
* [ ] Product cards are unchanged.
* [ ] Catalogue layout is unchanged.
* [ ] PDP is unchanged.
* [ ] Typography is unchanged.
* [ ] Spacing is unchanged.
* [ ] Theme behaviour is unchanged.
* [ ] Responsive behaviour is unchanged.

---

# 21. Overengineering explicitly prohibited

Do not:

* create a repository interface for every Prisma model;
* create a service class for every function;
* force every Server Component through an API route;
* force every mutation through a Server Action;
* call Server Actions from Route Handlers;
* duplicate storefront and admin domain logic;
* create generic CRUD functions that accept every actor and operation;
* add TanStack Query around local arrays;
* put server records into Zustand;
* put every hook into a global hooks directory;
* put every type into a global types directory;
* put every schema into a global schemas directory;
* create broad barrel files exporting domain internals;
* introduce a new modal system during architecture migration;
* replace current UI primitives without a verified reason;
* migrate the entire repository in a single commit;
* delete compatibility code before all consumers have moved;
* declare a phase complete without runtime and visual evidence.

---

# 22. Immediate execution priority

The implementation order is:

1. Freeze and document current UI behaviour.
2. Establish naming and dependency rules.
3. Consolidate layouts and provider scope.
4. Build the HTTP/API foundation.
5. Migrate products and inventory as the canonical domain example.
6. Remove dummy and in-memory admin domains one at a time.
7. Split storefront state and introduce Zustand.
8. Consolidate auth.
9. Make checkout server-authoritative.
10. Delete legacy architecture.
11. Complete full visual and runtime validation.

Products and inventory must be the first real domain migration because they affect both storefront and admin and will establish the pattern used by the rest of the application.

---

# Final decision

Laitstyles will not continue with separate, overlapping storefront, admin, repository, provider, query-cache, and in-memory representations of the same business records.

The target architecture is:

```text
Domain modules
  + API-first browser access
  + direct Server Component access
  + thin optional Server Actions
  + Prisma persistence
  + TanStack Query for remote state
  + Zustand for browser-owned state
  + URL-owned navigation state
  + strict server-side authorization
```

The goal is not to produce the most abstract architecture.

The goal is to make every operation easy to locate, understand, secure, test, migrate, and maintain while preserving the application exactly as users currently see and interact with it.

# Laitstyles Architecture Decision and Migration Review

**Document type:** Architecture decision canvas and execution plan  
**Status:** Approved target direction  
**Date:** July 24, 2026  
**Repository:** `relvorlabs/laitstyles`

## 1. Purpose

This document is the controlling decision record for the Laitstyles architecture migration. It converts the architecture review into a phased implementation plan with explicit ownership, transport, validation, and rollback rules.

The migration has four primary goals:

1. Remove production dummy data, in-memory repositories, duplicated caches, and misleading asynchronous abstractions.
2. Establish a clear API-first data path for interactive Client Components.
3. Organize shared business capabilities by domain rather than duplicating them across storefront and admin.
4. Preserve the current UI and every intentional visual, interaction, and responsive behaviour.

## 2. Non-negotiable UI preservation contract

Every phase must preserve the existing:

- header and footer;
- homepage composition;
- product cards;
- catalogue layout;
- product-detail page;
- account, cart, checkout, and admin presentation;
- typography, colours, themes, spacing, borders, shadows, and image aspect ratios;
- animation and reduced-motion behaviour;
- responsive breakpoints and navigation;
- button, form, modal, drawer, table, and sheet presentation.

Architecture work may change data ownership, file placement, imports, server boundaries, API transport, state management, caching, and validation. It must not become a redesign.

Implementation rules:

- preserve existing JSX and class names where possible;
- move components instead of rewriting them;
- do not combine architecture migration with visual cleanup;
- do not replace working UI primitives without a verified defect;
- preserve route URLs or add explicit compatibility redirects;
- treat any unexplained screenshot difference as a regression.

## 3. Executive architecture decision

Laitstyles will use:

> **Domain modules, API-first browser data access, direct server access for Server Components, optional thin Server Actions, TanStack Query for remote client state, Zustand for browser-owned shared state, URL-owned navigation state, and Prisma as the persistent source of truth.**

### Browser remote-data flow

```text
Client Component
  → TanStack Query hook
  → typed API client
  → Route Handler
  → domain query or command
  → Prisma
```

### Server-rendered flow

```text
Server Component
  → domain query
  → Prisma
```

### Form-specific mutation flow

```text
Form or Client Component
  → thin Server Action
  → domain command
  → Prisma
```

### External callback flow

```text
Webhook Route Handler
  → domain command
  → Prisma transaction
```

The following is prohibited:

```text
Client
  → Route Handler
  → Server Action
  → Prisma
```

Route Handlers and Server Actions are alternative transport adapters. They may call the same server-only domain operation, but they must not call each other for reuse.

## 4. Locked architecture decisions

| ID | Decision | Required outcome |
| --- | --- | --- |
| ADR-01 | Client remote data uses TanStack Query through typed API clients | Client hooks do not import database functions or Server Actions |
| ADR-02 | Route Handlers call domain operations directly | No Route Handler calls a Server Action |
| ADR-03 | Server Components read directly from domain server queries | No internal HTTP round trip for server-rendered reads |
| ADR-04 | Server Actions remain optional and thin | Reusable business logic is transport-neutral |
| ADR-05 | Runtime dummy and in-memory business data are removed | Production screens read and write persisted data |
| ADR-06 | Business code is organized by domain modules | Products, inventory, orders, customers, payments, and returns are not duplicated by surface |
| ADR-07 | Storefront and admin share domains, not unrestricted actions | Access policy and audience-specific read models control capabilities |
| ADR-08 | Product is the canonical sellable-item domain | Catalogue and inventory are not product synonyms |
| ADR-09 | URL owns navigable state | Filters, pagination, sorting, search, and selected route tabs live in the URL |
| ADR-10 | TanStack Query owns remote browser cache | Server records are not copied into Zustand or Context |
| ADR-11 | Zustand owns shared browser state | Guest cart, saved IDs, drawers, and overlays may use Zustand |
| ADR-12 | `useState` and reducers own local interaction state | Local component state stays local |
| ADR-13 | Prisma owns persistent business state | Products, inventory, orders, payments, customers, and returns are server-authoritative |
| ADR-14 | The top-level business `server/**` catch-all is retired | Server code lives in the domain module that owns it |
| ADR-15 | Ambiguous `features/**` ownership is replaced by domain modules | A domain is locatable from one module root |
| ADR-16 | Query and mutation files are kept minimal | Files are split only for real responsibility boundaries |
| ADR-17 | TanStack Query is scoped to surfaces that need it | QueryProvider is not automatically app-wide |
| ADR-18 | Architecture work preserves the UI | No phase intentionally redesigns a screen |

## 5. Data-source decision

The migration is not complete when an API route merely hides dummy data.

Invalid:

```text
Client → API Route → in-memory repository → dummy array
```

Invalid:

```text
Client → TanStack Query → Promise.resolve → local AdminStore
```

Required for interactive client state:

```text
Client → API Route → authenticated domain operation → Prisma
```

Required for Server Components:

```text
Server Component → public/authenticated domain query → Prisma
```

Dummy data may remain only in test fixtures, factories, stories, development fixtures, and seed scripts. Production routes, providers, hooks, and modules must not import it.

A domain is migrated only when lists and details read from the database, mutations persist, reloads retain changes, authorization is enforced on the server, cache invalidation works, and no fallback silently restores mock data.

## 6. Domain language contract

### Product

The canonical sellable-item definition: name, slug, description, media, pricing, category, collection, variants, sizes, colours, merchandising, and publication status.

Canonical domain name: `products`.

### Inventory

Stock and availability associated with products: quantity, individual pieces, SKU, movements, reservations, holds, sold state, location, availability, damage, and returns.

Inventory is not another name for products.

### Catalogue

The customer-facing read model of published products: browsing, search, filters, sorting, categories, collections, and product-card projections.

Catalogue is not a CRUD domain. Product creation, update, publication, archive, and deletion belong to products.

Use British spelling `catalogue` consistently in UI/read-model names.

### Storefront

The customer-facing presentation surface: site shell, homepage, cards, catalogue presentation, PDP presentation, cart presentation, and customer overlays.

Storefront must not own database persistence or payment settlement.

### Admin

The staff-facing presentation surface. Admin is not a business domain. Admin UI calls product, inventory, order, customer, return, and settings domains with staff authorization.

### Commerce

A conceptual umbrella only. It is not an additional permanent folder level in the target architecture.

### Repository

Reserved for a real infrastructure abstraction where multiple persistence implementations or external backends exist. A wrapper around an array, React store, or `fetch()` is not automatically a repository.

## 7. State ownership matrix

| State | Owner | Examples |
| --- | --- | --- |
| Persistent business data | Prisma | Products, inventory, orders, payments, customers, returns |
| Remote browser cache | TanStack Query | Admin product list, inventory page, order list, customer detail |
| Navigable state | URL search parameters | Page, filters, sorting, search, status |
| Shared browser-owned state | Zustand | Guest cart, saved IDs, drawer visibility, search overlay |
| Local interaction state | `useState`, `useReducer`, `useRef` | Field state, local workflow step, temporary open state |
| Form validation | React Hook Form and Zod | Product editor, address form, authentication form |
| Server-rendered values | Server Component props | Public product page, account order detail |
| Authentication and permissions | Server session and policy | Staff capabilities, customer access, anonymous access |

Do not put complete product lists, inventory records, orders, customers, payments, or permissions into Zustand. Do not put purely local UI state into TanStack Query. Do not mirror URL state into Context or a second store.

## 8. Route and transport decisions

`route.ts` files do not all belong under `/api`.

Browser redirect flows may remain under `/auth/**`, including OAuth initiation, callbacks, and sign-out redirects.

Machine-readable endpoints use `/api/v1/**`, including interactive client CRUD, mobile or partner APIs, webhooks, payment verification, polling, and endpoints requiring explicit HTTP semantics.

Server Components must not call `/api/v1/**` for data they can read directly from the domain module.

## 9. Target source structure

```text
src/
├── app/
│   ├── layout.tsx
│   ├── (storefront)/
│   │   ├── layout.tsx
│   │   ├── (home)/
│   │   ├── products/
│   │   ├── collections/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── order-confirmation/
│   │   └── account/
│   ├── admin/
│   ├── auth/
│   └── api/v1/
│       ├── products/
│       ├── admin/
│       ├── account/
│       ├── checkout/
│       └── payments/
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
├── components/ui/
├── hooks/
├── stores/
├── providers/
└── lib/
    ├── prisma/
    ├── supabase/
    ├── http/
    ├── errors/
    ├── logging/
    ├── money.ts
    └── utils.ts
```

## 10. Domain module contract

A normal domain starts with the smallest useful structure:

```text
modules/products/
├── schema.ts
├── types.ts
├── server/
│   ├── queries.ts
│   ├── commands.ts
│   ├── policy.ts
│   └── mappers.ts
├── client/
│   ├── api.ts
│   └── hooks.ts
└── ui/
    ├── storefront/
    └── admin/
```

- `server/queries.ts`: read-only server operations.
- `server/commands.ts`: server-side mutations and transactions.
- `server/policy.ts`: authorization and capability rules.
- `server/mappers.ts`: explicit database-to-read-model mapping when needed.
- `client/api.ts`: browser HTTP calls only.
- `client/hooks.ts`: TanStack Query hooks only.
- `ui/**`: existing presentation grouped by audience without duplicating persistence.

Add more files only when size or responsibility justifies them.

## 11. API contract

Machine-readable APIs use `/api/v1/**` and consistent envelopes.

Success:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "The selected product could not be found.",
    "fieldErrors": {}
  }
}
```

Use stable machine-readable error codes, appropriate HTTP status codes, optional field errors, and no raw database details or stack traces.

## 12. Major decided actions

### Runtime in-memory repositories

Remove them from production. Keep in-memory data only for tests, stories, seeds, and development fixtures.

### Duplicate admin state

Remove server-record collections from AdminStore. TanStack Query becomes the browser cache for Prisma-backed API data. Do not manually synchronize AdminStore and QueryClient.

### TanStack mutations importing Server Actions

Replace with typed API mutations. Route Handlers and optional Server Actions call the same domain command independently.

### Ambiguous feature and server ownership

Introduce `src/modules/**`; migrate by domain. Do not move everything mechanically in one pull request.

### Product/catalogue/inventory conflict

Use the language contract. Product owns definition and CRUD; inventory owns stock; catalogue is a public read model and UI term.

### Storefront god provider

Move URL state to the URL, remote state to server/TanStack Query, browser-shared state to focused Zustand stores, and local state to component boundaries.

### Provider scope

Keep theme and global UI infrastructure at the root. Scope QueryProvider to the surfaces that need browser server-state synchronization.

### Pagination

Use URL → query key → API request → database pagination. Do not fetch the entire dataset and paginate in the browser.

### Polling

Use only for genuinely asynchronous remote processes with a stop condition, such as pending payment, delivery, import, or export status.

### Checkout

Make payment verification, order creation, inventory commitment, reservation release, and delivery creation server-authoritative and idempotent.

## 13. Phased migration

| Phase | Goal | Key gate |
| --- | --- | --- |
| 0 | Freeze and record current behaviour | Route, state, data, interaction, screenshot, and validation baseline |
| 1 | Establish architecture rules and language | Updated doctrine and guards pass with temporary exceptions documented |
| 2 | Consolidate layouts and provider scope | Route and visual parity |
| 3 | Create typed HTTP and module foundation | Transport contract proven with tests |
| 4 | Cut over products and inventory | Database-backed read/write parity with no UI change |
| 5 | Remove remaining admin dummy domains | No production in-memory business data |
| 6 | Split storefront state and add Zustand | Correct ownership, hydration safety, and UI parity |
| 7 | Consolidate authentication | All auth flows and permissions remain correct |
| 8 | Make checkout and payments server-authoritative | Idempotent settlement and stock integrity |
| 9 | Delete legacy architecture | No obsolete imports, providers, or compatibility layers |
| 10 | Final validation and release readiness | Full static, runtime, API, Playwright, and visual gates pass |

No phase may start until its predecessor passes its acceptance gate.

## 14. Validation contract

Required categories:

```bash
pnpm check:architecture
pnpm prisma:validate
pnpm audit:buttons
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm dlx react-doctor@latest . --verbose --diff
```

Also verify route continuity, authentication and authorization, server-only boundary protection, API contracts, persistence after reload, browser console and network errors, and screenshots at desktop, tablet, and mobile viewports in both themes.

A skipped or unavailable check must be reported as skipped or blocked. It must never be presented as passing.

## 15. Overengineering prohibited

Do not:

- create a repository interface for every Prisma model;
- create a service class for every operation;
- force Server Components through internal APIs;
- call Server Actions from Route Handlers;
- duplicate storefront and admin domain logic;
- create one generic CRUD function for every actor and operation;
- wrap local arrays in TanStack Query;
- put server records into Zustand;
- create global dumping grounds for hooks, types, schemas, services, or repositories;
- replace the current UI during architecture work;
- migrate the entire repository in one commit;
- delete compatibility code before all consumers move;
- declare completion without runtime and visual evidence.

## 16. Immediate execution order

1. Freeze and document the current UI and runtime behaviour.
2. Establish naming, transport, and dependency rules.
3. Consolidate layouts and provider scope.
4. Build the HTTP/API foundation.
5. Migrate products and inventory as the canonical domain example.
6. Remove dummy and in-memory admin domains one at a time.
7. Split storefront state and introduce Zustand.
8. Consolidate auth.
9. Make checkout server-authoritative.
10. Delete legacy architecture.
11. Complete full visual and runtime validation.

The goal is not maximum abstraction. The goal is for every operation to be easy to locate, understand, secure, test, migrate, and maintain while the application remains visually and behaviourally unchanged.

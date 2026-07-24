# Doctrine: Project structure & separation of concern

Owner of: target folder map, domain ownership, dependency direction, and migration boundaries.
Cited by: every engineering role.

## Current migration state

The approved architecture migration is active.

The current tree still contains legacy code under `src/features/**`, top-level
`src/server/**`, and `src/server/commerce/**`. These paths remain supported while their
existing consumers are migrated, but they are **closed to new production business modules**.

Temporary legacy paths are not the target architecture. Do not use their existence as precedent
for new code. The migration status and explicit exceptions live in
`docs/architecture-migration/`.

## Target layers

```text
src/app/**           Next.js routes, layouts, Server Components, route handlers, and thin actions.
src/modules/**       Business domains, each owning server, client, schema/types, and domain UI.
src/components/ui/** Reusable UI primitives with no business ownership.
src/providers/**     Truly app-wide client infrastructure only.
src/stores/**        Browser-owned shared state only.
src/hooks/**         Cross-domain browser hooks with no business ownership.
src/lib/**           Cross-cutting infrastructure such as Prisma, Supabase, HTTP, errors, logging.
prisma/ supabase/    Schema, migrations, and hosted-service configuration.
```

Dependencies point toward the owning domain or lower-level infrastructure:

- `app` composes modules and adapters. Route files stay thin.
- `modules/<domain>/ui` may consume that domain's client hooks and shared UI primitives.
- `modules/<domain>/client` may import client-compatible schemas/types and `lib/http`; it must
  not import Prisma, server modules, or Server Actions.
- `modules/<domain>/server` may import Prisma, server auth/policy infrastructure, and
  client-compatible domain contracts; it must not import app routes, providers, stores, or UI.
- `components/ui` must not import business modules, app routes, providers, stores, Prisma, or
  server-only code.
- `lib` must not become a second domain layer. Business rules belong to the owning module.
- one domain may consume another domain's public contract, but not its internal UI or private
  implementation files.

The architecture guard enforces the migration-safe subset of these rules now and will tighten
as legacy paths are removed.

## Legacy-path rule

### `src/features/**`

`features/**` is legacy composition. Existing files may be fixed or moved, but do not add a new
production feature module there. New business capability belongs under `src/modules/<domain>/**`.

### top-level `src/server/**`

Top-level `server/**` is legacy business ownership. Existing modules may remain until their
scheduled migration phase, but new domain queries, commands, policies, and mappers belong under
`src/modules/<domain>/server/**`.

Cross-cutting server infrastructure may remain under `src/lib/**` when it is genuinely
cross-domain, for example Prisma, Supabase server clients, logging, and HTTP/error primitives.

## Domain language contract

The following terms are authoritative and are not interchangeable.

### Product

A **product** is the canonical sellable-item definition: name, slug, description, media,
pricing, category, collection, variants, sizes, colours, merchandising, and publication status.

Canonical domain folder: `products`.

### Inventory

**Inventory** is stock and availability associated with products: quantity, individual pieces,
SKU, movements, reservations, holds, sold state, location, availability, damage, and returned
stock.

A product may exist with zero inventory. Inventory is not a synonym for product.

### Catalogue

The **catalogue** is the public read model and presentation of published products: browsing,
search, filters, sorting, category/collection views, and product-card projections.

Catalogue is not a CRUD or persistence domain. Product creation, update, publication, archive,
and deletion belong to `products`.

Use the British spelling `catalogue`. Existing American-spelled `catalog*` identifiers are
legacy debt; changed code may not increase that debt.

### Storefront

**Storefront** is the customer-facing application surface: shell, homepage, catalogue and
product-detail presentation, cart presentation, saved-items presentation, and customer-facing
overlays.

Storefront is not a persistence or payment-settlement domain.

### Admin

**Admin** is the staff-facing application surface. It is not a business domain and must not own
duplicate product, inventory, order, customer, return, or payment persistence.

### Commerce

`commerce` is a conceptual umbrella for products, inventory, orders, checkout, payments, and
returns. It is not an additional permanent folder layer in the target source tree.

### Repository

Use `repository` only for a real infrastructure abstraction where persistence implementations
or external backends are genuinely interchangeable. A wrapper around an array, React store,
Promise, or `fetch()` is not automatically a repository.

Prefer direct names such as `queries.ts`, `commands.ts`, `api.ts`, `policy.ts`, and `mappers.ts`
until a repository boundary is justified.

## Transport boundaries

- Client remote reads and mutations: TanStack Query hook → typed browser API client → Route
  Handler → domain operation → Prisma.
- Server Component reads: Server Component → domain server query → Prisma.
- Server Actions: optional thin form/redirect adapters → domain command.
- Webhooks: Route Handler → idempotent domain command → transaction.

A Route Handler must not call a Server Action. A TanStack Query hook must not import a
`"use server"` module. Server Components must not call internal application APIs for their own
reads.

## State ownership

- Prisma: persistent business state.
- TanStack Query: remote browser cache.
- URL search parameters: navigable filters, sorting, search, pagination, selected status/tab.
- Zustand: shared browser-owned state such as guest cart IDs, saved IDs, and global overlays.
- `useState`/reducers: component-local temporary state.
- Server session/policy: authentication and permissions.

Do not duplicate server records across Context, AdminStore, QueryClient, and Zustand.

## UI preservation

Architecture work must preserve the Phase 0 UI and interaction baseline: header, footer,
homepage composition, cards, catalogue, PDP, account, cart, checkout, admin presentation,
typography, spacing, themes, overlays, animations, and responsive behaviour.

Move existing UI instead of rewriting it. Any unexplained screenshot difference is a regression.

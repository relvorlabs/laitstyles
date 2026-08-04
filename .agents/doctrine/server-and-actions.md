# Doctrine: Server, API, actions & data access

Owner of: server-vs-client rendering, Route Handlers, Server Actions, Prisma/Supabase,
authorization, transactions, caching, and TanStack Query.
Cited by: domain-engineer, data-engineer, ui-engineer.

The repository uses Next.js 16 and React 19.

## Server-first rendering

- Prefer Server Components for route composition, initial business reads, and SEO-sensitive
  content.
- Use Client Components only for browser APIs, interaction state, client query hooks, or
  client-side forms.
- Server Components call domain server queries directly. They do not call internal `/api/**`
  routes for their own data.
- Keep server-only code, secrets, privileged adapters, and Prisma out of client bundles.
- Avoid request waterfalls; start independent work together and stream only real asynchronous
  sections.

## Standard data flows

### Interactive browser read or mutation

```text
Client Component
  → TanStack Query hook
  → typed API client
  → Route Handler
  → domain query or command
  → Prisma
```

### Server-rendered read

```text
Server Component
  → domain server query
  → Prisma
```

### Form-specific Server Action

```text
Form or Client Component
  → thin Server Action
  → domain command
  → Prisma
```

### Webhook

```text
Route Handler
  → idempotent domain command
  → Prisma transaction
```

Route Handlers and Server Actions are separate transport adapters. Neither calls the other for
reuse. Both may call the same domain command or query.

## Choosing the transport

- **Server Component read** — default for initial rendering and server-owned reads.
- **Route Handler** — machine-readable browser APIs, external clients, webhooks, explicit HTTP
  semantics, polling, and client-side CRUD.
- **Server Action** — optional thin adapter for progressively enhanced forms, route-owned
  redirect/revalidation, or an interaction where action semantics are clearly simpler.
- **Client API** — browser HTTP calls only; it must not import Prisma, sessions, or Server
  Actions.

A Server Action validates transport input, calls a domain operation, maps the result, and
optionally redirects or revalidates. Reusable database and policy rules do not live inside the
action.

## Prohibited transport coupling

- TanStack Query hooks must not import a `"use server"` module.
- Route Handlers must not import Server Actions.
- Client Components must not import Prisma or domain server modules.
- Server Components must not fetch internal application APIs for their own reads.
- API endpoints must not hide an in-memory store or dummy array behind `Promise.resolve()`.

Temporary legacy exceptions must be exact, documented, machine-readable, and assigned to a
removal phase.

## Data access: Prisma and Supabase

- Prisma is the schema, migration, transaction, and ordinary application-data authority.
- Supabase provides PostgreSQL hosting and authentication/session handling.
- Do not use the Supabase JavaScript client for ordinary CRUD unless an explicit exception is
  documented.
- Enforce authorization on the server before sensitive reads or writes.
- Use transactions for stock, reservation, order, payment, fulfilment, refund, and other
  multi-step state transitions.

## Production data rule

Production routes, providers, hooks, and modules must not import:

```text
tests/fixtures/
tests/factories/
stories/fixtures/
scripts/seed/
development/fixtures/
```

Seed and fixture data may support tests, stories, local development, or explicit seeding only.
A successful production mutation must survive reload; no runtime fallback may silently restore
mock data.

## Cache Components

Cache Components remain enabled. Use cache boundaries only with a real freshness and
invalidation strategy.

- Do not cache local arrays or prototype state to make them appear production-ready.
- A write that changes cached data must invalidate or update the corresponding cache.
- Cache tags are domain-specific implementation details and must not create a second data owner.

## TanStack Query

TanStack Query owns remote browser cache only.

- Query functions call typed browser API clients.
- Query keys include every result-affecting identifier, filter, sort, and pagination value.
- Configure stale time, retries, refetch, garbage collection, and cancellation intentionally.
- Query functions consume the supplied `AbortSignal` and pass it through the typed API client.
- Do not copy query results into Context, AdminStore, reducers, or Zustand.
- Mutations prefer authoritative cache replacement, then targeted invalidation; optimistic
  updates require deterministic rollback and are not used casually for payments, stock,
  reservations, fulfilment, refunds, or unique-item ownership.
- Do not use TanStack Query around local arrays or Promise-wrapped client stores.

After a successful mutation, replace the exact authoritative resource returned by the server when
possible, invalidate only affected lists or projections, and await invalidation when the visible UI
depends on the refreshed result. A domain command that changes server-cached reads owns its
`revalidateTag` or `revalidatePath` decision; transport adapters do not duplicate that policy.

Polling is limited to genuinely asynchronous remote state with a documented interval, stop
condition, visibility behaviour, and error strategy. Static catalogue, product, category, settings,
and completed-order reads do not poll by default.

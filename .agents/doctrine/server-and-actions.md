# Doctrine: Server, API, actions & data access

Owner of: server-vs-client rendering, Server Actions vs route handlers vs client adapters,
Prisma/Supabase, authorization, transactions, Cache Components, TanStack Query.
Cited by: domain-engineer, data-engineer, ui-engineer.

The repo uses **Next.js 16** and **React 19**.

## Server-first rendering

- Prefer Server Components for route composition, data access, and static boundaries.
- Use Client Components only when browser APIs, interaction state, client query hooks, or
  client-side form workflows require them. Avoid page-wide client rendering when only a
  subsection is interactive.
- Respect current async conventions for `params`, `searchParams`, `cookies`, `headers`.
- Add `loading.tsx`, `error.tsx`, and not-found boundaries when the route needs them.
- Avoid request waterfalls — start independent work together. Stream real async sections with
  Suspense; do not wrap synchronous prototype data in Suspense for appearance.
- Use `next/image` with accurate `sizes` for product imagery. Dynamically load heavy
  client-only modules only for a real bundle or interaction benefit.
- Keep server-only code, secrets, and privileged adapters out of client bundles.

## Choosing the write/read transport

- **Server Component read** — default for rendering business data.
- **Server Action** (`'use server'`, colocated e.g. `app/auth/actions.ts`,
  `features/**/review-actions.ts`) — for mutations invoked from the user's own forms/UI.
  Server Actions are **not** browser query functions — do not call them as TanStack
  `queryFn`.
- **Route handler** (`app/api/**`) — for webhooks, external callers, and browser-safe
  fetch/RPC endpoints (e.g. `api/payment/*`, `api/health`).
- **Client-safe adapter** — browser-executed reads that contain no secrets and need no
  server authority.

## Data access: Prisma & Supabase

- **Prisma** is the schema, migration, and ordinary data-access authority: application CRUD,
  relations, transactions, schema evolution, generated types. Client in `src/lib/prisma`.
- **Supabase** provides PostgreSQL hosting and **authentication/session** handling
  (`src/lib/supabase`). Do not use the Supabase JS client for ordinary application CRUD
  unless an exception is documented.
- Enforce authorization on the **server** (`src/server/auth` session + `src/lib/auth` policies).
  Validate ownership, role, and access before sensitive reads/writes. Never rely on hidden UI
  as enforcement.
- Use transactions for multi-step writes that must succeed or fail together. Treat stock,
  unique-item ownership, payment state, fulfilment, refunds, and reservation transitions as
  concurrency-sensitive.

## Cache Components & freshness

Cache Components are enabled repo-wide. Do not disable or reconfigure without approval.

- Use `use cache`, `cacheTag`, `cacheLife` only where a real freshness boundary and
  invalidation strategy exist. Do not cache in-memory prototype reads, seed arrays, or static
  JSON.
- A write that changes cached data must invalidate or update the corresponding tags.
- The catalogue read path may cache with the `catalogue` / `product-${slug}` tags (a
  catalogue-feature convention — see [architecture](architecture.md)).
- **Boundary:** never add caching to make synchronous or static prototype code look
  production-ready.

## TanStack Query (client server-state)

Use it only when a feature must synchronize server-like resource state in the browser
(client in `src/lib/query`). Do not add it to wrap local arrays or imitate a backend.

When used:

- Typed array query keys; one key factory per domain, colocated with the domain data layer.
- Include every data-affecting filter, sort, saved view, pagination value, and identifier in
  the key.
- Configure stale time, retry, refetch, and GC intentionally. Distinguish initial-pending,
  error, empty, stale, and background-refetch states; keep cached data visible during
  background refetch.
- Per-request server `QueryClient`, stable browser `QueryClient` when hydrating; never reuse
  a server cache across requests.
- Do not copy query data into Context/reducers/Zustand (see [state-and-data](state-and-data.md)).

Mutations — prefer the least risky strategy in order: (1) exact cache replacement from the
authoritative result, (2) targeted invalidation, (3) optimistic update only for reversible,
low-conflict actions. Every optimistic update needs query cancellation, a previous-cache
snapshot, a deterministic optimistic value, rollback on error, and reconciliation on settle.
**Boundary:** never optimistically finalise sales, payments, fulfilment, stock release,
returns, refunds, reservations, or unique-item ownership unless concurrency and rollback
safety are proven.

**Boundary (prototype transport):** deterministic Promise-based in-memory repositories are
fine for prototypes; server-only prototype repositories may be prefetched and dehydrated but
browser refetch stays disabled until a browser-safe transport exists. Do not build fake API
routes whose only purpose is to disguise local arrays, and do not add random latency or
failures — test error/stale behaviour through deterministic injected adapters.

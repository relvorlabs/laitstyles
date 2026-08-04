# Doctrine: Next.js and React frontend architecture

Owner of: route/UI layering, Server/Client Component boundaries, API consumption, composition,
runtime safety and performance.
Cited by: frontend engineer, server-side engineer, planner and reviewer.

## Frontend responsibility

The frontend owns product presentation, interaction, browser state, client caching and
accessibility. It consumes server behavior; it does not duplicate Prisma, authorization or business
invariants.

## Module shape

```text
src/modules/<domain>/
├── client/       typed API functions, query keys, Query hooks and mutations
├── model/        frontend-only derivation/view models when needed
├── ui/           domain components and complete states
├── schema.ts     shared runtime contract owned with the server-side surface
└── index.ts      narrow public surface
```

Routes compose modules. Route files do not become monolithic feature implementations.

## Server and Client Components

Server Components are the default.

Use a Server Component for route/layout composition, initial server reads, metadata and static or
request-derived presentation that does not require browser hooks or events.

Use a Client Component only for:

- event handlers and mutable interaction state;
- TanStack Query or Supabase browser hooks;
- browser APIs/storage;
- focus-managed interactive primitives;
- optimistic interaction or live subscriptions.

Place `"use client"` at the smallest stable boundary. A client boundary pulls imported descendants
into the client graph; keep it narrow.

Do not make an async Client Component. Pass only minimal serializable values from server to client.
Do not use `suppressHydrationWarning` as a general repair.

## Data acquisition

- Server Components call module server queries directly.
- Client Components use TanStack Query and domain API functions.
- Auth UI uses the Supabase browser client.
- Do not call Prisma or server modules from client code.
- Do not call internal APIs from Server Components for their own reads.
- Do not create a Server Action as a hidden replacement for the established browser API flow.

When server prefetch/hydration materially improves a route, use a request-scoped QueryClient,
shared query options and the narrowest HydrationBoundary. Do not add hydration ceremony without a
real benefit or fetch the same data twice.

## Runtime and null safety

- Parse API, URL, storage, extension and third-party data before use.
- Do not introduce `any`, unsafe assertions, non-null assertions or optional fields to silence
  incomplete state handling.
- Model loading, empty, unauthorized, unavailable, partial and success states explicitly.
- Use discriminated unions and exhaustive rendering.
- Do not hide required missing data with optional-chaining chains or `?? ""`.
- Export explicit return types for public API functions and hooks.

## Composition

- Build components around stable product concepts and coherent interactions.
- Prefer explicit semantic variants over boolean-prop matrices.
- Use compound components only when consumers need flexible composition around shared state.
- Keep providers narrow and near their consumers.
- Derive values during render; do not mirror props or Query data into effects/local state.
- Do not define components inside components.
- Use stable domain IDs as keys.
- Do not create generic `DataCard`, `InfoBox`, `UniversalModal` or page-builder systems without
  several proven product uses.

## Performance

Prioritize request-waterfall removal, narrow client bundles, avoiding duplicate reads, minimal
server/client serialization, narrow Query/store subscriptions and deliberate loading of heavy
client-only libraries.

Do not memoize every value, wrap every component in `memo` or add cache layers without evidence.

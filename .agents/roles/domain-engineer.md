# Role: Domain Engineer

**Mandate.** Own domain contracts, server operations, browser API clients/hooks, authorization
policies, and thin transport adapters without mixing those responsibilities.

**Owns.**

- `src/modules/<domain>/schema.ts` and `types.ts`.
- `src/modules/<domain>/server/**` queries, commands, policies, and mappers.
- `src/modules/<domain>/client/**` typed HTTP clients and TanStack hooks.
- Thin Route Handlers under `src/app/api/**` and thin Server Actions where justified.
- Cross-cutting HTTP/error infrastructure under `src/lib/**`.
- Existing top-level `src/server/**` only for scoped fixes or migration into the owning module;
  it is not a destination for new business modules.

**Does not own.** Presentational design, generic UI primitives, schema/migrations, theme tokens,
or browser-owned shared state.

**Obeys.** [architecture](../doctrine/architecture.md),
[server-and-actions](../doctrine/server-and-actions.md),
[state-and-data](../doctrine/state-and-data.md),
[product](../doctrine/product.md), and
[conventions](../doctrine/conventions.md).

## Working rules

- Server Components call domain queries directly.
- Interactive Client Components call typed API clients through TanStack Query.
- Route Handlers and Server Actions call shared domain operations; they never call each other.
- Client hooks never import `"use server"` modules.
- Enforce authentication, authorization, ownership, and state transitions on the server.
- Use Prisma transactions for stock, reservation, payment, order, fulfilment, return, and refund
  operations that must commit atomically.
- Do not hide fixtures, arrays, or client stores behind fake asynchronous repository contracts.
- Keep product, inventory, catalogue, storefront, and admin language distinct.

## Handoff

Provide explicit schemas/types, server operations, transport contracts, authorization evidence,
tests, and cache/invalidation behaviour. Hand UI contracts to the UI engineer and schema needs to
the data engineer.

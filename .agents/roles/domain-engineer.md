# Role: Domain Engineer

**Mandate.** Own server-side domain logic and the transports that expose it: repositories,
mappers, policies, authorization checks, Server Actions, and route handlers. This is where
business rules and prototype boundaries live.

**Owns.**
- `src/server/**` (commerce catalogue/orders/reviews, auth, assets).
- `src/lib/**` domain utilities (`commerce`, `catalogue.ts`, `order.ts`, `money`, `errors`,
  `auth` permissions/roles, `query` factories, `boundaries`).
- Server Actions (`'use server'`, colocated with their feature) and route handlers in
  `src/app/api/**`.

**Does not own.** Presentational components, schema/migrations (→ data-engineer), or theme/UI
tokens. Expose data to the UI through props, Server Components, or the sanctioned client-safe
transport — never leak server-only modules into client bundles.

**Obeys.** [server-and-actions](../doctrine/server-and-actions.md),
[state-and-data](../doctrine/state-and-data.md), [product](../doctrine/product.md),
[architecture](../doctrine/architecture.md), [conventions](../doctrine/conventions.md).

## Working rules

- Model `unique` / `stocked` / `variant` as discriminated unions; keep invariants in domain
  logic, not UI conditions (see [product](../doctrine/product.md)).
- Pick the transport deliberately: Server Component read, Server Action (user's own
  mutations — never a TanStack `queryFn`), route handler (webhooks / browser-safe endpoints),
  or client-safe adapter. See [server-and-actions](../doctrine/server-and-actions.md).
- Enforce authorization on the server; validate ownership/role/access before sensitive
  reads/writes. Use transactions for all-or-nothing multi-step writes and for
  concurrency-sensitive stock/payment/fulfilment transitions.
- Respect Cache Components rules and the catalogue tag convention; invalidate tags on writes
  that change cached data.
- Keep prototype adapters deterministic and visible; no fake API routes, random latency, or
  random failures.

## Skills / tools

Supabase / Postgres best-practice skills for data-adjacent work, testing skills for repository
and policy tests (colocated `*.test.ts`).

**Handoff out.** Typed domain functions/transports with tests, a stated data contract for the
ui-engineer, and any schema needs delegated to the data-engineer. Hand back to the
orchestrator.

# Role: Data Engineer

**Mandate.** Own the data model and identity layer: Prisma schema and migrations, generated
types, and Supabase authentication/session configuration.

**Owns.**
- `prisma/**` (schema, migrations).
- `supabase/**` (hosted-service and auth config).
- `src/lib/prisma` (client) and `src/lib/supabase` (client) wiring.

**Does not own.** Application CRUD call sites and domain rules (→ domain-engineer), or UI. It
provides the schema, generated types, and auth primitives that the domain-engineer builds on.

**Obeys.** [server-and-actions](../doctrine/server-and-actions.md) (data-access & authz
sections), [product](../doctrine/product.md), [architecture](../doctrine/architecture.md),
[conventions](../doctrine/conventions.md).

## Working rules

- Prisma is the authority for schema evolution, relations, transactions, and generated types.
  Model the three inventory types (`unique` / `stocked` / `variant`) so they are representable
  without the legacy quantity-one assumption.
- Migrations are deliberate and reviewed; keep them consistent with existing data and the
  documented single-store auth/database architecture (`docs/architecture/*`).
- Supabase is for authentication/session handling — not ordinary application CRUD unless an
  exception is documented.
- Treat stock, unique-item ownership, payment state, fulfilment, refunds, and reservation
  transitions as concurrency-sensitive at the schema/constraint level.

## Skills / tools

`.agents/skills/supabase`, `.agents/skills/supabase-postgres-best-practices`, Prisma tooling
via `pnpm`.

**Handoff out.** Migrated schema + regenerated types + auth primitives, with the change and
its concurrency/constraint implications documented for the domain-engineer. Hand back to the
orchestrator.

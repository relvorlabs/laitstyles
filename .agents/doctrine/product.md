# Doctrine: Product truth & scope

Owner of: what Laitstyles is, inventory models, prototype boundaries, scope guardrails.
Cited by: planner, domain-engineer, data-engineer.

## Inventory models

Laitstyles supports three, and every catalogue-touching decision must hold all three:

- `unique` — one-of-one pieces.
- `stocked` — multiple identical units.
- `variant` — one product with size / colour / other stock-bearing variants.

Never restore the legacy assumption that every item has quantity one. Model these three as
discriminated unions in domain code (see [conventions](conventions.md)).

## Prototype boundaries

Until a real integration exists for a given capability:

- Use typed, deterministic data behind explicit adapters.
- Keep prototype boundaries visible — do not disguise local data as a live backend.
- Do not claim production persistence, payment processing, courier updates, uploads,
  authentication, stock locking, or background processing that does not exist.
- Do not add random timers, fake network delays, random failures, random status changes, or
  simulated background jobs as normal behaviour.
- Do not create dead buttons or actions that imply unavailable capabilities.

Where real integrations already exist (Prisma-backed catalogue, orders, reviews; Supabase
auth), treat them as production and hold their guarantees — see
[server-and-actions](server-and-actions.md).

## Scope guardrails

Do not expand into supplier management, accounting, warehouse management, marketing
automation, or platform administration unless an active specification or a direct user
instruction adds that scope. Do not implement speculative infrastructure or drive-by
refactors; see [conventions](conventions.md) for the focus rule.

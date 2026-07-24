# Role: UI Engineer

**Mandate.** Preserve and evolve presentational and interactive UI while consuming data through
the owning domain's props or client hooks.

**Owns.**

- `src/modules/*/ui/**`.
- `src/components/**`, especially generic primitives under `components/ui`.
- `src/stores/**` and truly cross-domain browser hooks.
- Client Components and interactive route segments under `src/app/**`.
- Existing `src/features/**` only for scoped fixes or migration into the owning module; it is
  not a destination for new production business features.

**Does not own.** Domain server rules, Prisma access, Route Handler business logic, Server
Actions, schema/migrations, or authorization.

**Obeys.** [architecture](../doctrine/architecture.md),
[server-and-actions](../doctrine/server-and-actions.md),
[state-and-data](../doctrine/state-and-data.md),
[ui-and-design-system](../doctrine/ui-and-design-system.md), and
[conventions](../doctrine/conventions.md).

## Working rules

- Preserve the Phase 0 visual and interaction baseline during architecture phases.
- Default to Server Components; create the smallest necessary Client Component.
- Use URL state for navigable filters/sort/search/pagination, TanStack Query for remote browser
  cache, Zustand for shared browser-owned state, and local React state for local interactions.
- Do not import Prisma, top-level server modules, `modules/*/server/**`, or Server Actions into
  client code.
- Reuse existing JSX, class names, tokens, and primitives when moving UI.
- Do not use architecture migration as visual cleanup.

## Handoff

Provide working UI with explicit loading, empty, error, disabled, and responsive states, plus the
data contract required from the domain engineer. Hand back to the orchestrator for review gates.

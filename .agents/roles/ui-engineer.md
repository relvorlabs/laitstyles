# Role: UI Engineer

**Mandate.** Build and change presentational + interactive UI: the design system, feature
screens, and the client parts of routes. Owns interaction state; consumes server data via
props and the sanctioned data hooks.

**Owns.**
- `src/components/**` (design system, primitives, shared UI).
- `src/features/**` composition and client components.
- Client Components and interactive segments inside `src/app/**`.

**Does not own.** Domain logic, repositories, Server Actions, schema, or authorization —
those are the domain-engineer's and data-engineer's. Render data from props/hooks; do not
fetch business data or embed domain rules in components.

**Obeys.** [ui-and-design-system](../doctrine/ui-and-design-system.md),
[state-and-data](../doctrine/state-and-data.md),
[conventions](../doctrine/conventions.md), and the server-first rules in
[server-and-actions](../doctrine/server-and-actions.md) (keep interactivity to the smallest
segment that needs it).

## Working rules

- Default to Server Components; reach for a Client Component only when browser APIs,
  interaction state, client query hooks, or client-side forms require it.
- Apply the state ladder from [state-and-data](../doctrine/state-and-data.md): most values are
  local; `useState` only for locally-owned state; server/URL/shared state go to their rungs.
- Compose existing shadcn / Base UI primitives (style `base-mira`, HugeIcons) before building
  custom ones; load the `shadcn` skill for registry work.
- Meet the responsive and accessibility gates in
  [ui-and-design-system](../doctrine/ui-and-design-system.md).

## Skills / tools

`shadcn`, `frontend-design` / `ui-ux-pro-max` when shaping new visual design, browser tooling
for viewport and interaction checks (see [toolchain-and-skills](../doctrine/toolchain-and-skills.md)).

**Handoff out.** Working UI with explicit loading/empty/error/disabled states, reviewed at the
required viewports, plus notes on any data contract it needs from the domain-engineer.
Hand back to the orchestrator; the reviewer runs the gates.

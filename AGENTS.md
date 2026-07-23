# Laitstyles — agent entry point

This file is the entry point every agent loads. It is deliberately thin: it sets the
authority order, maps the fleet, and routes you into the doctrine and roles that hold the
actual rules. The full system lives in [`.agents/`](.agents/README.md) — one owner per
concern, no duplicated rules.

> Do not add rules here. A new rule belongs in the one `.agents/doctrine/*` file that owns its
> concern. This router only points.

## Authority order

Obey the highest applicable source; a lower source may refine a higher one but never silently
contradict it. Record any user-instructed override. Full rule:
[`.agents/doctrine/00-authority.md`](.agents/doctrine/00-authority.md).

1. Platform, safety, tool constraints → 2. Explicit user instruction → 3. This file +
`.agents/**` doctrine → 4. Active feature spec → 5. Active plan / progress / decisions →
6. Skills & tool guidance → 7. General model knowledge.

## Before you change code

1. Identify the task, branch, requested scope, and expected output.
2. Read the relevant doctrine below and any active spec/plan in `docs/**`.
3. Inspect the affected code, `package.json`, lockfile, `components.json`, tsconfig, Tailwind
   config, and existing contracts before proposing changes.
4. Confirm the package manager — this repo uses **`pnpm`**.
5. Report missing skills, unavailable MCPs, blocked browser tools, or failed validation
   honestly. Never claim a check ran when it did not.

## Doctrine — the law (`.agents/doctrine/`)

| Concern | File |
| --- | --- |
| Authority, overrides, honesty | [00-authority](.agents/doctrine/00-authority.md) |
| Product truth, inventory models, prototype boundaries, scope | [product](.agents/doctrine/product.md) |
| Project structure, layering, separation of concern | [architecture](.agents/doctrine/architecture.md) |
| Naming, files, TypeScript, focus, commits/PRs | [conventions](.agents/doctrine/conventions.md) |
| State ownership ladder (avoid stray `useState`) | [state-and-data](.agents/doctrine/state-and-data.md) |
| Server-first, actions/handlers, Prisma/Supabase, cache, TanStack | [server-and-actions](.agents/doctrine/server-and-actions.md) |
| shadcn/Base UI, tokens, forms, a11y, responsive | [ui-and-design-system](.agents/doctrine/ui-and-design-system.md) |
| Skill resolution, MCP/browser tools, pnpm | [toolchain-and-skills](.agents/doctrine/toolchain-and-skills.md) |
| Validation gates & completion reporting | [validation-and-reporting](.agents/doctrine/validation-and-reporting.md) |

## The fleet — who does what (`.agents/roles/`)

Dispatch through the [orchestrator](.agents/roles/orchestrator.md); it classifies the task and
sequences the roles. Each role owns a distinct repo surface — no two edit the same territory.

| Role | Owns |
| --- | --- |
| [orchestrator](.agents/roles/orchestrator.md) | Dispatch, sequencing, gate enforcement (no source edits). |
| [planner](.agents/roles/planner.md) | Scope + step plan in `docs/**`. |
| [ui-engineer](.agents/roles/ui-engineer.md) | `src/components/**`, `src/features/**`, client parts of `src/app`. |
| [domain-engineer](.agents/roles/domain-engineer.md) | `src/server/**`, `src/lib/**`, Server Actions, `src/app/api`. |
| [data-engineer](.agents/roles/data-engineer.md) | `prisma/**`, `supabase/**`, `lib/prisma`, `lib/supabase`. |
| [reviewer](.agents/roles/reviewer.md) | Gates, diff review, a11y/responsive, PR body (no source edits). |

Spawnable Claude Code subagents mirror these in `.claude/agents/**` as thin stubs that point
back here.

## Workflows — how roles chain (`.agents/workflows/`)

- [feature](.agents/workflows/feature.md) — spec → planner → data → domain → ui → reviewer.
- [bugfix](.agents/workflows/bugfix.md) — systematic-debugging → owning engineer → reviewer.
- [ui-change](.agents/workflows/ui-change.md) — design → ui-engineer → reviewer.

## Completion

Nothing is complete until the [reviewer](.agents/roles/reviewer.md) passes the gates in
[validation-and-reporting](.agents/doctrine/validation-and-reporting.md) and produces an honest
completion report. Never present planned, mocked, or unverified behaviour as done.

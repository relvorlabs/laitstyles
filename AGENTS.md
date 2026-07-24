# Laitstyles — agent entry point

This file is the entry point every agent loads. It is deliberately thin: it sets the
authority order, maps the fleet, and routes into the doctrine and roles that own the actual
rules. The full system lives in [`.agents/`](.agents/README.md).

> Do not add detailed rules here. A rule belongs in the one `.agents/doctrine/*` file that owns
> its concern. This router only points.

## Authority order

Obey the highest applicable source; a lower source may refine a higher one but never silently
contradict it. Record any user-instructed override. Full rule:
[`.agents/doctrine/00-authority.md`](.agents/doctrine/00-authority.md).

1. Platform, safety, tool constraints → 2. Explicit user instruction → 3. This file +
`.agents/**` doctrine → 4. Active feature spec → 5. Active plan / progress / decisions →
6. Skills and tool guidance → 7. General model knowledge.

## Before you change code

1. Identify the task, branch, active migration phase, requested scope, and expected output.
2. Read the relevant doctrine and the controlling documents in
   `docs/architecture-migration/**`.
3. Inspect affected code, `package.json`, lockfile, configuration, and existing contracts.
4. Confirm the package manager — this repository uses `pnpm`.
5. Report unavailable tools and unexecuted validation honestly.
6. Do not implement work assigned to a later migration phase.

## Doctrine — the law (`.agents/doctrine/`)

| Concern | File |
| --- | --- |
| Authority, overrides, honesty | [00-authority](.agents/doctrine/00-authority.md) |
| Product truth, inventory models, prototype boundaries, scope | [product](.agents/doctrine/product.md) |
| Target structure, legacy boundaries, domain language | [architecture](.agents/doctrine/architecture.md) |
| Naming, files, TypeScript, focus, commits/PRs | [conventions](.agents/doctrine/conventions.md) |
| State ownership | [state-and-data](.agents/doctrine/state-and-data.md) |
| Server Components, API, actions, Prisma, cache, TanStack | [server-and-actions](.agents/doctrine/server-and-actions.md) |
| UI primitives, tokens, forms, a11y, responsive | [ui-and-design-system](.agents/doctrine/ui-and-design-system.md) |
| Skill resolution, browser tools, pnpm | [toolchain-and-skills](.agents/doctrine/toolchain-and-skills.md) |
| Validation gates and completion reporting | [validation-and-reporting](.agents/doctrine/validation-and-reporting.md) |

## The fleet — who owns what (`.agents/roles/`)

Dispatch through the [orchestrator](.agents/roles/orchestrator.md). Each role owns a distinct
surface; legacy ownership is temporary and follows the migration tracker.

| Role | Owns |
| --- | --- |
| [orchestrator](.agents/roles/orchestrator.md) | Dispatch, sequencing, phase/gate enforcement; no source edits. |
| [planner](.agents/roles/planner.md) | Scope and plans under `docs/**`. |
| [ui-engineer](.agents/roles/ui-engineer.md) | `src/modules/*/ui/**`, `src/components/**`, `src/stores/**`, browser hooks, client route segments; legacy `features/**` only while migrating/fixing existing code. |
| [domain-engineer](.agents/roles/domain-engineer.md) | `src/modules/*/{server,client}/**`, domain schemas/types, HTTP adapters, thin actions/handlers; legacy `server/**` only while migrating/fixing existing code. |
| [data-engineer](.agents/roles/data-engineer.md) | `prisma/**`, `supabase/**`, Prisma/Supabase infrastructure. |
| [reviewer](.agents/roles/reviewer.md) | Gates, diff review, a11y/responsive, PR evidence; no source edits. |

Spawnable Claude Code subagents mirror these roles through `.claude/agents/**` stubs.

## Workflows

- [feature](.agents/workflows/feature.md) — spec → planner → data → domain → UI → reviewer.
- [bugfix](.agents/workflows/bugfix.md) — systematic debugging → owner → reviewer.
- [ui-change](.agents/workflows/ui-change.md) — design → UI engineer → reviewer.

## Completion

Nothing is complete until the reviewer applies
[validation-and-reporting](.agents/doctrine/validation-and-reporting.md). Never present planned,
mocked, billing-blocked, or unexecuted behaviour as done.

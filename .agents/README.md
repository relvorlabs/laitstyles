# Laitstyles agent system

This directory is the single source of truth for how agents work in this repository.
`AGENTS.md` is the thin entry point; `.claude/agents/**` contains stubs that point back to the
roles here.

## Structure

```text
AGENTS.md ──routes to──▶ .agents/doctrine/**   stable rules
                         .agents/roles/**       operators and owned surfaces
                         .agents/workflows/**   role sequencing
.claude/agents/** ─────▶ .agents/roles/**      spawnable stubs
```

Two rules keep the system maintainable:

1. **One owner per concern.** Put each rule in one doctrine file and link to it.
2. **Doctrine is not a role.** Doctrine defines ownership; roles operate the real current and
   target repository surfaces.

## Doctrine

| File | Owns |
| --- | --- |
| [00-authority](doctrine/00-authority.md) | Instruction precedence, overrides, honesty. |
| [product](doctrine/product.md) | Inventory models, prototype boundaries, scope. |
| [architecture](doctrine/architecture.md) | Target folder map, legacy boundaries, domain language, dependency direction. |
| [conventions](doctrine/conventions.md) | Naming, files, imports, TypeScript, focus, commits/PRs. |
| [state-and-data](doctrine/state-and-data.md) | State ownership. |
| [server-and-actions](doctrine/server-and-actions.md) | Server reads, API, actions, Prisma/Supabase, cache, TanStack. |
| [ui-and-design-system](doctrine/ui-and-design-system.md) | UI primitives, tokens, forms, accessibility, responsive behaviour. |
| [toolchain-and-skills](doctrine/toolchain-and-skills.md) | Skill resolution, browser tools, pnpm. |
| [validation-and-reporting](doctrine/validation-and-reporting.md) | Gates and completion reporting. |

## Roles

| Role | Owns |
| --- | --- |
| [orchestrator](roles/orchestrator.md) | Dispatch and phase/gate enforcement; no source edits. |
| [planner](roles/planner.md) | Planning artefacts in `docs/**`. |
| [ui-engineer](roles/ui-engineer.md) | Domain UI, shared UI, browser stores/hooks, client route segments; legacy features during migration only. |
| [domain-engineer](roles/domain-engineer.md) | Domain server/client contracts and transport adapters; legacy server paths during migration only. |
| [data-engineer](roles/data-engineer.md) | Prisma, Supabase, schema, migrations, database infrastructure. |
| [reviewer](roles/reviewer.md) | No source edits; gates, review, and PR evidence. |

## Migration authority

The controlling architecture documents are in `docs/architecture-migration/**`.

`src/features/**` and top-level `src/server/**` are current legacy paths, not templates for new
business modules. New domain work belongs under `src/modules/<domain>/**` according to the active
phase.

## Editing this system

- Add a rule to the one doctrine file that owns it.
- Update role maps when the target architecture changes.
- Keep `.claude/agents/**` as thin links rather than duplicated instructions.
- Do not start later-phase implementation while an earlier acceptance gate is open.

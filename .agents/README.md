# Laitstyles agent system

This directory is the single source of truth for how agents work in this repository.
`AGENTS.md` (repo root) is the thin entry point that routes here; the spawnable Claude Code
subagents in `.claude/agents/**` are stubs that point back to `roles/**` below.

## How it fits together

```
AGENTS.md ──routes to──▶ .agents/doctrine/**   (the law: what & why)
                         .agents/roles/**       (the fleet: who does what)
                         .agents/workflows/**   (how roles chain per task type)
.claude/agents/** ──stubs──▶ .agents/roles/**   (spawnable, no duplicated rules)
```

Two design rules keep this maintainable:

1. **One owner per concern.** Each rule lives in exactly one doctrine file. Roles and
   workflows *cite* doctrine by link; they never restate it. Change a rule in one place.
2. **Doctrine ≠ role.** Doctrine is stable law. Roles are thin operators bound to real repo
   folders, so separation of concern is structural, not aspirational.

## Doctrine (`doctrine/`)

| File | Owns |
| --- | --- |
| [00-authority](doctrine/00-authority.md) | Instruction precedence, overrides, honesty. |
| [product](doctrine/product.md) | Inventory models, prototype boundaries, scope. |
| [architecture](doctrine/architecture.md) | Real folder map, layering, separation of concern. |
| [conventions](doctrine/conventions.md) | Naming, files, TS, focus, commits/PRs. |
| [state-and-data](doctrine/state-and-data.md) | State-ownership ladder; avoid stray `useState`. |
| [server-and-actions](doctrine/server-and-actions.md) | Server-first, actions/handlers, Prisma/Supabase, cache, TanStack. |
| [ui-and-design-system](doctrine/ui-and-design-system.md) | shadcn/Base UI, tokens, forms, a11y, responsive. |
| [toolchain-and-skills](doctrine/toolchain-and-skills.md) | Skill resolution, MCP/browser tools, pnpm. |
| [validation-and-reporting](doctrine/validation-and-reporting.md) | Gates and completion reporting. |

## Roles (`roles/`)

| Role | Owns (repo surface) |
| --- | --- |
| [orchestrator](roles/orchestrator.md) | Dispatch only — classifies tasks, sequences roles, enforces gates. |
| [planner](roles/planner.md) | Planning artefacts in `docs/**`. |
| [ui-engineer](roles/ui-engineer.md) | `src/components/**`, `src/features/**`, client parts of `src/app`. |
| [domain-engineer](roles/domain-engineer.md) | `src/server/**`, `src/lib/**`, Server Actions, `src/app/api`. |
| [data-engineer](roles/data-engineer.md) | `prisma/**`, `supabase/**`, `lib/prisma`, `lib/supabase`. |
| [reviewer](roles/reviewer.md) | No source edits — gates, review, PR body. |

## Workflows (`workflows/`)

- [feature](workflows/feature.md) — spec → planner → data → domain → ui → reviewer.
- [bugfix](workflows/bugfix.md) — systematic-debugging → owning engineer → reviewer.
- [ui-change](workflows/ui-change.md) — design → ui-engineer → reviewer.

## Editing this system

- Add a rule → put it in the one doctrine file that owns the concern; link from roles.
- Add a role → it must declare mandate, owned surface, doctrine obeyed, skills/tools,
  handoff, and a "not my job → hand to X" list, and map to real folders. The roster is
  deliberately six; grow it only with a real, non-overlapping need.
- Never duplicate rule text into `.claude/agents/**`; those stay thin stubs.

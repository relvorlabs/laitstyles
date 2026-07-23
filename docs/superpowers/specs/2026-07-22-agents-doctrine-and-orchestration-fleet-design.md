# AGENTS.md → doctrine + orchestration fleet — design

Date: 2026-07-22
Status: approved-in-chat, pending spec review

## Problem

`AGENTS.md` is a single ~340-line flat contract that mixes altitude levels — product
doctrine, state-ownership law, framework tactics, design-system rules, and CI gates — in
one list. Consequences the user named:

- **Altitude mixing**: no concern has a clear owner; rules drift.
- **Argument-file tone**: heavy "do X but not Y unless Z" hedging (esp. Cache Components
  and TanStack Query sections) reads as defensive prose, not doctrine.
- **Feature leakage**: feature specifics (the `catalogue` / `product-${slug}` cache-tag
  convention, `server/commerce/catalogue/*` paths) live inside a repo-wide contract.
- **No structure/orchestration layer**: the file states rules but never maps them to the
  real repo layout, nor to how an agent should move through a task.

The user wants `AGENTS.md` split into a linked `.agents/**` set (product doctrine, project
structure, conventions, instructions, skills/toolchain, ui/state/shadcn, server/api/actions)
plus a **real** orchestration fleet — not dummy/spaghetti agents that add complexity.

## Goals

1. Preserve every real rule already in `AGENTS.md`; relocate, don't drop.
2. One owner per concern; a rule lives in exactly one file (kills contradictions).
3. Separate **doctrine** (stable law, the what/why) from **roles** (thin operators that
   cite doctrine, never restate it).
4. Map roles 1:1 to real repo seams so separation of concern is structural, not aspirational.
5. Keep `AGENTS.md` as the canonical, harness-loaded entry point — shrunk to a router.
6. Portable single source in `.agents/`; `.claude/agents/*` are thin spawnable stubs.

## Non-goals

- No new runtime/app code. Documentation + agent config only.
- No git commit unless the user asks.
- No change to lint/test/build tooling behavior.

## Anti-spaghetti invariants

- **One owner per concern.** No two roles edit the same class of file for the same reason.
- **Doctrine ≠ Role.** Role files cite doctrine by path; they must not restate rules.
- **Every role declares**: mandate, owned files/folders, doctrine it obeys, skills/tools it
  may call, handoff outputs, and an explicit "not my job → hand to X" list.
- **One dispatcher.** `roles/orchestrator.md` is the only entry that classifies a task and
  sequences roles. Roles never self-dispatch peers; they hand back to the orchestrator.

## Real repo seams (source of the role boundaries)

- `src/app/**` — route groups: `(home)`, `account`, `admin`, `control-room`, `api`, `auth`,
  `cart`, `checkout`, `collections`, `order-confirmation`, `products`.
- `src/features/{admin,storefront}` — feature composition.
- `src/server/commerce/{catalogue,orders,reviews,store}`, `src/server/{assets,authorization}`.
- `src/lib/**` — `commerce`, `catalogue.ts`, `order.ts`, `money`, `query`, `prisma`,
  `supabase`, `auth`, `boundaries`, `errors`, `admin`, `storefront`, `assets`.
- `src/components/{ui,shop,layout,brand,theme,providers}`.
- `prisma/`, `supabase/`, `.agents/skills/**`, `.ai/mcp/mcp.json`.

## Target structure

```
AGENTS.md                        # thin router: authority order, fleet map, dispatch rules
.agents/
  README.md                      # map of the doctrine + fleet system
  doctrine/
    00-authority.md              # instruction hierarchy, override recording
    product.md                   # inventory models, prototype boundaries, scope guardrails
    architecture.md              # real folder map + layering + separation of concern
    conventions.md               # naming, file size, imports, TS discipline, commits/PRs
    state-and-data.md            # state-ownership ladder; avoid useState unless locally owned
    server-and-actions.md        # server-first; actions vs route handlers vs client adapters;
                                 #   Prisma/Supabase, authz, transactions, Cache Components, TanStack
    ui-and-design-system.md      # shadcn base-mira + Base UI + HugeIcons, tokens, forms, a11y, responsive
    toolchain-and-skills.md      # skill resolution order, MCP/browser tools, pnpm
    validation-and-reporting.md  # lint/tsc/vitest/build/react-doctor gates, browser evidence, reporting
  roles/
    orchestrator.md              # router: classify task → sequence roles → enforce gates
    planner.md                   # scope, read specs, produce step plan
    ui-engineer.md               # owns src/components + src/features (client UI, shadcn, interaction state)
    domain-engineer.md           # owns src/server/commerce/* + src/lib/* + Server Actions/route handlers
    data-engineer.md             # owns prisma/ (schema, migrations) + supabase auth
    reviewer.md                  # validation gates + code review + a11y/responsive + PR body
  workflows/
    feature.md                   # spec → plan → domain → ui → review
    bugfix.md                    # systematic-debug → fix → review
    ui-change.md                 # design → ui-engineer → responsive/a11y review
.claude/agents/
  laitstyles-orchestrator.md     # thin stub → obey .agents/roles/orchestrator.md
  laitstyles-planner.md
  laitstyles-ui-engineer.md
  laitstyles-domain-engineer.md
  laitstyles-data-engineer.md
  laitstyles-reviewer.md
```

## Role → owned surface → doctrine map

| Role | Owns | Primary doctrine |
| --- | --- | --- |
| orchestrator | nothing (dispatch only) | authority, all workflows |
| planner | specs/plans under `docs/` | product, architecture, authority |
| ui-engineer | `src/components`, `src/features`, client parts of `src/app` | ui-and-design-system, state-and-data |
| domain-engineer | `src/server/**`, `src/lib/**`, Server Actions, route handlers in `src/app/api` | server-and-actions, state-and-data, product |
| data-engineer | `prisma/`, `supabase/`, `src/lib/prisma`, `src/lib/supabase` | server-and-actions (data/authz), product |
| reviewer | no source edits; reads diff, runs gates, writes PR body | validation-and-reporting, ui-and-design-system, conventions |

## Contradiction fixes applied in this pass

- Consolidate the three scattered "don't duplicate server state" rules (current §5/§6/§9)
  into `state-and-data.md`; cite elsewhere.
- Rewrite hedge-heavy Cache Components + TanStack sections into positive doctrine + one
  short "Boundaries" note each.
- Demote the `catalogue` / `product-${slug}` tag convention and `server/commerce/catalogue/*`
  paths into `architecture.md` as labeled examples, out of global law.
- Remove the stray trailing `:::` artifact.

## Drift control for the `.claude/agents` mirror

`.agents/roles/*.md` is canonical and holds the full role definition. Each
`.claude/agents/*.md` is a minimal frontmatter stub whose body is a one-paragraph pointer to
its `.agents/roles/*.md` counterpart and the doctrine index. No rule text is duplicated, so
there is nothing to drift.

## Verification

- All prior `AGENTS.md` rules accounted for (mapping table checked file-by-file).
- No rule appears in two doctrine files.
- Each role file links only to doctrine, `.agents/roles/orchestrator.md`, and its handoffs.
- `AGENTS.md` still loads (referenced by `CLAUDE.md`) and links every doctrine + role file.
- Markdown links resolve to real paths.
```

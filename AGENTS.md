# Laitstyles — agent entry point

This file is the thin entry point for engineering agents. The authoritative system lives in
[`.agents/`](.agents/README.md). Do not duplicate detailed standards here.

## Authority

Apply [`.agents/doctrine/00-authority.md`](.agents/doctrine/00-authority.md). In order:

1. platform, safety, and tool constraints;
2. the user's explicit request for the current task;
3. this file and `.agents/**`;
4. active product acceptance criteria and current architecture decisions;
5. verified repository code, configuration, tests, and dependency versions;
6. loaded skills and current official framework documentation;
7. general framework knowledge.

Repository evidence outranks stale plans. `docs/architecture-migration/**` may explain earlier
choices, but it does not authorize agents to execute a migration or block current work unless the
user explicitly makes that document authoritative for the task.

## Current architecture

Laitstyles is currently a Next.js application with server-side business logic:

- Server Components call domain server queries directly.
- Interactive browser reads and mutations use TanStack Query → typed browser API client →
  `src/app/api/v1/**` Route Handler → domain server operation → Prisma.
- Supabase owns authentication and session transport.
- Prisma owns ordinary application data in PostgreSQL's `public` schema.
- Thin Server Actions are optional form/redirect adapters; they are not a parallel business layer.
- NestJS is not the active runtime. The backend engineer is dispatched only for an explicitly
  requested NestJS migration or for an existing `apps/api/**` surface.

Full boundaries: [architecture](.agents/doctrine/architecture.md) and
[server-side architecture](.agents/doctrine/server-side-architecture.md).

## Roles

Dispatch through the [orchestrator](.agents/roles/orchestrator.md).

| Role | Current responsibility |
| --- | --- |
| [orchestrator](.agents/roles/orchestrator.md) | Routing, sequencing, handoff and gate control; no product source edits. |
| [planner](.agents/roles/planner.md) | Scope and executable delivery plans when planning is useful. |
| [server-side engineer](.agents/roles/server-side-engineer.md) | Current Next.js server logic, contracts, Route Handlers, Server Actions, Supabase Auth, Prisma, persistence and integrations. |
| [frontend engineer](.agents/roles/frontend-engineer.md) | Next.js UI, client boundaries, API consumers, TanStack Query, shadcn, Tailwind, themes, responsive and accessible UX. |
| [backend engineer](.agents/roles/backend-engineer.md) | NestJS API migration only when explicitly requested; inactive for ordinary current features. |
| [reviewer](.agents/roles/reviewer.md) | Independent review and validation verdict; no implementation edits. |

There is no separate contracts engineer, domain engineer, data engineer, or UI engineer. Their
responsibilities are owned by the active server-side and frontend engineers.

## Workflows

- [feature](.agents/workflows/feature.md)
- [bugfix](.agents/workflows/bugfix.md)
- [UI change](.agents/workflows/ui-change.md)

A source change is not complete until the reviewer applies
[validation and reporting](.agents/doctrine/validation-and-reporting.md).

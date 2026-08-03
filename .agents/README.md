# Laitstyles agent system

This directory is the single source of truth for how engineering agents work in Laitstyles.
`AGENTS.md`, `.claude/agents/**`, and `.codex/agents/**` are thin entry points only.

## Principles

1. **One owner per concern.** Current server behavior belongs to the server-side engineer;
   browser/product experience belongs to the frontend engineer.
2. **Current architecture is executable truth.** NestJS is not assumed or scaffolded until the
   user explicitly requests migration.
3. **Doctrine owns standards; roles own work; workflows own sequencing.** Do not duplicate rules
   across callers and roles.
4. **Runtime evidence outranks confidence.** Implementation includes tests and real behavior
   verification.
5. **Professional judgment over pattern accumulation.** Add a layer, store, queue, abstraction, or
   client boundary only when the current requirement justifies it.

## Current data and auth seam

```text
Server-rendered read
Next.js Server Component
  → src/modules/<domain>/server query
  → Prisma
  → Supabase-hosted PostgreSQL public schema

Interactive browser read or mutation
Client Component
  → TanStack Query hook
  → typed domain API function
  → /api/v1 Route Handler
  → authenticated/authorized domain operation
  → Prisma transaction/query

Authentication
Browser auth UI
  → src/lib/supabase/client.ts
  → Supabase Auth

Server identity
Server Component / Route Handler / Server Action
  → src/lib/supabase/server.ts
  → modules/auth/server/session.ts
  → Prisma profile/customer/staff authorization data

Session refresh
Next.js proxy
  → src/lib/supabase/proxy.ts
  → refreshes an existing Supabase cookie session with a bounded timeout
```

The Supabase browser client is not the ordinary application CRUD client. Application data flows
through Server Components or `/api/v1/**` and Prisma.

## Doctrine

| File | Owns |
| --- | --- |
| [00-authority](doctrine/00-authority.md) | Precedence, evidence, overrides, truthful status. |
| [product](doctrine/product.md) | Commerce truth, inventory modes, domain language and scope. |
| [architecture](doctrine/architecture.md) | Repository surfaces, role ownership and dependency direction. |
| [engineering-discipline](doctrine/engineering-discipline.md) | Evidence-driven implementation and engineering judgment. |
| [conventions](doctrine/conventions.md) | Naming, imports, TypeScript, files and change hygiene. |
| [server-side-architecture](doctrine/server-side-architecture.md) | Next.js server operations, rendering/transport choice, errors, caching and integrations. |
| [contracts-and-api](doctrine/contracts-and-api.md) | Zod wire contracts, API envelope, compatibility and OpenAPI. |
| [persistence](doctrine/persistence.md) | Prisma, PostgreSQL, migrations, transactions, idempotency and concurrency. |
| [authentication-and-security](doctrine/authentication-and-security.md) | Supabase Auth, sessions, authorization and browser/server security. |
| [frontend-architecture](doctrine/frontend-architecture.md) | Next.js RSC/client boundaries, API consumption, composition and runtime safety. |
| [state-and-data](doctrine/state-and-data.md) | URL, TanStack Query, form, local, Zustand and storage ownership. |
| [ui-and-design-system](doctrine/ui-and-design-system.md) | shadcn/Base UI, Tailwind tokens, themes, responsive UI and accessibility. |
| [toolchain-and-skills](doctrine/toolchain-and-skills.md) | Mandatory skills, package manager and version-aware tool use. |
| [validation-and-reporting](doctrine/validation-and-reporting.md) | Commands, behavioral proof, gates and completion reporting. |

## Roles

| Role | Source ownership |
| --- | --- |
| [orchestrator](roles/orchestrator.md) | No product source. |
| [planner](roles/planner.md) | Planning artifacts only when requested or useful. |
| [server-side engineer](roles/server-side-engineer.md) | `src/modules/**/server`, module schemas/contracts, `src/app/api/**`, thin actions, server infrastructure, `prisma/**`, `supabase/**`. |
| [frontend engineer](roles/frontend-engineer.md) | Domain UI/client modules, routes, providers, stores, design system and extension/browser surfaces. |
| [backend engineer](roles/backend-engineer.md) | Explicit NestJS migration surface only. |
| [reviewer](roles/reviewer.md) | No implementation source. |

Tests are owned by the engineer changing the behavior. The reviewer runs and evaluates them but
does not own their implementation.

## Editing this system

- Put stable standards in the doctrine file that owns the concern.
- Put professional behavior and source ownership in a role file.
- Put ordering and handoff barriers in a workflow file.
- Keep Claude and Codex callers thin.
- Do not add current-debt inventories, phase roadmaps, or unbuilt architecture claims to doctrine.

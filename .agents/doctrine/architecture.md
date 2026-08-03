# Doctrine: Architecture and source ownership

Owner of: current repository structure, role boundaries, dependency direction and NestJS migration
boundary.
Cited by: every role.

## Current architecture is authoritative

Laitstyles is currently one Next.js application. Current production business behavior remains in
Next.js server-side modules until the user explicitly requests a NestJS migration.

Do not scaffold `apps/api`, duplicate contracts, or redirect ordinary feature work to the NestJS
backend engineer because a future migration is possible.

## Repository surfaces

```text
src/app/**                    Next.js routes, layouts, Server Components and Route Handlers
src/modules/<domain>/**       domain schemas, server operations, browser clients and UI
src/components/ui/**          local shadcn/Base UI primitives
src/components/**             genuinely shared product composition
src/providers/**              app-level client infrastructure only
src/stores/**                 browser-owned shared state only
src/hooks/**                  cross-domain browser hooks only
src/lib/**                    server/client infrastructure with explicit boundaries
prisma/**                     Prisma schema, migrations and generated-client configuration
supabase/**                   Supabase Auth/database hosted-service configuration and SQL support
```

`src/features/**` and top-level `src/server/**` are legacy locations. Existing behavior may be
fixed or migrated, but new domain capability belongs in `src/modules/<domain>/**`.

## Role ownership

| Surface | Owner |
| --- | --- |
| Module Zod schemas and server/client wire contracts | Server-side engineer |
| `src/modules/**/server/**`, Route Handlers, thin Server Actions | Server-side engineer |
| `src/lib/prisma/**`, `src/lib/supabase/**`, `prisma/**`, `supabase/**` | Server-side engineer |
| `src/modules/**/client/**`, domain UI, routes, providers, stores | Frontend engineer |
| `src/components/ui/**`, themes and product component system | Frontend engineer |
| Explicit NestJS migration surface | Backend engineer |
| Tests for changed behavior | Implementing engineer |
| Independent verdict | Reviewer |

There is no separate contract, data, domain or UI engineer.

## Dependency direction

```text
Server-rendered route
app Server Component → module server query → Prisma

Interactive browser flow
module UI → module client hook → module API function → Route Handler
→ module server operation → Prisma/provider

Authentication
browser auth UI → Supabase browser client
server identity/policy → Supabase server client → profile/customer data through Prisma
```

Rules:

- Client code never imports Prisma, server-only modules, Supabase admin client or secrets.
- Server Components call module server queries directly; they do not fetch the app's internal API.
- TanStack Query hooks call typed browser API functions; they never import `"use server"` modules.
- Route Handlers and Server Actions may call the same module operation but never call each other.
- `components/ui` does not import business modules or remote state.
- A module consumes another module through a deliberate public entry point, not its private files.
- `src/lib` contains infrastructure, not business rules.
- Circular dependencies are resolved by ownership and composition, not broad barrels.

## NestJS boundary

The backend engineer is inactive for ordinary current tasks. Dispatch it only when:

- the user explicitly asks to migrate or implement a capability in NestJS; or
- an existing `apps/api/**` surface is present and is the requested target.

Before a NestJS migration, the server-side engineer documents current contracts, authorization,
transactions, cache behavior and consumer dependencies. The backend engineer preserves observable
behavior and uses the same runtime contracts rather than inventing a parallel API.

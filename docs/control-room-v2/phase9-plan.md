# Laitstyle Control Room V2 — Phase 9 Backend Readiness

## Objective

Prepare clean boundaries for Supabase Auth, Prisma repositories and later TanStack Query adoption without representing prototype data as production persistence.

## Scope

- Keep Supabase browser, server and proxy helpers under `src/lib/supabase/` for authentication only.
- Keep role definitions, capability mapping and guards under `src/lib/auth/`.
- Keep Prisma client construction server-only and centralize domain repositories.
- Preserve deterministic in-memory adapters until a domain has a real Prisma implementation.
- Keep asset providers behind typed server boundaries.
- Document the consumer/admin/manager role model and Prisma-only database workflow.

## Exclusions

- Applying migrations to a shared database
- TanStack Query runtime migration
- Payment, courier, messaging or realtime integrations
- Broad UI refactors

## Acceptance

- Browser code cannot import Prisma or service-role secrets.
- Supabase Auth code does not manage the application database.
- No adapter or query key contains store or tenant context.
- TypeScript, tests and build identify the boundary as valid.

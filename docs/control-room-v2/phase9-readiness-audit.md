# Phase 9 Readiness Audit

**Date:** 2026-07-10
**Status:** Implemented; executable gate passed except React Doctor timeout

## Sources reviewed

- `AGENTS.md`
- `docs/control-room-v2/spec.md`
- `docs/control-room-v2/implementation-plan.md`
- `docs/control-room-v2/phase9-plan.md`
- `docs/control-room-v2/progress.md`
- `package.json`
- `components.json`
- `src/app`
- `src/features/control-room`
- `src/lib/control-room`
- Supabase SSR, Google OAuth and RLS documentation
- Supabase Storage documentation
- Cloudflare R2 public bucket documentation
- Biome ESLint/Prettier migration documentation
- Next.js 16 local docs for Proxy and App Router conventions

## Current structure

The Control Room remains in the intended route-level architecture:

- `src/app/admin/*` owns route composition, loading and error boundaries.
- `src/features/control-room/*` owns focused UI and interaction workflows.
- `src/lib/control-room/*` owns deterministic domain types, selectors, actions, validation and the paused repository boundary.
- `src/lib/assets/*` owns browser-safe asset provider types, public provider selection and Next image remote-pattern configuration.
- `src/server/*` owns server-only runtime configuration such as Cloudinary and Cloudflare R2 credentials.
- `src/app/(shop)`, `src/app/checkout` and `src/app/account` are storefront/consumer surfaces and must stay outside Control Room staff permissions.

The existing paused TanStack work is contained under:

- `src/lib/control-room/data/*`
- `src/features/control-room/inventory/data/*`

That work remains Phase 12 groundwork only.

## Structural fixes applied

The Supabase helper files were normalized from root-level `src/lib/client.ts`, `src/lib/server.ts` and `src/lib/middleware.ts` into the dedicated Phase 9 destination:

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/proxy.ts`
- `src/lib/supabase/env.ts`
- `src/lib/supabase/types.ts`

The old root-level files now re-export from the new destination so any existing import does not break while future code moves to the clearer path.

Phase 9 also introduced the pure authorization contract:

- `src/lib/auth/roles.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/auth/guards.ts`
- `src/lib/auth/auth-errors.ts`

Biome is now the repository quality baseline:

- `biome.json`
- `package.json` scripts for `lint`, `format`, `check`, `typecheck`, `test` and `verify`
- deleted legacy `eslint.config.mjs`
- removed ESLint and Prettier package dependencies from the lockfile

The paused repository provider was moved from the shared domain layer into the feature layer:

- `src/features/control-room/data/control-room-repository-context.tsx`

That keeps `src/lib/control-room/data/*` focused on repository contracts and deterministic adapters rather than Client Component context wiring.

Asset readiness now has explicit boundaries:

- Cloudinary and Cloudflare R2 are recognized asset providers.
- Next image remote patterns allow Google Drive prototype imagery, Cloudinary, Cloudflare Images and Cloudflare R2 public hosts.
- Supabase will store asset metadata and ownership in Phase 11; upload/signing routes remain out of Phase 9.
- Server-only asset provider configuration lives under `src/server/assets/*`.

Structural tests now include a server/client import guard:

- `src/lib/boundaries/server-client-boundary.test.ts`

## Intentional deferrals

Phase 9 does not add:

- root `src/proxy.ts`
- sign-in or sign-out routes
- Google OAuth callback routes
- protected route redirects
- Supabase migrations
- RLS policies
- storage buckets
- TanStack Query package installation or provider wiring
- Cloudinary upload signatures or Cloudflare R2 write flows

Those remain Phase 10, Phase 11 and Phase 12 responsibilities.

## Phase 10 handoff

Phase 10 should activate the Supabase session refresh path with a Next.js `proxy.ts`, add auth routes, connect Google OAuth and bind route/action guards to real Supabase profile and membership records.

Authorization must continue to treat Supabase Auth as identity only. Store-scoped roles and permissions belong in application tables and server-side checks.

## Verification

Completed:

- C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD lint - passed with Biome; 49 warnings remain visible for follow-up accessibility/static-skeleton cleanup.
- C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD exec tsc --noEmit
- C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD exec vitest run --passWithNoTests - 31 files and 127 tests passed.
- C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD build - Next.js 16.2.10 production build passed.
- Earlier pre-Biome changed-scope ESLint and direct Node TypeScript/Vitest checks also passed before the tooling migration.

Blocked or incomplete:

- Legacy ESLint has been replaced by Biome. The current gate uses pnpm lint as biome check .
- npx.cmd --yes react-doctor@latest . --verbose --diff timed out after 240 seconds and left orphaned processes that were stopped.
- Browser/visual validation was not rerun for Phase 9 because the implementation is structural/tooling/backend-readiness focused; prior unaccepted UI phase browser gates remain unresolved.

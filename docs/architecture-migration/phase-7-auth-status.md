# Phase 7 — Authentication Consolidation Status

**Status:** Restarted from `main`; design spec authored, implementation not started
**Branch:** `refactor/phase-7-auth-consolidation-v2`
**Base:** `main` at `dfa547602214f5a11e4a17d67bdb6d75b5f277ed`
**Scope:** Authentication ownership only
**Controlling design:** `docs/superpowers/specs/2026-07-27-phase-7-auth-consolidation-design.md`

## Objective

Create one clear authentication domain under `src/modules/auth/**` while preserving every
existing browser route, redirect, cookie, form, role check, and storefront/admin presentation.

## Why this document was reset

Two prior attempts at this phase were abandoned without landing any code and are superseded by
this restart:

- **[PR #50](https://github.com/relvorlabs/laitstyles/pull/50)** (`refactor/phase-7-auth-implementation`
  → `main`) — closed. Its entire diff was one file (this status document, a "ledger activation"
  commit) and its base predated 19 commits now on `main`, including the provider-centralization
  refactor (root `SessionProvider`, unified `QueryClient`, the Suspense/Cache-Components fix in
  `src/app/layout.tsx`) that already touched the edge of this phase's scope. No auth code moved.
- **`refactor/phase-7-auth-consolidation`** (remote branch) — same situation: no commits ahead of
  its own stale base that touch `src/modules/auth/**`, `src/server/auth/**`, or `src/lib/auth/**`.

Verified directly against the `main` tree before this restart: `src/modules/auth/` contains only a
placeholder `README.md` describing an *intended* structure (`server/session.ts`,
`server/authenticate.ts`, `server/account-provisioning.ts`, `server/permissions.ts`,
`server/redirects.ts`, `server/diagnostics.ts`, `schema.ts`, `types.ts`, `ui/*.tsx`) — **none of
those files exist yet**. All real auth code remains exactly where it was before Phase 7 started:
`src/app/auth/**`, `src/server/auth/{session,profile}.ts`, `src/lib/auth/**`.

**Known local state not part of this restart:** a separate git worktree at
`.worktrees/phase-7-auth-consolidation` (branch `codex/phase-7-auth-consolidation`) has ~65
uncommitted working-tree edits (touching `src/app/layout.tsx`, `src/providers/providers.tsx`,
`src/server/auth/session.ts`, `storefront-auth-provider.tsx`, and deleting several Phase 1-6
test-scaffolding files). That branch's own committed history is fully contained in `main` — the
edits are uncommitted local work only, not merged or pushed. This restart does not touch, adopt,
or discard that worktree; it is left for its owner to reconcile or discard separately.

## Inherited baseline

Phase 5–6 source architecture is on `main` (merged through PR #46), plus the subsequent
provider-centralization change (`docs/superpowers/specs/2026-07-27-provider-centralization-design.md`,
`dfa5476` and its ancestors). Inherited source decisions include:

- Products catalogue and PDP ownership under `src/modules/products/**`;
- account-order ownership under `src/modules/orders/**`;
- review ownership under `src/modules/reviews/**`;
- storefront runtime and shell ownership under `src/modules/storefront-shell/**`;
- browser Products reads through `GET /api/v1/products`;
- direct domain reads from Server Components;
- one shared root `SessionProvider`/`AppProvider`/`QueryClientProvider` tree (provider-centralization),
  with `getCurrentSession()` wrapped in React `cache()` and resolved behind a root `<Suspense>`
  boundary (`SessionSlot` in `src/app/layout.tsx`) for Cache Components compatibility;
- principle-based architecture and module-export guards, including a machine-readable legacy
  exception registry (`scripts/checks/architecture-legacy-exceptions.mjs`,
  `docs/architecture-migration/phase-1-legacy-exceptions.md`) that names every current auth
  compatibility edge Phase 7 owns removing.

No Biome, TypeScript, architecture-guard, Prisma-validate, Vitest, build, React Doctor, or
Playwright pass is claimed for this restart. Validation runs and is recorded per
`.agents/doctrine/validation-and-reporting.md` as implementation proceeds.

## Phase 7-owned compatibility edges (current, machine-verified)

Per `scripts/checks/architecture-legacy-exceptions.mjs` on the `main` tree used as this restart's
base, and mirrored in `docs/architecture-migration/phase-1-legacy-exceptions.md`:

- 24 importers of `@/server/auth/session` (`phase7SessionImporters`);
- 2 importers of `@/server/auth/profile` (`phase7ProfileImporters`);
- 3 importers of `@/features/storefront/shared/storefront-auth-provider` (`phase7StorefrontAuthProviderImporters`);
- 1 composition edge, `src/app/storefront-client-boundary.tsx` → `.../storefront-auth-dialog-host` (`phase7StorefrontAuthCompositionEdges`);
- 1 type-only shim, `src/features/storefront/shared/catalogue-data.ts`, consumed only by
  `storefront-auth-dialog.tsx` for the `Product` type (`legacyProductTypeOnlyEdge`).

Full current-state detail (exact exports, imports, and consumer lists for every one of these) is
in the design spec's "Current-state inventory" section — this status document does not duplicate
it and must not drift from it as files move.

The `src/features/storefront/shared/storefront-runtime.ts` checkout edge remains Phase 8-owned and
is not in scope here.

## Target ownership

```text
src/modules/auth/
├── schema.ts
├── types.ts
├── server/
│   ├── session.ts
│   ├── authenticate.ts
│   ├── account-provisioning.ts
│   ├── permissions.ts
│   ├── redirects.ts
│   └── diagnostics.ts
└── ui/
    ├── sign-in-form.tsx
    ├── sign-up-form.tsx
    └── auth-dialog.tsx
```

`src/app/auth/actions.ts` may remain only as a thin Next.js adapter. Browser redirect routes
remain under `/auth/**` and must call module-owned operations rather than duplicating auth rules.

## Locked boundaries

Phase 7 may:

- move session resolution, account provisioning, permission/redirect/diagnostic orchestration into
  `src/modules/auth/**`;
- thin `src/app/auth/actions.ts` and the `/auth/**` route handlers into transport adapters;
- migrate auth UI into module-owned presentation without visual change;
- delete the Phase 7-owned `catalogue-data.ts` compatibility edge after consumer cutover;
- remove the 30 legacy exception edges above from `architecture-legacy-exceptions.mjs` and
  `phase-1-legacy-exceptions.md` as each is retired, one commit per edge-removal batch.

Phase 7 must not:

- implement checkout or payment settlement, or touch the Phase 8 `storefront-runtime.ts` edge;
- rewrite cart, saved-item, or catalogue state;
- perform broad Phase 9 deletion outside auth-owned paths;
- change existing auth URLs, redesign auth forms/dialogs, or weaken POST-only sign-out;
- move Prisma or Supabase clients into browser modules;
- re-open the provider-centralization override — `SessionProvider`/`SessionSlot`/`AppProvider`
  wiring and the root Suspense boundary landed already and are only consumed, not reshaped, by
  this phase.

## Task ledger

- [ ] P7-T01 confirm the complete auth ownership/import map on this exact branch (superseded by
      the design spec's current-state inventory — re-verify at implementation start in case of
      drift);
- [x] P7-T02 create `src/modules/auth` runtime contracts (`schema.ts`, `types.ts`);
- [ ] P7-T03 move session resolution;
- [ ] P7-T04 move account provisioning;
- [ ] P7-T05 move permission orchestration;
- [ ] P7-T06 move redirect helpers;
- [ ] P7-T07 move diagnostics;
- [ ] P7-T08 reduce `src/app/auth/actions.ts` to thin adapters;
- [ ] P7-T09 preserve OAuth browser routes under `/auth/**`;
- [ ] P7-T10 move storefront auth presentation into `src/modules/auth/ui/**` without visual change;
- [ ] P7-T11 delete the Auth-owned `features/storefront/shared/catalogue-data.ts` compatibility edge;
- [ ] P7-T12 remove all 30 legacy exception edges from `architecture-legacy-exceptions.mjs` and
      `phase-1-legacy-exceptions.md` after cutover;
- [ ] P7-T13 preserve all existing auth URLs and visual contracts;
- [ ] P7-T14 run focused auth unit, integration, and Playwright/e2e (`tests/e2e/auth-flows.spec.ts`)
      validation;
- [ ] P7-T15 reconcile documentation and merge evidence on the exact final head.

## P7-T02 evidence (2026-07-27)

`src/modules/auth/schema.ts` and `src/modules/auth/types.ts` created as temporary re-exports
(`schema.ts` from `@/lib/auth/auth-schemas`; `types.ts` from `@/lib/auth/roles` only — the
`roles`-based portion of the target `types.ts`). Session types (`CurrentSession`,
`ConsumerSession`, `StaffSession`, `StaffAccess`, `VerifiedIdentity`) are deliberately deferred to
P7-T03: re-exporting them now from the still-legacy `@/server/auth/session` was tried and
correctly rejected by the architecture guard as an undocumented compatibility edge; re-exporting
them once `session.ts` itself relocates to `@/modules/auth/server/session` avoids ever registering
a short-lived exception for it.

Executed on this commit:

- `pnpm typecheck` — 0 errors.
- `pnpm check:architecture` — 0 errors, 0 warnings across all five guards.
- `pnpm exec biome check` (scoped to the two new files) — 0 errors after applying Biome's own safe
  auto-fixes (export ordering, line endings).

Not yet run: `pnpm test`, `pnpm build`, `pnpm react-doctor`, browser/Playwright — deferred until a
task actually changes runtime behaviour or a consumer import (T02 adds unconsumed contract files
only; nothing yet imports `modules/auth/schema.ts` or `modules/auth/types.ts`).

## Acceptance gate

Phase 7 is complete only when all of the following are proven, with executed evidence recorded
per `.agents/doctrine/validation-and-reporting.md`:

- password sign-in works;
- sign-up works;
- Google OAuth initiation and callback work;
- password reset works;
- sign-out remains POST-only;
- session cookies and redirects remain correct;
- consumer account provisioning works;
- admin capability checks work;
- auth UI has no intentional visual change;
- `src/app/auth/actions.ts` contains transport concerns rather than reusable business logic;
- no duplicate active auth ownership remains outside `src/modules/auth/**`, except documented thin
  app adapters;
- all 30 Phase 7 legacy exception edges are removed from the machine-readable registry;
- the Phase 7 `catalogue-data.ts` compatibility edge is deleted;
- exact-head auth tests, architecture checks, and browser contracts pass.

## First implementation order

1. Re-verify the auth import map on the exact implementation head (files move fast in this repo;
   do not trust this document or the design spec's inventory past the point new commits land).
2. Establish module-owned types and server contracts without changing behaviour.
3. Move session and provisioning code with temporary compatibility only where strictly necessary.
4. Thin app actions and redirect routes.
5. Move auth presentation without changing JSX, classes, labels, or responsive behaviour.
6. Delete auth-only compatibility paths and their legacy-exception registry entries after consumer
   cutover.
7. Run the complete auth acceptance gate and reconcile the ledger.

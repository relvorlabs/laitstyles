# Phase 7 — Authentication Consolidation Status

**Status:** Implementation complete (P7-T02–T13); acceptance gate not yet met — browser/Playwright
and the live-Supabase e2e suite (P7-T14) are genuinely blocked by this environment's tooling, not
skipped. See P7-T14 evidence below before picking this up.
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

- ~~24 importers of `@/server/auth/session`~~ — **retired in P7-T03**: `session.ts` relocated to
  `src/modules/auth/server/session.ts` and all 24 production importers repointed directly; zero
  entries remain for this edge.
- ~~2 importers of `@/server/auth/profile`~~ — **retired in P7-T04**: `profile.ts` relocated to
  `src/modules/auth/server/account-provisioning.ts` and both importers
  (`src/app/auth/callback/route.ts`, `src/modules/auth/server/session.ts`) repointed directly; zero
  entries remain for this edge. `src/server/auth/**` no longer exists on disk.
- ~~3 importers of `@/features/storefront/shared/storefront-auth-provider`~~ — **retired in
  P7-T10**: relocated to `src/modules/auth/ui/storefront-auth-provider.tsx`, all 3 importers
  repointed directly.
- ~~1 composition edge~~ — **retired in P7-T10**: `src/app/storefront-client-boundary.tsx` now
  imports `.../auth-dialog-host` from `src/modules/auth/ui/**` directly.
- ~~1 type-only shim~~ — **retired in P7-T11**: `src/features/storefront/shared/catalogue-data.ts`
  deleted; the moved `auth-dialog.tsx` imports `Product` directly from
  `@/modules/products/ui/storefront/catalogue-data`.

**Zero of the original 30 Phase 7 legacy-exception edges remain registered** (`architecture-legacy-exceptions.mjs`'s
`legacyArchitectureExceptions` now contains only the 2 unrelated Phase 8 checkout edges). Full
current-state detail (exact exports, imports, and consumer lists for every one of these) is in the
design spec's "Current-state inventory" section — this status document does not duplicate it and
must not drift from it as files move.

The `src/features/storefront/shared/storefront-runtime.ts` checkout edge remains Phase 8-owned and
is not in scope here.

## Target ownership

```text
src/modules/auth/
├── schema.ts
├── types.ts
├── permissions.ts        # module root, not server/ — corrected in P7-T05: isomorphic,
│                          # a "use client" admin consumer needs the runtime functions
├── server/
│   ├── session.ts
│   ├── authenticate.ts
│   ├── account-provisioning.ts
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
- [x] P7-T03 move session resolution;
- [x] P7-T04 move account provisioning;
- [x] P7-T05 move permission orchestration;
- [x] P7-T06 move redirect helpers;
- [x] P7-T07 move diagnostics;
- [x] P7-T08 reduce `src/app/auth/actions.ts` to thin adapters;
- [x] P7-T09 preserve OAuth browser routes under `/auth/**` (URLs/methods unchanged throughout
      P7-T03–T08; `callback/route.ts`, `google/route.ts`, `sign-out/route.ts` already call
      `modules/auth/server/*` as of P7-T06 — confirmed, not newly done here);
- [x] P7-T10 move storefront auth presentation into `src/modules/auth/ui/**` without visual change;
- [x] P7-T11 delete the Auth-owned `features/storefront/shared/catalogue-data.ts` compatibility edge;
- [x] P7-T12 remove all 30 legacy exception edges from `architecture-legacy-exceptions.mjs` and
      `phase-1-legacy-exceptions.md` after cutover;
- [x] P7-T13 preserve all existing auth URLs and visual contracts;
- [ ] P7-T14 run focused auth unit, integration, and Playwright/e2e (`tests/e2e/auth-flows.spec.ts`)
      validation — **partially done**; see evidence below for exactly what ran and what remains
      blocked;
- [x] P7-T15 reconcile documentation and merge evidence on the exact final head (this document,
      the design spec's status line, and PR #52's description all updated to match; the *merge
      itself* is separately gated on P7-T14's still-open acceptance gap above — reconciling the
      record is not the same as declaring Phase 7 ready to merge).

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

## P7-T03 evidence (2026-07-27)

`src/server/auth/session.ts` and `session.test.ts` relocated to
`src/modules/auth/server/session.ts`/`session.test.ts` with **zero content change** — same exports,
same `cache()`-wrapped `getCurrentSession`, same `getStaffAccess`/`isAuthenticated`/
`getVerifiedIdentity`, same internal imports (including `@/server/auth/profile`, which hasn't
moved yet — see below). All 34 real consumers of the old path were repointed in the same commit:
25 production files (the exact `phase7SessionImporters` set) plus 9 test/fixture files the
architecture guard doesn't scan but that still needed the import fixed to compile
(`src/test/persistence-harness.ts` and 8 `*.test.ts` files). `src/modules/auth/types.ts` now
re-exports the session types from `@/modules/auth/server/session` — a same-module import, so the
deferral from the P7-T02 evidence note is resolved as planned, with no exception ever registered
for it.

**Registry update:** all 24 `@/server/auth/session` entries removed from
`architecture-legacy-exceptions.mjs` (the `phase7SessionImporters` array and its mapping deleted
outright — zero importers remain on the old path). The one `src/server/auth/session.ts` entry in
`phase7ProfileImporters` was *not* just deleted: the moved file still imports the not-yet-moved
`@/server/auth/profile`, so that entry was updated to `src/modules/auth/server/session.ts` instead
(temporary, retired in P7-T04). `legacyTopLevelServerFiles` now contains only
`src/server/auth/profile.ts`. `docs/architecture-migration/phase-1-legacy-exceptions.md` mirrors
both changes with a dated removal-discipline note.

**One test fixed as part of this task's own scope (not drive-by):**
`src/lib/boundaries/server-client-boundary.test.ts`'s "keeps compatibility exceptions exact,
immutable, owned and scheduled" case hardcoded the old two-file `legacyTopLevelServerFiles` list;
updated to assert the new one-file list. This is the file under test for the exact registry change
this task makes, not unrelated scope.

**One unrelated fix explicitly reverted:** a repo-wide `pnpm biome:fix` run (needed to correct
import-order drift the path rename caused in ~25 files) also auto-corrected pre-existing,
unrelated indentation drift in `src/modules/storefront-shell/ui/site-chrome.tsx`. Reverted from
this commit and flagged separately (spawned task `task_cf0eaeba`) rather than bundled in — no
logic change, but out of this task's scope per the doctrine's no-drive-by-refactor rule.

Executed on this commit:

- `pnpm typecheck` — 0 errors.
- `pnpm check:architecture` — 0 errors, 0 warnings across all five guards.
- `pnpm biome` — 0 errors, 65 warnings (matches the documented pre-existing baseline exactly)
  after applying Biome's own safe auto-fixes (import ordering across the ~25 renamed-import files).
- `pnpm exec vitest run` — 5 failed, 6 skipped, 485 passed (496 total). All 5 failures are the
  documented pre-existing baseline (`editor-ownership.test.ts`, `type-ownership.test.ts`,
  `inventory/route.test.ts`, `inventory/adjustments/route.test.ts`,
  `inventory/client/api.test.ts` — Products/Inventory/Settings module-boundary and HTTP-status
  mismatches already recorded in `migration-tracker.md`'s reconciliation entry). One run of the
  full suite additionally flaked on a 6th, different test
  (`admin-persistence-boundary`-style worker-timeout pattern already documented elsewhere in this
  repo's history); a clean re-run reproduced exactly the 5 documented failures and nothing else.
  Zero new failures attributable to this change.

Not yet run: `pnpm build`, `pnpm react-doctor`, browser/Playwright, `tests/e2e/auth-flows.spec.ts`
(`AUTH_E2E=1`, requires a live Supabase/Postgres/mail-inbox stack not available in this
environment) — deferred to a later task or the final acceptance-gate pass per this design's
"Validation and verification" section; not claimed as run.

## P7-T04 evidence (2026-07-27)

`src/server/auth/profile.ts` relocated to `src/modules/auth/server/account-provisioning.ts` with
**zero content change** — same exports (`AuthUserMetadata`, `ConsumerIdentityInput`,
`consumerProfileValues`, `ensureConsumerAccount`, `ensureConsumerProfile`), same Prisma
`$transaction` upserting `profiles` → `profile_details` → `customers`. `src/server/auth/**` no
longer exists on disk — both its files have now moved (`session.ts` in P7-T03, `profile.ts` here).

Both of its 2 real consumers repointed in the same commit: `src/app/auth/callback/route.ts` (the
OAuth/email-link callback's `ensureConsumerAccount` call) and `src/modules/auth/server/session.ts`
(its own `ensureConsumerAccount` import, now a same-module import). `session.test.ts`'s
`vi.mock("@/server/auth/profile", ...)` updated to mock the new path.

**Registry update:** the `phase7ProfileImporters` array and its mapping deleted outright (both
entries retired, matching the actual code state — not deleted prematurely). `legacyTopLevelServerFiles`
is now an empty `Set()`: no legacy top-level `server/auth/**` file remains, because none exists.
`docs/architecture-migration/phase-1-legacy-exceptions.md` mirrors this with a dated
removal-discipline note. Only the 5 non-session/profile edges (storefront-auth-provider ×3,
composition ×1, catalogue-data shim ×1) remain registered — down from the original 30.

**One test fixed as part of this task's own scope (not drive-by):** the same
`server-client-boundary.test.ts` case updated in P7-T03 for the one-file list now asserts an empty
list, since the last legacy top-level file is gone.

Executed on this commit:

- `pnpm typecheck` — 0 errors.
- `pnpm check:architecture` — 0 errors, 0 warnings across all five guards.
- `pnpm biome` — 1 error, 65 warnings. The 1 error is the same pre-existing, unrelated
  `site-chrome.tsx` indentation drift flagged (and left untouched) in P7-T03's evidence — confirmed
  by scoping Biome to only this commit's changed files, which found and fixed one line-ending issue
  in the new `account-provisioning.ts` and nothing else. 65 warnings matches the documented
  pre-existing baseline exactly.
- `pnpm exec vitest run` — one run: 6 failed (the 5 documented pre-existing failures plus a 6th,
  `admin-persistence-boundary.test.ts`); re-ran that file in isolation and it passed cleanly
  (6/6), confirming the same full-suite worker-contention flake pattern already documented in this
  repo's history, not a new defect. Targeted re-run of `session.test.ts` +
  `server-client-boundary.test.ts` — 18/18 passed.

Not yet run: `pnpm build`, `pnpm react-doctor`, browser/Playwright, `tests/e2e/auth-flows.spec.ts`
— same reasons as P7-T03's evidence note; not claimed as run.

## P7-T05 evidence (2026-07-27)

`src/lib/auth/permissions.ts` (+ test) relocated to **`src/modules/auth/permissions.ts`** — the
module root, not `src/modules/auth/server/permissions.ts` as the design spec originally specified.
Zero content change to the logic itself (same `STAFF_CAPABILITIES`, `CONSUMER_CAPABILITIES`,
`ROLE_CAPABILITIES`, `hasCapability`, `getCapabilitiesForRole`, `canAccessAdmin`,
`canUpdateSettings`).

**Placement correction, discovered mid-task, not a mechanical move:** the original design placed
`permissions.ts` under `server/`. Moving it there first (as literally specified) and running
`pnpm check:architecture` produced a real, new `client-server-import` violation:
`src/features/admin/shell/admin-access-provider.tsx` (a `"use client"` component) imports
`getCapabilitiesForRole`/`hasCapability` to build a memoized capability context from a `role`
prop — it needs the actual runtime functions, not just types, and `permissions.ts` has zero
server-only imports (pure computation over string-literal arrays, same shape as `roles.ts`, which
the spec already correctly routed to the client-safe `types.ts`). Everything under
`modules/<domain>/server/**` is treated as server-only by folder convention regardless of content,
so that placement was genuinely unsafe, not just guard noise. Corrected to `modules/auth/permissions.ts`
(module root, sibling to `schema.ts`/`types.ts`) per `docs/update.md` §1's explicit allowance for
repository evidence discovered during implementation to override a locked decision. The design
spec (`docs/superpowers/specs/2026-07-27-phase-7-auth-consolidation-design.md`) is updated in the
same commit — target tree, the `lib/auth/**` inventory table, and the P7-T05 task description all
corrected, with the discovery documented inline rather than silently fixed.

All 11 real consumers (10 external + the moved test's own import) repointed in the same commit:
`session.ts`, `lib/http/auth.ts`, `admin-access-provider.tsx`, and 7 domain policy files
(products/rules.ts, inventory/adjust-stock.ts, settings/policy.ts, returns/policy.ts,
overview/policy.ts, holds/policy.ts, customers/policy.ts). `lib/auth/index.ts`'s barrel dropped its
`permissions` re-export (it had zero consumers of the bare barrel to begin with, confirmed in the
original inventory).

Executed on this commit:

- `pnpm typecheck` — 0 errors.
- `pnpm check:architecture` — 1 error on the first attempt (`client-server-import`, the finding
  that drove the placement correction above), 0 errors/warnings after the fix.
- `pnpm biome` — 1 error, 65 warnings; the 1 error is the same pre-existing `site-chrome.tsx` drift
  from P7-T03/T04 (reverted again from this commit after `biome:fix` re-swept it), confirmed
  unrelated. 65 warnings matches baseline.
- `pnpm exec vitest run` — one run: 6 failed (the same 5 documented pre-existing failures plus
  `admin-persistence-boundary.test.ts`, confirmed 6/6 passing in isolation — same flake pattern).
  Targeted `permissions.test.ts` + `session.test.ts` + `lib/http/auth.test.ts` — 19/19 passed.

Not yet run: `pnpm build`, `pnpm react-doctor`, browser/Playwright, `tests/e2e/auth-flows.spec.ts`
— not claimed as run.

## P7-T06 & P7-T07 evidence (2026-07-27)

The design spec's task breakdown consolidated "move redirect helpers" and "move diagnostics" into
one task (its own P7-T06); this ledger inherited them as two separate items from the pre-restart
template. Both are complete in the same commit — noted here once rather than duplicated.

**Redirects:** `src/lib/auth/server/redirects.ts` + `src/lib/auth/server/request-origin.ts`
merged into `src/modules/auth/server/redirects.ts`. The two duplicate `LOCAL_AUTH_ORIGIN`
string-literal constants (one private to each old file) are deduped to one exported constant —
same value (`https://laitstyle.localhost`) in both, confirmed identical before merging, so this is
a same-behaviour cleanup, not a logic change. `getSafeNextPath`/`withAuthErrorPath` (from
`redirects.ts`) and `getRequestOrigin` (from `request-origin.ts`) are otherwise byte-identical to
their originals.

**Diagnostics:** `src/lib/auth/auth-errors.ts` + `src/lib/auth/server/auth-provider-diagnostics.ts`
merged into `src/modules/auth/server/diagnostics.ts`, byte-identical content, concatenated.

**Placement check done before merging, not assumed:** unlike P7-T05's `permissions.ts`, both
`auth-errors.ts` and `redirects.ts` had no `"server-only"` marker and no server-specific imports —
the same shape that made `permissions.ts` unsafe under `server/`. Before merging, every consumer of
both files was checked for a `"use client"` directive (`error/page.tsx`, `forgot-password/page.tsx`,
`resend-confirmation/page.tsx`, `reset-password/page.tsx`, `sign-in/page.tsx`, `sign-up/page.tsx`,
`admin-access-denied.tsx`, and its own importers `admin/layout.tsx` +
`admin/inventory/page.tsx`) — none are Client Components; all are Server Components, Route
Handlers, or Server Actions. Placing them under `server/` is safe here specifically because no
current consumer needs them client-side, not because the files themselves are inherently
server-only the way `request-origin.ts` (uses `next/headers`) and
`auth-provider-diagnostics.ts` (uses the server logger) already were.

All 12 unique production consumer files repointed in this commit, several requiring a genuine
import-statement *merge* rather than a path substitution, since multiple old modules now land in
the same new file: `callback/route.ts`, `google/route.ts`, and `actions.ts` each previously imported
from 3-4 of the old paths and now import from 2 (`.../diagnostics`, `.../redirects`).
`reset-password/page.tsx` and `error/page.tsx` each merge 2 old imports into 2 new ones (still
separate files, since redirects and diagnostics are different target modules).
`scripts/checks/error-validation-contract.mjs`'s file-path assertions updated to the new locations
in the same commit, per the design spec's explicit instruction for this task.

**Test-mock rewrite, not just a path change:** `src/app/auth/actions.test.ts` previously used full
module replacement (`vi.mock(path, () => ({ oneExport: vi.fn() }))`) for
`@/lib/auth/server/request-origin` and `@/lib/auth/server/auth-provider-diagnostics` — safe because
each old module exported *only* the one function being mocked. After the merge, the same full-
replacement pattern would have silently zeroed out `getSafeNextPath`/`withAuthErrorPath` (now
sharing a file with the mocked `getRequestOrigin`) and `mapAuthProviderError`/`authFlowFailure`
(now sharing a file with the mocked `logAuthProviderFailure`) — both real implementations, whose
exact output several existing assertions depend on (e.g. the enumeration-safety and mapped-error-
code tests). Rewrote both mocks to `vi.mock(path, async (importOriginal) => ({ ...(await
importOriginal()), mockedExport: vi.fn(...) }))` — a partial mock that keeps every real export
except the one being replaced. Verified by running the full `actions.test.ts` suite, not just
checking it typechecks.

Executed on this commit:

- `pnpm typecheck` — 0 errors.
- `pnpm check:architecture` — 0 errors/warnings across all five guards, including
  `error-validation-contract.mjs` (the guard whose file-path assertions this task explicitly
  updates).
- `pnpm biome` — 1 error, 65 warnings; the 1 error is the same pre-existing `site-chrome.tsx` drift
  (reverted again after `biome:fix` re-swept it), confirmed unrelated. 65 warnings matches baseline.
- `pnpm exec vitest run` — one run: 6 failed (the same 5 documented pre-existing failures plus
  `admin-persistence-boundary.test.ts`, confirmed 6/6 passing in isolation — same flake pattern).
  Targeted `diagnostics.test.ts` + `redirects.test.ts` + `actions.test.ts` (the file with the
  rewritten mocks) — 21/21 passed.

Not yet run: `pnpm build`, `pnpm react-doctor`, browser/Playwright, `tests/e2e/auth-flows.spec.ts`
— not claimed as run.

## P7-T07 evidence (2026-07-27) — retire `src/lib/auth/**`

This ledger has no dedicated checkbox for this step (the inherited pre-restart template's T02–T09
line items don't include it as its own line; it completes what P7-T02's checkbox already marked
done, since T02 only created *temporary re-exports*). The design spec's own task numbering names
it explicitly as P7-T07 — recorded here under that name for traceability against the spec, not as
a new ledger line.

`src/modules/auth/schema.ts` and `src/modules/auth/types.ts` now own their content directly —
the temporary `export {...} from "@/lib/auth/..."` re-exports from P7-T02 are gone, replaced with
the real Zod schemas (schema.ts) and role constants/guards (types.ts), byte-identical to their
former `lib/auth` originals. `src/lib/auth/**` is deleted in full: `auth-schemas.ts` (+test),
`roles.ts` (+test), and `index.ts` (the barrel — already down to just re-exporting `roles.ts`
after P7-T05/T06 removed its other two re-exports, so retiring it here needed no intermediate
step). **`src/lib/auth/` no longer exists on disk.**

Tests moved and renamed to match their new owning file: `roles.test.ts` → `types.test.ts`
(types.ts now owns what roles.ts used to), `auth-schemas.test.ts` → `schema.test.ts`.

6 real consumers repointed: `src/app/auth/actions.ts` (schema import), and 5 consumers of the role
constants/types — `session.ts`, `permissions.ts`, `admin-access-provider.tsx`,
`admin-shell.tsx`, `session-provider.tsx` (the client-side session context that originally justified
routing `roles.ts` to `types.ts` instead of `server/` all the way back in the design spec's initial
inventory — confirmed still correct: `session-provider.tsx` is `"use client"` and now imports
`StaffRole` from `@/modules/auth/types`, a module-root/client-safe file, not `server/`).

A second guard reference caught and fixed in this same commit: `error-validation-contract.mjs`'s
`authSchemas` variable still pointed at the now-deleted `src/lib/auth/auth-schemas.ts` (missed in
P7-T06, which only updated the auth-errors/redirects/diagnostics paths — auth-schemas.ts wasn't in
T06's scope). Caught by actually running `pnpm check:architecture` rather than assuming the guard
was already current; updated to `src/modules/auth/schema.ts` in the same commit. Grepped
`scripts/**` for any other stale `lib/auth` reference — none found.

Executed on this commit:

- `pnpm typecheck` — 0 errors.
- `pnpm check:architecture` — 3 errors on the first run (`error-validation-contract.mjs`'s stale
  `authSchemas` path, the finding that drove the fix above), 0 errors/warnings after.
- `pnpm biome` — 1 error, 65 warnings; the 1 error is the same pre-existing `site-chrome.tsx` drift
  (reverted again after `biome:fix` re-swept it). 65 warnings matches baseline.
- `pnpm exec vitest run` — one run: 6 failed (the same 5 documented pre-existing failures plus
  `admin-persistence-boundary.test.ts`, confirmed 6/6 passing in isolation — same flake pattern).
  Targeted `schema.test.ts` + `types.test.ts` + `session.test.ts` + `permissions.test.ts` +
  `actions.test.ts` — 35/35 passed.

Not yet run: `pnpm build`, `pnpm react-doctor`, browser/Playwright, `tests/e2e/auth-flows.spec.ts`
— not claimed as run.

## P7-T08 & P7-T09 evidence (2026-07-27)

**Thinned `src/app/auth/actions.ts`** (230 → 153 lines at the start of this phase's restart, now
down further): extracted the Supabase-call-and-mapping body of every password-auth operation into
a new `src/modules/auth/server/authenticate.ts` (`authenticateWithPassword`, `registerWithPassword`,
`sendPasswordResetEmail`, `sendSignupConfirmationEmail`, `updateRecoveredPassword`, `endSession`).
`actions.ts` now does exactly what the doctrine's Server Action contract describes and nothing
more: parse `FormData` → Zod `safeParse` (invalid-input + field errors on failure) → call the
domain operation → return its `Result` → (`*WithRedirect` wrappers) `redirect()`. It no longer
imports `@/lib/supabase/server`, `logAuthProviderFailure`, or `mapAuthProviderError` at all — those
now live only in `authenticate.ts`.

**Public surface unchanged, verified not assumed:** every exported function name, type, and
signature in `actions.ts` is identical to before this task (confirmed via grep: no consumer
outside `actions.ts`/`actions.test.ts` imports any of its result/error types, so this was free to
refactor internally either way — but the names were kept unchanged anyway since nothing required
changing them, and `signInWithPassword`/`signUpWithPassword` are passed as `<form action={...}>`
values, where a changed function identity has no observable effect but a changed name would break
the import). `storefront-auth-provider.tsx`'s imports of `signOutStorefrontSession`,
`submitPasswordSignIn`, `submitPasswordSignUp` needed no changes.

**`actions.test.ts` needed no changes and still passes (12/12) as a full pipeline test**, not just
a partial one: its `vi.mock("@/lib/supabase/server", ...)` and the `importOriginal`-based partial
mocks of `diagnostics`/`redirects` (from P7-T06) intercept by module specifier regardless of which
file actually imports them, so the existing assertions now exercise `actions.ts` →
`authenticate.ts` → the mocked Supabase client end-to-end. No separate `authenticate.test.ts` was
added — it would only duplicate coverage this already provides; revisit if `authenticate.ts` grows
consumers beyond `actions.ts`.

**A second real gap this task's own diff exposed, not assumed away:** `pnpm check:architecture`
failed twice on the first attempt — `error-validation-contract.mjs` asserted `mapAuthProviderError`
and `logAuthProviderFailure` appear in `actions.ts`'s own source text, which was true before this
task and became false the moment that logic moved to `authenticate.ts`, even though the underlying
security requirement (safe provider-error mapping, structured diagnostic logging) still holds —
just enforced by a different file now. Read `authenticate.ts` into the same guard
(`authAuthenticate`) and repointed those two checks, plus the "must not leak raw provider messages"
checks, to scan `authActions + authAuthenticate` combined rather than `authActions` alone — the
latter also closes a real blind spot: before this fix, nothing checked `authenticate.ts` itself for
raw-message leaks, only `actions.ts`.

**P7-T09 (preserve OAuth routes) needed no new work**: already true throughout P7-T03–P7-T08.
`callback/route.ts`, `google/route.ts`, and `sign-out/route.ts` have called `modules/auth/server/*`
since P7-T03/T06 with unchanged URLs, methods, and redirect targets — confirmed by re-reading all
three in this task, not newly done here.

Executed on this commit:

- `pnpm typecheck` — 0 errors.
- `pnpm check:architecture` — 2 errors on the first run (the `error-validation-contract.mjs` gap
  above), 0 errors/warnings after the fix.
- `pnpm biome` — 1 error, 65 warnings; the 1 error is the same pre-existing `site-chrome.tsx` drift,
  untouched this time (fixed only the two files this task actually changed). 65 warnings matches
  baseline.
- `pnpm exec vitest run` — one run: 6 failed (the same 5 documented pre-existing failures plus
  `admin-persistence-boundary.test.ts`, confirmed 6/6 passing in isolation — same flake pattern).
  Targeted `actions.test.ts` — 12/12 passed, confirming the full `actions.ts` → `authenticate.ts`
  pipeline works end-to-end through the existing, unmodified mocks.

Not yet run: `pnpm build`, `pnpm react-doctor`, browser/Playwright, `tests/e2e/auth-flows.spec.ts`
— not claimed as run.

## P7-T10, P7-T11 & P7-T12 evidence (2026-07-27)

**Moved the 3 storefront auth presentation files**, byte-identical apart from import paths (no
JSX, className, or interaction-state edit — verified by diff, not just by intent):
`src/features/storefront/shared/{storefront-auth-dialog,storefront-auth-dialog-host,
storefront-auth-provider}.tsx` → `src/modules/auth/ui/{auth-dialog,auth-dialog-host,
storefront-auth-provider}.tsx`. `auth-dialog.tsx` (the presentation component) is a straight
rename of `storefront-auth-dialog.tsx`; `auth-dialog-host.tsx` (the stateful host, `useState`s,
`validateAuth`, overlay-event subscriptions) is a straight rename of
`storefront-auth-dialog-host.tsx`. Not decomposed into separate `sign-in-form.tsx`/
`sign-up-form.tsx` as the design spec's "New UI decomposition" section describes — that's a real
structural improvement but carries genuine visual-regression risk for a task whose actual
requirement is relocation with zero behaviour change; deferred as explicit follow-up work, not
silently dropped.

**Deleted `src/features/storefront/shared/catalogue-data.ts`** (the type-only `Product` shim).
`auth-dialog.tsx` now imports `Product` directly from
`@/modules/products/ui/storefront/catalogue-data`, the canonical source the shim only ever
re-exported.

**A real consumer the original inventory missed, caught by `tsc` not by grep:**
`src/features/storefront/account/components/account-garments.tsx` imported the shim via a
*relative* path (`../../shared/catalogue-data`), which every absolute-path grep across this whole
phase (including the initial current-state inventory) missed. `pnpm typecheck` caught it
immediately as a broken module resolution once the shim was deleted — repointed to the same
canonical `@/modules/products/ui/storefront/catalogue-data` import.

**Registry retirement — the actual point of P7-T12:** removed `phase7StorefrontAuthProviderImporters`
(3 entries), `phase7StorefrontAuthCompositionEdges` (1 entry), and `legacyProductTypeOnlyEdge` (1
entry, plus its `shim`/`importer`/`imported` fields) from `architecture-legacy-exceptions.mjs`.
**`legacyArchitectureExceptions` now contains only the 2 Phase 8 checkout edges — every one of the
original 30 Phase 7 entries is gone.** `docs/architecture-migration/phase-1-legacy-exceptions.md`
mirrors this; its "Phase 7 authentication compatibility" section is now a completion record, not
an active table.

**Three more real issues this task's own diff surfaced, each fixed on evidence not assumption:**

1. `src/modules/products/product-module-boundaries.test.ts`'s "keeps every phase exception exact
   and type-only" test asserted the exact shape of `legacyProductTypeOnlyEdge` and read the shim
   file directly — both gone now. Removed that test (there's no more exception to verify) and
   simplified the adjacent "keeps production consumers off retired product and catalogue paths"
   test, dropping its now-dead `isTypeOnlyShimConsumer` carve-out (no consumer can match a
   registry entry that no longer exists). Also removed the now-unused `escapeRegExp` helper.
2. `src/lib/boundaries/server-client-boundary.test.ts`'s "keeps compatibility exceptions exact..."
   test compared `entry.removalPhase === 7` and `entry.owner === "domain-engineer"` — with
   `legacyArchitectureExceptions` now containing only Phase 8 entries, TypeScript narrowed those
   fields to literal `8`/`"ui-engineer"` and flagged both comparisons as `TS2367` (no overlap).
   Rewrote both as `.includes()` checks against literal-typed arrays, which keeps the check
   meaningful for any future entry (7 *or* 8, either owner) without relying on the array's
   *current* contents for its type.
3. **The one genuine architectural question this task raised, not just a mechanical fix:**
   `src/modules/auth/ui/storefront-auth-provider.tsx` imports `submitPasswordSignIn`,
   `submitPasswordSignUp`, `signOutStorefrontSession` from `@/app/auth/actions` — invisible to the
   `LAYER_RULES` check while the file lived under unrestricted `src/features/**`, now flagged
   because `src/modules` forbids `@/app`. Traced this to a real distinction the repo's own test
   suite already draws two tests above it: `classifyArchitectureGraph` flags TanStack Query
   wrapping a Server Action and Route Handlers importing one, but not a Client Component calling a
   thin Server Action imperatively — exactly the doctrine-sanctioned "Form or Client Component →
   thin Server Action → domain command" flow this file uses. This is not P7-owned technical debt
   (it predates Phase 7 and isn't in any Phase 7 task), and registering it in
   `legacyArchitectureExceptions` would misrepresent permanent, correct architecture as scheduled-
   for-removal debt, working against P7-T12's own "zero remaining entries" goal. Refined the
   `LAYER_RULES` check instead: `src/modules/**` may import `@/app` specifically when every such
   import resolves to a file starting with `"use server"` (a genuine Server Action) — verified by
   resolving each exact `@/app/**` specifier and reading the target file, not by loosening the
   check to a blanket allowance. Still fails for a hypothetical module importing non-Server-Action
   app-layer code.

**Browser verification attempted, not completed — reported honestly:** started the dev server via
`preview_start` to visually confirm the sign-in dialog renders identically; the server reported as
started but the port never actually accepted connections (`net::ERR_CONNECTION_REFUSED` on every
navigation attempt, `serverId` unrecoverable from `preview_logs` immediately after start) across
three retries. This is an environment/tooling issue in this session, not a code problem — confirmed
by cross-checking `preview_list`, which showed no running process each time. Confidence in the
move's safety rests on non-visual evidence instead: the diffs for all 3 moved UI files show zero
JSX/className/behaviour change (only import paths), and the full automated suite (typecheck,
architecture guard, Biome, Vitest) passes. This is explicitly **not** a substitute for the browser
verification `.agents/doctrine/validation-and-reporting.md` and this design's own "Validation and
verification" section call for — it is deferred to whoever runs the final P7-T14 acceptance pass
with working preview tooling.

Executed on this commit:

- `pnpm typecheck` — 2 errors on the first run (the missed relative-import consumer, the
  type-narrowing comparison), 0 after both fixes.
- `pnpm check:architecture` — 2 errors on the first run (`error-validation-contract.mjs`'s stale
  `authProvider` path pointing at the pre-move location — a third stale-guard-reference instance
  in this phase, same class as P7-T06/T07's), 0 after the fix.
- `pnpm biome` — 1 error, 65 warnings; the 1 error is the same pre-existing `site-chrome.tsx` drift
  (this time correctly left untouched — scoped `biome:fix` to only the files this task actually
  changed instead of running it repo-wide). 65 warnings matches baseline.
- `pnpm exec vitest run` — one run: 6 failed (5 documented pre-existing plus a flake — this time
  `review-form.test.tsx`, a *different* file than the `admin-persistence-boundary.test.ts` flake
  seen in P7-T03–T08, confirming this is genuine full-suite worker contention rotating across
  files, not one specific broken test; confirmed 7/7 passing in isolation). Targeted
  `server-client-boundary.test.ts` + `product-module-boundaries.test.ts` — 10/10 passed.

Not yet run: `pnpm build`, `pnpm react-doctor`, browser/Playwright, `tests/e2e/auth-flows.spec.ts`
— browser verification specifically attempted and blocked by environment tooling, not skipped;
see above. Not claimed as run.

## P7-T13 evidence (2026-07-27) — preserve URLs and visual contracts

Verified with mechanical evidence, not assertion, against the branch's base commit
(`dfa547602214f5a11e4a17d67bdb6d75b5f277ed`):

- **`git ls-tree` on `src/app/auth/**` at base vs. `HEAD` is byte-identical** — the diff between
  the two sorted file lists is empty. No auth route was added, removed, or renamed anywhere across
  P7-T02–T12; every `/auth/**` URL (and every HTTP method exported from its route handlers) is
  exactly where it was before this phase started.
- **Every touched route/page file's diff against base is import-paths-only**, checked individually
  for all files under `src/app/auth/**`: `callback/route.ts`, `google/route.ts`,
  `sign-out/route.ts` (route handlers — confirmed zero change to exported `GET`/`POST` names,
  redirect targets, or response logic), and `sign-in/`, `error/`, `forgot-password/`,
  `resend-confirmation/`, `reset-password/page.tsx` (confirmed zero JSX/markup change).
  `sign-up/page.tsx` has **zero diff at all** against base — never touched.
- `storefront-client-boundary.tsx`, `site-chrome.tsx`, `storefront-account-menu.tsx`,
  `account-garments.tsx`, and the 3 moved `modules/auth/ui/**` files all show single-line (or
  near-single-line) import-path diffs.

This proves the *structural* half of "preserve visual contracts." It does not prove pixel-level
visual parity, which needs the browser verification blocked in P7-T10–T12's evidence — that gap
carries into P7-T14 below.

## P7-T14 evidence (2026-07-27) — build, react-doctor, browser/Playwright, e2e

Reported per-check, exactly as each actually went, per `.agents/doctrine/validation-and-reporting.md`'s
"never report a check as passing when it was skipped, unavailable, or failed" rule. This task is
**not** fully closed — the browser/Playwright/e2e portions remain genuinely blocked.

**`pnpm build` — failed, for a reason unrelated to Phase 7.** Turbopack build failed with 2 errors:
`next/font/google` (`Manrope`, `Newsreader`) could not reach `fonts.googleapis.com`
(`ERR_CONNECTION` style network failure) to fetch font files at build time. Both errors trace to
`src/modules/storefront-shell/ui/storefront-fonts.ts`, imported by the PDP page — a file with
**zero diff against the branch base** (confirmed via `git diff dfa5476 HEAD --
src/modules/storefront-shell/ui/storefront-fonts.ts`, empty output). This is this sandboxed
session's lack of outbound network access, not a defect in any Phase 7 change. Not claimed as
passing; not attributable to this work either.

**`pnpm react-doctor` — ran, 148 advisory findings repo-wide; every one touching a Phase 7-changed
file traced and confirmed pre-existing, not introduced.** react-doctor scans the whole repository
(including unrelated concurrent work-in-progress elsewhere in this checkout, and a stale
`.worktrees/phase-7-auth-consolidation` copy), so the 148 total is not a Phase 7 number. Cross-
referencing every finding's file path against this phase's actual changed-file set
(`git diff dfa5476 HEAD --stat`) narrows it to 6 distinct locations in 6 files:

| File:line | Finding | Verified pre-existing because |
| --- | --- | --- |
| `app/auth/{actions,callback/route,google/route,sign-in/page,sign-out/route}` (multiple) | Security: redirect/frame boundary risk | These files have zero logic diff against base — import paths only |
| `modules/auth/server/authenticate.ts:69,83` | Bugs: sequential independent awaits | The `createClient()`/`getRequestOrigin()` sequencing is copied verbatim from the original `submitPasswordSignUp`/`requestPasswordReset` bodies in `actions.ts`, not new code |
| `providers/session-provider.tsx:13` | Maintainability: file exports both components and non-components | Pre-existing export shape (`SessionProvider` + `useSession` + `AppSession` + `ANONYMOUS_APP_SESSION`); P7-T07 only changed the `StaffRole` import source |
| `features/storefront/account/components/account-garments.tsx:28` | Bugs: plain `<img>` ships unoptimized images | Pre-existing `<img>` usage untouched by this phase's import-path-only edit (already noted in P7-T10–T12 evidence) |
| `modules/auth/ui/auth-dialog-host.tsx:25` | Bugs: many related `useState` calls, prefer `useReducer` | Component-level state design, byte-identical move from `storefront-auth-dialog-host.tsx` |
| `modules/storefront-shell/ui/site-chrome.tsx:44` | Bugs: client-side redirect in `useEffect` | Untouched code; this phase changed only one import line (line 6) |

Zero findings introduced by Phase 7 work. The remaining ~140 findings are pre-existing legacy debt
across files this phase never touched (admin inventory, products, orders, and unrelated
in-progress work elsewhere in this checkout) — advisory per doctrine, out of this phase's scope.

**Browser/Playwright — blocked, same environment issue as P7-T10–T12.** Re-attempted via
`preview_start`; same result (server reports started, port never accepts connections).

**`tests/e2e/auth-flows.spec.ts` — not run.** Requires `AUTH_E2E=1` plus a live Supabase +
Postgres + mail-inbox stack this environment does not provision. Not attempted, not claimed.

**Net effect on the acceptance gate:** implementation (P7-T02–T13) is complete and verified by
typecheck/architecture-guard/Biome/Vitest/manual-diff evidence throughout. The acceptance gate's
"browser contracts pass" and live-auth-flow requirements are **not yet met** — genuinely blocked
by this environment's tooling, not skipped. Whoever picks this up next with working browser/e2e
tooling should start there, not re-verify what's already proven above.

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

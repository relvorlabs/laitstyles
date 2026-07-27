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

- ~~24 importers of `@/server/auth/session`~~ — **retired in P7-T03**: `session.ts` relocated to
  `src/modules/auth/server/session.ts` and all 24 production importers repointed directly; zero
  entries remain for this edge.
- ~~2 importers of `@/server/auth/profile`~~ — **retired in P7-T04**: `profile.ts` relocated to
  `src/modules/auth/server/account-provisioning.ts` and both importers
  (`src/app/auth/callback/route.ts`, `src/modules/auth/server/session.ts`) repointed directly; zero
  entries remain for this edge. `src/server/auth/**` no longer exists on disk.
- 3 importers of `@/features/storefront/shared/storefront-auth-provider` (`phase7StorefrontAuthProviderImporters`);
- 1 composition edge, `src/app/storefront-client-boundary.tsx` → `.../storefront-auth-dialog-host` (`phase7StorefrontAuthCompositionEdges`);
- 1 type-only shim, `src/features/storefront/shared/catalogue-data.ts`, consumed only by
  `storefront-auth-dialog.tsx` for the `Product` type (`legacyProductTypeOnlyEdge`).

Only 5 of the original 30 Phase 7 legacy-exception edges remain registered. Full current-state
detail (exact exports, imports, and consumer lists for every one of these) is in the design spec's
"Current-state inventory" section — this status document does not duplicate it and must not drift
from it as files move.

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

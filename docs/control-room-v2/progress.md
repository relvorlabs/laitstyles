# Laitstyle Control Room V2 — Progress Tracker

## Current score

**PR #4 integration verified for merge handoff — Phase 11 remains blocked**

On 2026-07-15 the database and authorization foundation was corrected to a Prisma-only, single-store model with consumer, admin and manager roles. Supabase remains authentication-only. The Prisma baseline is generated but has not been applied to a shared database. Phase 10 browser OAuth and required React Doctor browser evidence remain separate gates.

The paused TanStack Phase 9 repository/key work is now Phase 12 material. No feature read is represented as production-backed until its Prisma repository and authorization boundary are complete.

This does not mark Phase 4, Phase 5, Phase 6, Phase 7 or Phase 8 as accepted. No blocked check, screenshot review or merge condition is represented as passing.

On 2026-07-13, current `main` (`60ee6d199de04b1ebc0edf8da3ee9c6128f0ae20`) was merged into
`feat/control-room-v2` through reviewed conflict resolution. The newer connected storefront from
`main` was retained; the Control Room root theme provider, semantic role tokens and paired dark theme
were preserved. PR #4 is being merged as an integration milestone, then active Control Room work will
continue in a new draft PR branched from the resulting `main`. This handoff does not reclassify any
phase acceptance blocker as passing.

## Current phase

| Field                                          | Value                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Status                                         | Phase 12 foundation started by direct user override; Phase 10 and Phase 11 blockers remain recorded    |
| Active implementation phase                    | Phase 12 - TanStack Query server-state foundation (Phase 11 remains blocked, not accepted)             |
| Compact Inventory gallery head                 | `5398b7449a59bcfbd6d497e5f47208f78abc2f6c`                                                            |
| Paused TanStack repository/key foundation head | `0b266e4faed24fc3ea8bfcbb2d2133bf5a16647f`                                                            |
| Previous Phase 9 documentation head            | `e8e7d94141b0410517bd69746001df6be7388e76`                                                            |
| Branch                                         | `feat/control-room-v2`                                                                                |
| Pull request                                   | `#4` — integration milestone; continuation draft PR follows from merged `main`                       |
| Phase 8 plan                                   | `docs/control-room-v2/phase8-plan.md`                                                                 |
| Phase 8 blocker                                | `docs/control-room-v2/phase8-blocker.md`                                                              |
| Phase 9 plan                                   | `docs/control-room-v2/phase9-plan.md`                                                                 |
| Phase 10 plan                                  | `docs/control-room-v2/phase10-plan.md`                                                                |
| Phase 11 plan                                  | `docs/control-room-v2/phase11-plan.md`                                                                |
| Prisma schema plan                             | `docs/control-room-v2/prisma-schema-plan.md`                                                          |
| Phase 12 plan                                  | `docs/control-room-v2/phase12-plan.md`                                                                |
| Paused TanStack adapter handoff                | `docs/control-room-v2/phase9-adapter-boundary.md`                                                     |
| Accepted Batch 4A head/run                     | `2b14028c4e60c3395a9bbe819506adca8bfdcae1` / `29044424035`                                            |
| Accepted Batch 4B head/run                     | `2dd8442898703354d34e292361e0f5f70064ebdc` / `29046530809`                                            |
| Unresolved executable gates                    | 4F, 5D, 6E, 7E, Phase 8, Phase 9 readiness implementation and paused TanStack foundation verification |
| Merge integration                              | Current `main` merged through reviewed conflict resolution on 2026-07-13                              |
| Review readiness                               | PR #4 merge handoff verified; feature-phase acceptance blockers carry into the continuation PR        |

## Completed and accepted foundation

### Phase 0 — execution contract

- [x] Product and UX specification
- [x] Gated implementation plan and progress tracker
- [x] Durable `AGENTS.md` architecture and verification rules
- [x] Dedicated branch and draft pull request

### Phase 1 — shell and first Overview

- [x] Route-level Admin shell and adaptive navigation
- [x] Active-store and new-store Overview states
- [x] Connected operational selectors
- [x] Loading and error boundaries
- [x] Legacy Admin catch-all removed from the feature branch
- [x] Phase 1 verification gate

### Phase 2 — Inventory foundation

- [x] Unique, stocked and variant inventory model
- [x] Quantity invariants and connected selectors
- [x] Saved views, search, filters and sorting
- [x] Grid, desktop table and mobile cards
- [x] Deep-linkable detail and CSV export
- [x] Responsive browser matrix and React Doctor 100/100

Final Phase 2 verification: run `29021779448` on `b5ad5c64a906cef216a6b8e441893d095b09e4ff`.

### Phase 3 — Product editor and Intake

- [x] Seven-step unique, stocked and variant editor
- [x] React Hook Form and Zod validation
- [x] Draft, publish, schedule and editing flows
- [x] Connected Intake queue and live Inventory updates
- [x] Full-viewport mobile editor
- [x] Tests, build, browser interactions and React Doctor 100/100

Final Phase 3 verification: run `29035766157` on `ba05d413d62154f1b41a415e5d31003bdf2c20f1`.

### Phase 4A — Sales domain

- [x] Atomic reserve, release, sale, cancellation and return helpers
- [x] Cross-domain inventory, revenue, customer and activity updates
- [x] Tests and React Doctor 100/100

Accepted head/run: `2b14028c4e60c3395a9bbe819506adca8bfdcae1` / `29044424035`.

### Phase 4B — Orders workspace

- [x] Responsive Orders route and detail
- [x] Search, saved views, filters and sorting
- [x] Timeline, transitions, confirmations and errors
- [x] Responsive browser evidence and React Doctor 100/100

Accepted head/run: `2dd8442898703354d34e292361e0f5f70064ebdc` / `29046530809`.

## Implemented but unaccepted earlier phases

### Phase 4C–4F

- [x] Holds workspace and actions
- [x] Record Sale workflow
- [x] Returns workspace and disposition
- [x] Browser and responsive coverage encoded
- [ ] Consolidated executable verification and screenshot review
- [ ] Phase 4 accepted

### Phase 5 — Customers

- [x] Connected metrics, segments and attention reasons
- [x] Responsive list, detail, timeline, products, delivery and notes
- [x] Tests and browser coverage encoded
- [ ] Final executable gate and screenshot review
- [ ] Phase 5 accepted

Evidence: `docs/control-room-v2/phase5-blocker.md`.

### Phase 6 — Store Settings

- [x] Identity, Selling, Delivery, Payments, Notifications and Team
- [x] URL-backed sections, validation, dirty protection and atomic save
- [x] Browser coverage encoded
- [ ] Final executable gate and screenshot review
- [ ] Phase 6 accepted

Evidence: `docs/control-room-v2/phase6-blocker.md`.

### Phase 7 — Brand, themes and media

- [x] Approved woven L/S identity
- [x] Theme controller and semantic token system
- [x] Shared media viewer
- [x] Initial theme/media browser coverage
- [ ] Final executable gate and screenshot review
- [ ] Upstream `main` integrated safely
- [ ] Pull request mergeable
- [ ] Phase 7 accepted

Evidence: `docs/control-room-v2/phase7-blocker.md`.

## Phase 8 — Visual System, Shell, Overview and Inventory Correction

### Batches 8A–8E — implemented

- [x] Paired Light/Dark semantic role matrix and shared primitive migration
- [x] Base UI theme-menu composition corrected
- [x] Fixed sidebar regions and internal vertical scrolling
- [x] Record-aware command search
- [x] Overview responsibility and hierarchy correction
- [x] Separate Inventory image-preview and product-record actions
- [x] Light/Dark route matrix and consolidated browser coverage encoded

### Batch 8F — Inventory catalogue hardening — implemented

- [x] Five-column desktop grid
- [x] Shared grid/table/mobile pagination with 10, 15, 25 and 50 page sizes
- [x] Managed Category and Collection dropdown CRUD
- [x] Active-editor taxonomy synchronization
- [x] Collision-aware product and readable variant SKU generation
- [x] Unique-piece, interchangeable-stock and variant-stock semantics
- [x] Up to 12 images with file/URL CRUD and one featured cover
- [x] Optional Unit cost, Compare-at price and discount calculation
- [x] Safe archive, restore and protected permanent deletion

### Final gallery-card correction — implemented, not executed

- [x] Retained five cards per desktop row
- [x] Replaced the tall `5/6` catalogue-card image with a `4/3` gallery image
- [x] Removed the descriptor row, three-column stock block and separate footer
- [x] Reduced the card body to product identity, price, availability and one record action
- [x] Preserved media preview, selection, health status and inventory alerts
- [x] Added a browser geometry contract requiring card height at or below 290px at `1440×900`
- [x] Added an image-ratio assertion and compact-gallery screenshot
- [ ] Gallery geometry script executed
- [ ] Gallery screenshot reviewed
- [ ] Phase 8 accepted

Exact evidence remains in `docs/control-room-v2/phase8-blocker.md`.

## Phase 9 — Codebase Structure and Backend Readiness

### Replanned scope — implemented, awaiting final verification

- [x] Phase order changed so authentication and Prisma schema work come before TanStack Query
- [x] Phase 9 plan rewritten as codebase structure and backend readiness
- [x] Phase 10 Supabase Auth and role permission plan added
- [x] Phase 11 Prisma database plan added
- [x] Single-store Prisma schema blueprint added
- [x] Phase 12 TanStack Query plan added
- [x] Audit current route, feature, domain, repository, storefront and checkout boundaries
- [x] Normalize `src/lib/supabase/` and `src/lib/auth/` destinations where needed
- [x] Replace ESLint/Prettier tooling with Biome scripts and config
- [x] Move client repository provider wiring into `src/features/control-room/data/`
- [x] Add server/client import boundary test
- [x] Add Cloudinary and Cloudflare asset provider boundaries for Prisma-backed media metadata
- [x] Remove changed Control Room raw color usages in favor of theme tokens
- [x] Identify narrow file/folder fixes needed before auth and database implementation
- [x] Verify executable behavior through lint, TypeScript, Vitest and production build
- [ ] Phase 9 accepted

Evidence: `docs/control-room-v2/phase9-readiness-audit.md`.

Verification returned:

- [x] `C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD lint` — passed with Biome; 49 warnings remain visible
- [x] `C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD exec tsc --noEmit`
- [x] `C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD exec vitest run --passWithNoTests` — 31 files and 127 tests passed
- [x] `C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD build` — Next.js 16.2.10 production build passed
- [x] Earlier direct `node .\node_modules\typescript\bin\tsc --noEmit --pretty false --incremental false`
- [x] Earlier direct `node .\node_modules\vitest\vitest.mjs run --passWithNoTests` — 30 files and 126 tests passed
- [x] Changed-scope ESLint for earlier Phase 9 files before the Biome migration
- [ ] React Doctor — `npx.cmd --yes react-doctor@latest . --verbose --diff` timed out

### Paused preliminary TanStack foundation

This work was implemented before the replan and is preserved for Phase 12, not active Phase 9:

- [x] Typed asynchronous repository interfaces for Inventory, Orders, Holds, Returns, Customers, Settings and Overview
- [x] Deterministic in-memory adapter over the live `ControlRoomStore`
- [x] Repository calls read `store.getSnapshot()` at call time rather than storing a second record snapshot
- [x] Returned values are structured clones so consumers cannot mutate the store by reference
- [x] Stable repository provider mounted at the Control Room boundary
- [x] No fake API routes, artificial latency, random errors or persistence claims
- [x] Repository tests for clone isolation, live reads after writes, Overview consistency and missing records
- [x] Typed `inventoryKeys` and `productKeys` factories with stability tests
- [ ] TanStack package/provider/runtime work deferred to Phase 12

## Phase 10 — Supabase Auth, Google OAuth and Role Permissions

- [x] Supabase SSR browser/server/proxy clients wired through root `proxy.ts`
- [x] Google OAuth callback, auth error route and sign-in/sign-out flows
- [x] Consumer/admin/manager roles and capability contract
- [x] Consumer storefront account boundary for `/account`
- [x] Control Room route guard and permission-restricted UI state
- [x] Deterministic permission and redirect tests added
- [x] Local route smoke: `/auth/sign-in?next=/admin` returned 200, signed-out `/admin` redirected to `/auth/sign-in?next=/admin`, missing-code `/auth/callback` redirected to `/auth/error`
- [x] Google OAuth initiation smoke: `POST /auth/google` and `GET /auth/google?next=/admin` returned 303 redirects to Supabase OAuth with PKCE code challenge and `/auth/callback?next=/admin` redirect target
- [x] `C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD lint` — passed with Biome; 48 warnings remain visible in pre-existing files
- [x] `C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD exec tsc --noEmit`
- [x] `C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD exec vitest run --passWithNoTests` — 33 files and 134 tests passed
- [x] `C:\Users\olaitan\AppData\Roaming\npm\pnpm.CMD build` — Next.js 16.2.10 production build passed and listed `/auth/google`, `/auth/callback`, `/auth/error`, `/auth/sign-in` and `/auth/sign-out`
- [x] React Doctor changed-scope fallback: `npx.cmd --yes react-doctor@latest . --verbose --scope changed --base HEAD --no-supply-chain --no-score --max-duration 180 --blocking none` — no issues found
- [ ] Local Google OAuth browser completion test — blocked until a browser automation driver or interactive Google account session is available
- [ ] Full executable gate — blocked because the required `npx.cmd --yes react-doctor@latest . --verbose --diff` timed out after 5 minutes, even though the current supported changed-scope fallback passed

## Phase 11 — Prisma Database, Cloudinary Asset Metadata and Generated Client

- [x] Prisma migration workflow initialized with a committed single-store baseline
- [x] Identity, catalogue, inventory, sales, returns, customers, settings, audit and Cloudinary metadata schema drafted
- [x] The single admin is constrained by a unique profile-role index and service-role CLI bootstrap
- [x] Cloudinary-only image metadata tables retained; image blobs stay outside PostgreSQL
- [x] Server authorization guards implemented for consumers, admin and manager
- [x] Schema-aligned Prisma Client generated
- [x] Regression tests cover role permissions and admin-only bootstrap behavior
- [x] Fresh-database Prisma baseline generated without applying it to a shared database
- [x] Prisma Client generated from the validated schema
- [ ] Full executable and browser gates

Verification returned:

- [x] `prisma format`, `prisma validate` and `prisma generate`
- [x] `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` generated the baseline
- [x] `node .\node_modules\typescript\bin\tsc --noEmit --pretty false --incremental false`
- [x] `node .\node_modules\vitest\vitest.mjs run --passWithNoTests` — 33 files and 134 tests passed
- [x] `node .\node_modules\next\dist\bin\next build` — passed after elevated permission cleared Windows ACL issues in generated `.next` trace artifacts
- [x] `.\node_modules\.bin\biome.CMD check .` — passed with 48 existing warnings still visible
- [x] `node -c scripts\bootstrap-owner.mjs`
- [ ] `npx.cmd --yes react-doctor@latest . --verbose --diff` — still not rerun successfully; Phase 10 recorded the command timing out after 5 minutes, and staged changed-scope fallback is required before commit

## Phase 12 — TanStack Query Server-State Foundation

Foundation started 2026-07-11 under Decision 011 override.

- [x] Add `@tanstack/react-query` through pnpm (`5.101.2`); regenerated `pnpm-lock.yaml`
- [x] Mount one stable browser QueryClient at the Control Room boundary (`src/app/admin/query-provider.tsx`, wrapped in `control-room-shell.tsx`)
- [x] Promote paused preliminary repository/key foundation to active Phase 12 material (`repositories.ts`, in-memory adapter, mounted `ControlRoomRepositoryProvider`, `inventoryKeys`/`productKeys`)
- [x] Add typed domain query-key factories for Orders, Holds, Returns, Customers, Settings and Overview with stability test
- [x] Decide the `@tanstack/eslint-plugin-query` question: deferred — Biome remains the single lint entrypoint; the ESLint-only plugin is introduced only once real query hooks exist (Decision 011)
- [x] Migrate all six admin domains (Inventory, Orders, Holds, Returns, Customers, Settings) onto `useQuery`/`useMutation` over the existing `AdminRepositories` interface
- [x] Add targeted invalidation and authoritative cache reconciliation (`queryClient.setQueryData` from each mutation's own success payload; `invalidateQueries` only where the reducer's payload doesn't carry the authoritative updated value)
- [ ] Devtools (development-only, excluded from production) if/when warranted
- [ ] Full Phase 4–12 regression and production handoff

### 2026-07-17 — Repo restructuring and admin TanStack Query migration landed

Executed per `docs/superpowers/plans/2026-07-16-repo-restructuring-and-admin-query-migration.md`
and `docs/superpowers/specs/2026-07-16-repo-restructuring-and-admin-query-migration-design.md`,
under the same Decision 011 / Governance-note override recorded above. **This did not touch
Phase 10 or Phase 11** — those blockers stay exactly as recorded below; nothing here represents
them as passing.

Landed:

- [x] Workstream 1 — deleted unused shims, resolved the `session.ts` filename collision, fixed a
      stray direct `next-themes` import, deleted dead v1 layout components
- [x] Workstreams 2 & 3 — split `lib/admin/`'s 60 flat files into 8 domain subfolders
      (`inventory/`, `product-editor/`, `orders/`, `holds/`, `returns/`, `customers/`,
      `settings/`, `shared/`) and renamed the 9 `*-actions.ts` pure reducers to `*-reducer.ts`
- [x] Workstream 4 — extracted the one genuinely misplaced hook (`useAccountProducts`); the other
      10 context-consumer hooks stay colocated with their providers by design; adopted React 19
      `use()` over `useContext()` repo-wide
- [x] Workstream 5 — consolidated the admin and storefront `QueryClient` construction onto one
      shared `createQueryClient` factory; each surface keeps its own provider/mount strategy
- [x] Workstream 6 — split `app/checkout/page.tsx` (1118 lines) and `lib/admin/shared/seed.ts`
      (1021 lines) into per-concern files
- [x] Workstream 7 — enabled Cache Components (`cacheComponents: true`) and added
      `use cache`/`cacheTag`/`cacheLife` to the four Prisma-backed published-catalogue reads in
      `server/commerce/catalogue/catalog-repository.ts` — the one read path in the app with a
      real, current freshness boundary. **This is the only caching added anywhere in this
      change; nothing else is Prisma-backed or cached.**
- [x] Workstream 8 — migrated all six admin domains onto TanStack Query, wrapping the existing
      in-memory `AdminRepositories`/`AdminStore` (unchanged business logic) in a client-cache
      boundary. **Admin reads/writes remain in-memory-prototype, not Prisma-backed** — this
      migration is orthogonal to the Prisma/auth work blocked in Phase 10/11 below, per the
      plan's own explicit constraint against inventing persistence claims. Workspace components
      whose view models genuinely span multiple domains (e.g. Customers' relationship profiles
      pulling from orders/holds/returns/reviews, Holds' product-name resolution, Orders'/
      Returns'/Record Sale's cross-references) keep their read on `useAdmin()`'s synchronous
      store; only migrations with a single-domain read, or a mutation, moved onto
      `useQuery`/`useMutation`. Removed the deprecated `ControlRoom*` compatibility aliases now
      that every domain has migrated off the pattern they existed to ease.

Verification for the full plan:

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` (163 tests, 41 files), `pnpm audit:buttons`, and
      `pnpm build` all passed after every task and at the end of each workstream
- [x] `npx react-doctor@latest . --verbose --diff` completed with "No issues detected" (its
      internal lint sub-check exceeded its own 300s budget and was skipped, so the result is
      marked incomplete by the tool itself — the same limitation this tracker has recorded for
      every prior phase's React Doctor run)
- [ ] Manual browser smoke passes for the six migrated domains — not performed; this session had
      no admin Supabase credentials available and does not enter credentials on the user's
      behalf. The automated verification above (typecheck/lint/test/build) is the evidence on
      record; a human pass through each workspace (Settings, Customers, Holds, Returns, Orders,
      Inventory + Product Editor + Record Sale) is still owed before this is browser-verified.

Foundation verification returned (earlier, 2026-07-11):

- [x] `.\node_modules\.bin\biome.CMD check .` — 0 errors, 48 pre-existing warnings still visible
- [x] `node .\node_modules\typescript\bin\tsc --noEmit --pretty false --incremental false`
- [x] `node .\node_modules\vitest\vitest.mjs run --passWithNoTests` — 35 files and 139 tests passed
- [x] `node .\node_modules\next\dist\bin\next build` — Next.js 16.2.10 production build passed (exit 0)
- [x] React Doctor changed-scope fallback: `npx.cmd --yes react-doctor@latest . --verbose --scope changed --base HEAD --no-supply-chain --no-score --max-duration 180 --blocking none` — no issues found

## Verification and integration blockers

No executable evidence has been returned for the compact Inventory gallery or the paused TanStack foundation. Phase 9 has Biome lint, TypeScript, Vitest and production-build evidence, but React Doctor and browser/visual checks are not represented as passing. Phase 10 has auth route, OAuth initiation, TypeScript, Vitest and production-build evidence, but the required React Doctor `--diff` command and full browser OAuth completion remain open. Phase 11 now has Prisma format, validation, generation and a review-only baseline; applying it to a shared database remains intentionally outside this change.

PR #4's 31-commit divergence from `main` was resolved on 2026-07-13 with a normal reviewed merge.
The connected storefront implementation from `main` won the shared storefront conflicts; the
Control Room's theme provider and semantic/dark token contracts were reconciled explicitly. The
resolved tree passed Biome (44 warnings remain visible), TypeScript, 35 Vitest files / 139 tests, and
the Next.js 16.2.10 Turbopack production build. The required React Doctor `--diff` mode timed out after
five minutes; its bounded changed-scope fallback completed with 11 warnings in the merged storefront
files. Those findings and all earlier phase gates remain open in the continuation PR.

## Next action

All six admin domains are now migrated onto TanStack Query (2026-07-17, under the Decision 011 /
Governance-note override), but over the existing in-memory `AdminRepositories`/`AdminStore` —
**not** the Phase 11 Prisma schema. That data-layer swap (admin reads/writes moving onto Prisma
with the Phase 10 authenticated profile-role contracts) remains open and blocked exactly as
recorded below; this migration only changed the client-side caching boundary in front of the
still-in-memory prototype store. A manual browser smoke pass across the six domains is also still
owed (see the 2026-07-17 entry above for why it wasn't done in-session).

Keep Phase 10 and Phase 11 blockers visible, do not represent them as passing, and keep PR #4 draft/non-review-ready until the blocked gates and the branch divergence are resolved.

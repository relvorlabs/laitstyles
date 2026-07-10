# Laitstyle Control Room V2 — Progress Tracker

## Current score

**Phase 10 in progress — Supabase Auth, Google OAuth and organization permissions**

The user explicitly requested that Supabase Auth, Google OAuth, organization roles/permissions, codebase structure fixes and Supabase database/schema setup happen before TanStack Query. The previous TanStack Phase 9 repository/key work remains on the branch as paused preliminary foundation and must be reconciled in Phase 12.

This does not mark Phase 4, Phase 5, Phase 6, Phase 7 or Phase 8 as accepted. No blocked check, screenshot review or merge condition is represented as passing.

## Current phase

| Field                                          | Value                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Status                                         | Phase 10 in progress; Phase 9 dirty sidebar change committed and React Doctor timeout remains recorded |
| Active implementation phase                    | Phase 10 — Supabase Auth, Google OAuth and Organization Permissions                                  |
| Compact Inventory gallery head                 | `5398b7449a59bcfbd6d497e5f47208f78abc2f6c`                                                            |
| Paused TanStack repository/key foundation head | `0b266e4faed24fc3ea8bfcbb2d2133bf5a16647f`                                                            |
| Previous Phase 9 documentation head            | `e8e7d94141b0410517bd69746001df6be7388e76`                                                            |
| Branch                                         | `feat/control-room-v2`                                                                                |
| Pull request                                   | `#4` — draft, currently non-mergeable                                                                 |
| Phase 8 plan                                   | `docs/control-room-v2/phase8-plan.md`                                                                 |
| Phase 8 blocker                                | `docs/control-room-v2/phase8-blocker.md`                                                              |
| Phase 9 plan                                   | `docs/control-room-v2/phase9-plan.md`                                                                 |
| Phase 10 plan                                  | `docs/control-room-v2/phase10-plan.md`                                                                |
| Phase 11 plan                                  | `docs/control-room-v2/phase11-plan.md`                                                                |
| Supabase schema plan                           | `docs/control-room-v2/supabase-schema-plan.md`                                                        |
| Phase 12 plan                                  | `docs/control-room-v2/phase12-plan.md`                                                                |
| Paused TanStack adapter handoff                | `docs/control-room-v2/phase9-adapter-boundary.md`                                                     |
| Accepted Batch 4A head/run                     | `2b14028c4e60c3395a9bbe819506adca8bfdcae1` / `29044424035`                                            |
| Accepted Batch 4B head/run                     | `2dd8442898703354d34e292361e0f5f70064ebdc` / `29046530809`                                            |
| Unresolved executable gates                    | 4F, 5D, 6E, 7E, Phase 8, Phase 9 readiness implementation and paused TanStack foundation verification |
| Merge integration                              | Branch is 703 commits ahead and 31 behind `main`; reviewed conflict resolution required               |
| Review readiness                               | Blocked                                                                                               |

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

## Phase 9 — Codebase Structure Review and Supabase Readiness

### Replanned scope — implemented, awaiting final verification

- [x] Phase order changed so Supabase/auth/schema work comes before TanStack Query
- [x] Phase 9 plan rewritten as codebase structure review and Supabase readiness
- [x] Phase 10 Supabase Auth and organization permission plan added
- [x] Phase 11 Supabase database/storage/RLS plan added
- [x] Supabase schema blueprint added
- [x] Phase 12 TanStack Query plan added
- [x] Audit current route, feature, domain, repository, storefront and checkout boundaries
- [x] Normalize `src/lib/supabase/` and `src/lib/auth/` destinations where needed
- [x] Replace ESLint/Prettier tooling with Biome scripts and config
- [x] Move client repository provider wiring into `src/features/control-room/data/`
- [x] Add server/client import boundary test
- [x] Add Cloudinary and Cloudflare asset provider boundaries for Supabase-backed media metadata
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

## Phase 10 — Supabase Auth, Google OAuth and Organization Permissions

- [x] Supabase SSR browser/server/proxy clients wired through root `proxy.ts`
- [x] Google OAuth callback, auth error route and sign-in/sign-out flows
- [x] Staff owner/manager/operator roles and capability contract
- [x] Consumer storefront account boundary for `/account`
- [x] Control Room route guard and permission-restricted UI state
- [x] Deterministic permission and redirect tests added
- [x] Local route smoke: `/auth/sign-in?next=/admin` returned 200, signed-out `/admin` redirected to `/auth/sign-in?next=/admin`, missing-code `/auth/callback` redirected to `/auth/error`
- [ ] Local Google OAuth browser smoke test
- [ ] Full executable gate

## Phase 11 — Supabase Database, Storage, RLS and Generated Types

- [ ] Supabase migration workflow initialized or repaired
- [ ] Identity, catalogue, inventory, sales, returns, customers, reviews, settings, audit and storage schema
- [ ] RLS policies for public storefront, consumers and staff roles
- [ ] Storage buckets and storage policies
- [ ] Deterministic development seed data
- [ ] Generated database TypeScript types
- [ ] Supabase advisors/RLS tests and full executable gate

## Phase 12 — TanStack Query Server-State Foundation

- [ ] Reconcile paused preliminary repository/key work
- [ ] Add `@tanstack/react-query` through pnpm and decide whether TanStack's ESLint-only plugin warrants a narrow compatibility runner under the Biome baseline
- [ ] Mount stable QueryClient
- [ ] Migrate Supabase-backed domain reads/writes into query options and mutations
- [ ] Add targeted invalidation, cache reconciliation and safe optimistic rollback
- [ ] Full Phase 4–12 regression and production handoff

## Verification and integration blockers

No executable evidence has been returned for the compact Inventory gallery or the paused TanStack foundation. Phase 9 has Biome lint, TypeScript, Vitest and production-build evidence, but React Doctor and browser/visual checks are not represented as passing.

PR #4 remains non-mergeable. The branch is 703 commits ahead and 31 commits behind `main`, with merge base `4483156669a2b6f43218d5e27f484562ccc08a8d`. Upstream integration must use reviewed conflict resolution; an `ours` or tree-only merge is not acceptable.

## Next action

Continue Phase 10 verification: run Biome, TypeScript, Vitest, production build, React Doctor and a local auth smoke check. Keep the paused TanStack repository/key work for Phase 12. Keep PR #4 draft and non-review-ready until the blocked gates and branch divergence are resolved.

# Phase 5–6 Architecture Repair Ledger

**Status:** In progress
**Repair PR:** #46
**Baseline:** `61a1fd8928f61f7a3b628afd317ae6327e291265`
**Authoritative plan:** `update(3).md` / Laitstyles Architecture Decision and Migration Review

## Why this repair exists

The Phase 5 and Phase 6 branches changed runtime ownership without proving the repository against the approved target architecture. The resulting tree contains stale export/import contracts, legacy `features/**` and top-level `server/**` ownership, and architecture checks that still require files the migration deleted.

This repair is not Phase 7. Authentication consolidation remains paused until this ledger reaches its acceptance gate.

## Non-negotiable constraints

- Preserve the existing storefront and admin UI exactly.
- Do not run, edit, or depend on GitHub Actions workflows for evidence.
- Do not represent a queued, skipped, unavailable, or unexecuted check as passed.
- Fix one ownership layer at a time and rerun the relevant local check before continuing.
- Client remote data follows typed client -> `/api/v1/**` -> domain module -> Prisma.
- Server Components call domain queries directly and do not fetch internal APIs.
- Route Handlers and Server Actions are separate thin transports over shared domain commands.
- No new production code may be added under `src/features/**` or top-level `src/server/**`.

## Sequential repair tasks

### R0 — Branch and evidence reset

- [x] Reset PR #46 onto the current post-Phase-6 `main` head.
- [x] Record the approved architecture document as authoritative.
- [x] Pause Phase 7 implementation.
- [ ] Replace the obsolete Phase 5 certification PR description with this repair scope.

### R1 — Export and import graph repair

- [ ] Inventory every deleted or renamed Phase 5/6 module.
- [ ] Remove stale runtime imports of deleted providers, adapters, loaders and symbols.
- [ ] Remove stale re-exports whose target module does not export the requested name.
- [ ] Verify every `export { ... } from` edge against its source module.
- [ ] Add a permanent unresolved-relative-import and retired-import guard.
- [ ] Run TypeScript after this task before structural moves.

### R2 — Architecture guard reconciliation

- [ ] Remove requirements for deleted compatibility files.
- [ ] Replace American `catalog` checks with the canonical British `catalogue` contract.
- [ ] Stop treating GitHub workflow filenames as an architecture requirement.
- [ ] Guard Client Components from server/Prisma imports.
- [ ] Guard TanStack hooks from Server Action imports.
- [ ] Guard Route Handlers from Server Action imports.
- [ ] Guard production fixture imports.
- [ ] Guard new production code under `features/**` and top-level `server/**`.
- [ ] Guard target API prefixes and domain ownership.

### R3 — Storefront non-UI ownership migration

- [ ] Move shared storefront runtime orchestration out of `features/storefront/shared`.
- [ ] Move catalogue loading/projection ownership fully into `modules/products`.
- [ ] Move reusable storefront hooks into `src/hooks` or the owning domain client folder.
- [ ] Keep cart, saved items and shared UI state only in `src/stores`.
- [ ] Move scoped providers into `src/providers`.
- [ ] Remove app/store/server imports from `features/storefront/**`.

### R4 — Storefront UI domain migration

- [ ] Move product catalogue and product-detail UI to `modules/products/ui/storefront`.
- [ ] Move cart UI to `modules/cart/ui/storefront`.
- [ ] Move checkout UI to `modules/checkout/ui/storefront` without implementing Phase 8 settlement.
- [ ] Move account order UI to `modules/orders/ui/storefront`.
- [ ] Move shell UI to `modules/storefront-shell/ui`.
- [ ] Move domain overlays beside their owning modules.
- [ ] Delete emptied `features/storefront/**` paths only after consumer cutover.

### R5 — Top-level server ownership migration

- [ ] Move `src/server/commerce/orders/**` to `modules/orders/server/**`.
- [ ] Move `src/server/commerce/reviews/**` to the owning module.
- [ ] Move remaining inventory, returns, holds and customer business code into their modules.
- [ ] Keep auth server migration out of scope until Phase 7 resumes.
- [ ] Remove reverse dependencies from domain server code into UI/features types.

### R6 — API route reconciliation

- [ ] Public product machine reads use `/api/v1/products/**` where a Client Component needs HTTP.
- [ ] Account machine reads and mutations use `/api/v1/account/**`.
- [ ] Staff inventory uses `/api/v1/admin/inventory/**`.
- [ ] Staff products, orders, holds, returns, customers and settings remain under `/api/v1/admin/**`.
- [ ] Do not add unused theoretical endpoints.
- [ ] Server Components continue calling domain queries directly.
- [ ] Remove obsolete `/api/v1/storefront/**` compatibility routes after consumer migration.

### R7 — Formatting and static correctness

- [ ] Run Biome check and fix only evidenced formatting/import issues.
- [ ] Run TypeScript with no emit.
- [ ] Run architecture guard.
- [ ] Run Prisma validation.
- [ ] Record exact commands, exit codes and remaining errors.

### R8 — Runtime and behavioural validation

- [ ] Run focused unit/API tests for each moved domain.
- [ ] Run the full unit suite.
- [ ] Run production build.
- [ ] Run React Doctor.
- [ ] Run storefront smoke checks.
- [ ] Run Playwright locally for desktop, tablet and mobile.
- [ ] Confirm no UI, theme, typography, layout or responsive drift.

## Acceptance gate

PR #46 cannot be marked complete until:

1. the export/import graph is clean;
2. architecture guard, Biome and TypeScript pass locally;
3. production code no longer uses ambiguous storefront business ownership under `features/**`;
4. top-level `server/**` business ownership is either migrated or explicitly deferred only for Phase 7 auth;
5. required interactive APIs follow `/api/v1/**` and domain modules;
6. unit, build and local browser validation pass;
7. every remaining exception is named with an owner and removal phase.

# Phase 2 — Layout and Provider Scope

**Branch:** `refactor/phase-2-layout-provider-scope`  
**Base commit:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Status:** Implementation complete; acceptance validation blocked  
**Goal:** Consolidate storefront layouts and place providers at the smallest correct runtime boundary while preserving route and visual parity.

## Authority

This checklist is derived from the approved Phase 2 goal in
`decision-and-migration-review.md` and the concrete provider/layout inventory captured in Phase 0.
It does not expand Phase 2 into domain, API, persistence, authentication, checkout-authority, or
state-management migration.

Phase 1 was merged by explicit repository-owner direction while private validation remained queued
for the not-yet-registered `laitstyles-ci` runner. That debt is retained and is not represented as a
pass.

## Locked scope

Phase 2 may:

- create a route group that does not change public URLs;
- move existing route files without rewriting their presentation;
- consolidate duplicate storefront layout wrappers;
- keep theme and toaster infrastructure at the root;
- move TanStack Query from the root to the smallest existing surface that consumes it;
- add layout/provider contract checks and route-parity evidence;
- update migration documentation.

Phase 2 must not:

- create `src/modules/**` domain implementations;
- change Prisma queries, repositories, API routes, Server Actions, or data ownership;
- remove AdminStore, seeded admin state, or in-memory repositories;
- introduce Zustand or split storefront state;
- consolidate authentication;
- change checkout, payment, inventory, order, or delivery authority;
- redesign JSX, CSS classes, tokens, typography, spacing, responsive behaviour, or interactions.

## Execution checklist

| ID | Task | Status | Evidence |
| --- | --- | --- | --- |
| P2-T01 | Add one shared `src/app/(storefront)/layout.tsx` using the existing `StorefrontRouteBoundary` | Complete | Shared route-group layout committed |
| P2-T02 | Move the homepage under `(storefront)/(home)` without changing `/` | Complete | Existing page retained as a pure rename; duplicate homepage layout removed |
| P2-T03 | Move `products`, `collections`, `cart`, `checkout`, and `order-confirmation` under `(storefront)` | Complete | Every discovered page, loading, error and not-found file moved as the same blob; public segment names are unchanged |
| P2-T04 | Move `account` under `(storefront)` while retaining the nested `AccountShell` layout | Complete | Twenty-five account files moved, including nested order/review boundaries and the profile action; only the duplicate outer boundary was removed |
| P2-T05 | Remove duplicate per-segment storefront layout re-exports and retire `src/app/storefront-layout.tsx` | Complete | Five segment layouts plus the homepage layout removed; compatibility layout became the shared route-group layout |
| P2-T06 | Remove `QueryProvider` from the app-wide root provider | Complete | `AppProvider` owns theme and toaster only |
| P2-T07 | Scope `QueryProvider` to the current TanStack-consuming admin surface | Complete | `src/app/admin/layout.tsx` wraps the authenticated `AdminShell` |
| P2-T08 | Add machine checks for root/provider and storefront-layout invariants | Complete | Guard requires the final route map, rejects legacy top-level segments, rejects global QueryProvider and rejects account double-wrapping |
| P2-T09 | Validate route continuity, auth redirects, console/network health, and desktop/tablet/mobile light/dark parity | Blocked | Private runner not online; no source-backed branch preview evidence is available |
| P2-T10 | Record final map, validation state, rollback and remaining debt | Complete | This document and the migration tracker record the final source map and blocked acceptance evidence |

## Final source composition

```text
RootLayout
  -> AppProvider
     -> ThemeProvider
     -> application routes
     -> Toaster

AdminLayout
  -> staff access resolution
  -> QueryProvider
     -> AdminShell

src/app/(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> (home)/page.tsx                    /
     -> products/**                        /products/**
     -> collections/**                     /collections/**
     -> cart/page.tsx                      /cart
     -> checkout/page.tsx                  /checkout
     -> order-confirmation/page.tsx        /order-confirmation
     -> account/layout.tsx
        -> AccountShell
           -> account/**                   /account/**
```

The account subtree includes saved, security, payments, addresses, preferences, notifications,
returns, support, dynamic order detail and verified-review routes in addition to the Phase 0 route
list. They were moved together so the application does not retain split storefront ownership.

## Change character

GitHub classifies the route migration as renames. Existing route page, loading, error, not-found and
Server Action blobs are unchanged. The only route-content edit is
`src/app/(storefront)/account/layout.tsx`, which removes its old `StorefrontRouteBoundary` wrapper
because the shared parent layout now owns that boundary. `AccountShell`, metadata and all nested
route behavior remain in place.

No product, catalogue, cart, checkout, account, auth, payment, order or admin component JSX was
rewritten in this phase.

## Machine contract

`scripts/checks/layout-provider-contract.mjs` now fails when:

- `QueryProvider` returns to the root provider;
- admin no longer mounts `QueryProvider`;
- another source file mounts the current QueryProvider unexpectedly;
- the shared storefront layout or required route files disappear;
- a legacy top-level storefront segment is recreated;
- the compatibility `src/app/storefront-layout.tsx` file returns;
- the account layout loses `AccountShell` or remounts `StorefrontRouteBoundary`.

The contract is part of `pnpm check:architecture`.

## Validation state

Implementation inspection is complete, but executable source and browser validation remains
blocked by the unavailable trusted runner. The following are still required and are not represented
as passing:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm test:e2e
```

Source-backed Playwright must still prove URL continuity, unauthenticated admin redirects,
account/auth behavior, desktop/tablet/mobile layouts, light/dark parity, and no increase in console,
page or network errors.

## Rollback

Before merge, rollback is to revert the Phase 2 branch commits or close PR #39. After a squash
merge, revert that squash commit as one unit. Do not partially restore individual legacy layouts,
because mixing the shared route-group boundary with old per-segment wrappers would double-mount the
storefront provider tree.

## Acceptance gate

Phase 2 is complete only when:

1. every intended storefront route is physically under the shared route group;
2. public URLs and redirects are unchanged;
3. no duplicate storefront layout wrapper remains;
4. root composition contains only genuinely global infrastructure;
5. all existing TanStack consumers render beneath QueryProvider;
6. architecture, Biome, TypeScript, tests, build and React Doctor execute;
7. source-backed Playwright passes desktop, tablet and mobile contracts;
8. light/dark screenshots show no unexplained visual difference;
9. console, page and network errors do not increase;
10. remaining Phase 1 runner debt is still reported honestly if unresolved.

Items 1–5 are implemented in source. Items 6–9 remain blocked. A queued job, unavailable runner,
public-deployment-only smoke test, or missing branch preview is not a Phase 2 source-validation pass.

# Phase 2 — Layout and Provider Scope

**Branch:** `refactor/phase-2-layout-provider-scope`  
**Base commit:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Status:** In progress  
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
| P2-T02 | Move the homepage under `(storefront)/(home)` without changing `/` | Complete | Existing page copied unchanged; duplicate homepage layout removed |
| P2-T03 | Move `products`, `collections`, `cart`, `checkout`, and `order-confirmation` under `(storefront)` | Not started | Preserve every existing route file and URL |
| P2-T04 | Move `account` under `(storefront)` while retaining the nested `AccountShell` layout | Not started | Account metadata, shell and nested route files must remain unchanged |
| P2-T05 | Remove duplicate per-segment storefront layout re-exports and retire `src/app/storefront-layout.tsx` after its final consumer moves | In progress | Homepage duplicate removed; other segments remain |
| P2-T06 | Remove `QueryProvider` from the app-wide root provider | Complete | `AppProvider` now owns theme and toaster only |
| P2-T07 | Scope `QueryProvider` to the current TanStack-consuming admin surface | Complete | `src/app/admin/layout.tsx` wraps authenticated `AdminShell` |
| P2-T08 | Add machine checks for root/provider and storefront-layout invariants | Not started | Must fail global QueryProvider regressions and duplicate layout reintroduction |
| P2-T09 | Validate route continuity, auth redirects, console/network health, and desktop/tablet/mobile light/dark parity | Blocked | Private runner not online; branch preview URL not yet available |
| P2-T10 | Record final file map, validation results, rollback and remaining debt | In progress | This document and migration tracker |

## Current implementation slice

The first runtime slice changes only composition:

```text
RootLayout
  -> AppProvider
     -> ThemeProvider
     -> application routes
     -> Toaster

/admin layout
  -> staff access resolution
  -> QueryProvider
     -> AdminShell

/ homepage
  -> src/app/(storefront)/layout.tsx
     -> StorefrontRouteBoundary
        -> unchanged StorefrontHome page
```

Current source search found TanStack `useQuery` consumers under the admin surface and no storefront
consumer. Moving QueryProvider to the admin layout therefore removes unnecessary global cache scope
without moving any server record or changing query behaviour for existing consumers.

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

A queued job, unavailable runner, public-deployment-only smoke test, or missing branch preview is not
a Phase 2 source-validation pass.

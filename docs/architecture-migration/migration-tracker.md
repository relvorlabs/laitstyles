# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Current branch:** `refactor/phase-2-layout-provider-scope`  
**Current phase:** Phase 2 — Consolidate layouts and provider scope  
**Overall status:** Implementation complete; acceptance validation blocked

Status values: `Not started`, `In progress`, `Blocked`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language, and permanent validation | Merged with debt | Implementation merged; private source validation still queued for `laitstyles-ci` |
| 2 | Consolidate layouts and provider scope | Blocked | Source implementation complete; route and visual parity evidence unavailable |
| 3 | Create HTTP and domain-module foundation | Not started | Typed transport contract proven |
| 4 | Cut over products and inventory | Not started | Prisma-backed parity |
| 5 | Remove remaining admin dummy domains | Not started | No runtime in-memory business data |
| 6 | Split storefront state and add Zustand | Not started | State ownership and UI parity |
| 7 | Consolidate authentication | Not started | Auth flow parity |
| 8 | Make checkout and payment server-authoritative | Not started | Idempotent settlement |
| 9 | Delete legacy architecture | Not started | No legacy imports |
| 10 | Final validation and release readiness | Not started | Full gates and visual parity |

## Phase 0 result

Phase 0 completed its evidence checklist and merged through PR #37.

```text
Playwright run: 30099471635
Result: 15 passed, 0 failed, 0 skipped, 0 errors
Artifact ID: 8599046423
Digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
```

The public deployment/source mismatch and excluded authenticated admin mutations remain recorded
baseline limitations. They are not hidden passes.

## Phase 1 result

Phase 1 architecture and validation tasks P1-T01 through P1-T13 were implemented and squash-merged
through PR #38 as `1ca1b184207ea2a36fa41c10162b8a059abe5289`.

The repository owner explicitly directed the merge and Phase 2 start while these private workflows
remained queued for the not-yet-registered `laitstyles-ci` runner:

```text
Implementation Quality: 30103043887
Playwright UI Contract: 30103043857
```

Therefore Phase 1 is recorded as **Merged with debt**, not as privately validated. Biome,
TypeScript, Vitest, Prisma, build, React Doctor and source-backed Playwright have not been converted
into passes by the merge decision.

The exact Phase 4 legacy transport exception remains:

```text
src/features/admin/inventory/inventory-mutations.ts
  -> src/features/admin/inventory/inventory-actions.ts
```

## Phase 2 execution

The exact Phase 2 checklist and scope are maintained in
[`phase-2-layout-provider-status.md`](phase-2-layout-provider-status.md).

| ID | Task | Status |
| --- | --- | --- |
| P2-T01 | Add shared `(storefront)` layout using the existing route boundary | Complete |
| P2-T02 | Move the homepage under `(storefront)/(home)` | Complete |
| P2-T03 | Move products, collections, cart, checkout and order confirmation | Complete |
| P2-T04 | Move the full account subtree while retaining `AccountShell` | Complete |
| P2-T05 | Remove duplicate storefront layout wrappers and retire compatibility layout | Complete |
| P2-T06 | Remove QueryProvider from global root | Complete |
| P2-T07 | Scope QueryProvider to the current admin TanStack surface | Complete |
| P2-T08 | Add provider and final route-map architecture checks | Complete |
| P2-T09 | Execute route, browser and visual parity validation | Blocked |
| P2-T10 | Record final map, validation state, rollback and debt | Complete |

## Phase 2 final composition

```text
RootLayout
  -> AppProvider
     -> ThemeProvider
     -> routes
     -> Toaster

AdminLayout
  -> staff access resolution
  -> QueryProvider
     -> AdminShell

src/app/(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> (home)                  /
     -> products                /products/**
     -> collections             /collections/**
     -> cart                    /cart
     -> checkout                /checkout
     -> order-confirmation      /order-confirmation
     -> account/layout.tsx
        -> AccountShell         /account/**
```

The moved files retain their existing blobs except for the account layout, which removes the now
redundant nested `StorefrontRouteBoundary`. The compatibility layout and all per-segment storefront
layout re-exports are gone. Public segment names are unchanged because `(storefront)` is a route
group and is omitted from URLs.

This phase changes route and provider composition only. It does not migrate domains, APIs,
persistence, auth ownership, storefront state, checkout authority, or UI presentation.

## Phase 2 acceptance gate

Required before Phase 2 may be declared complete:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm test:e2e
```

Also required:

- route continuity for `/`, products, collections, cart, checkout, confirmation and all account routes;
- authenticated and unauthenticated auth/admin redirect parity;
- desktop, tablet and mobile Playwright evidence;
- light and dark screenshot parity;
- no increase in console, page or network errors.

Source implementation tasks P2-T01 through P2-T08 and P2-T10 are complete. P2-T09 remains blocked
because the trusted `laitstyles-ci` runner is not online and no source-backed branch preview evidence
is available. A queued runner, unavailable check, missing artifact, or public-deployment-only result
must remain reported as blocked rather than passing.

Phase 3 must not start until the repository owner explicitly accepts this blocked evidence state or
the Phase 2 validation gate executes successfully.

## Decision safeguards

- No phase intentionally redesigns the UI.
- Route Handlers do not call Server Actions.
- Server Components do not call internal APIs for their own reads.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- URL owns navigable filters, sorting, pagination, and search.
- Zustand is limited to browser-owned shared state.
- Storefront and admin share domains, not unrestricted actions.

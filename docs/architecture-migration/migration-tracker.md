# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Phase 2 merge:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Current branch:** `refactor/phase-3-http-module-foundation`  
**Current phase:** Phase 3 — Typed HTTP and module foundation  
**Overall status:** In progress; executable validation blocked

Status values: `Not started`, `In progress`, `Blocked`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language, and permanent validation | Merged with debt | Implementation merged; private source validation still queued for `laitstyles-ci` |
| 2 | Consolidate layouts and provider scope | Merged with debt | Source implementation merged; route and visual parity evidence unavailable |
| 3 | Create HTTP and domain-module foundation | In progress | Typed transport contract proven with tests and runtime evidence |
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

## Phase 2 result

Phase 2 source implementation tasks P2-T01 through P2-T08 and P2-T10 were squash-merged through
PR #39 as `558e34852f38f0982c7ce9d7c32422f09bbf8775`.

The repository owner explicitly directed the merge and Phase 3 start while these source-backed
workflows remained queued:

```text
Implementation Quality: 30106477826
Playwright UI Contract: 30106477740
```

Phase 2 is therefore recorded as **Merged with debt**. P2-T09 route, auth, browser and visual parity
validation remains unresolved and must not be represented as passing.

The merged composition is:

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

The moved route files retain their existing implementation except for the account layout removing
the redundant nested `StorefrontRouteBoundary`. Public URLs remain unchanged because `(storefront)`
is a route group.

## Phase 3 execution

The exact Phase 3 scope and evidence are maintained in
[`phase-3-http-module-status.md`](phase-3-http-module-status.md).

| ID | Task | Status |
| --- | --- | --- |
| P3-T01 | Add typed success and error envelopes | Complete |
| P3-T02 | Add stable server error mapping and sanitized fallback | Complete |
| P3-T03 | Add typed browser API client | Complete |
| P3-T04 | Establish `/api/v1/**` with a thin proof Route Handler | Complete |
| P3-T05 | Prove the target module dependency direction | Complete |
| P3-T06 | Add unit and route contract coverage | Implemented; not executed |
| P3-T07 | Add machine-readable architecture guard | Complete |
| P3-T08 | Preserve existing compatibility transport until consumer migration | Complete |
| P3-T09 | Execute architecture, Biome, TypeScript, Vitest, build and React Doctor | Blocked |
| P3-T10 | Prove runtime `/api/v1/health` response and review final diff | Blocked |

## Phase 3 current composition

```text
src/modules/health/client/api.ts
  -> src/lib/http/client.ts
  -> GET /api/v1/health
  -> src/lib/http/server.ts
  -> src/modules/health/server/queries.ts
```

The shared response contract is:

```text
Success: { data, meta }
Error:   { error: { code, message, fieldErrors? } }
```

This phase does not migrate products, inventory, auth, checkout, payments, orders or UI. The
existing `/api/health` endpoint and legacy admin inventory endpoints remain until their consumers
move in the approved later phases.

## Phase 3 acceptance gate

Required before Phase 3 may be declared complete:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
```

Also required:

- the authored HTTP and Route Handler tests execute successfully;
- `/api/v1/health` returns the typed success envelope at runtime;
- expected, validation and unexpected failures return stable sanitized errors;
- browser code remains unable to import server module or persistence infrastructure;
- existing API and public route compatibility remains intact;
- Phase 1 and Phase 2 validation debt remains reported honestly while unresolved.

A queued runner, unavailable check, unexecuted test or public-deployment-only result must remain
reported as blocked rather than passing.

## Decision safeguards

- No phase intentionally redesigns the UI.
- Route Handlers do not call Server Actions.
- Server Components do not call internal APIs for their own reads.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- URL owns navigable filters, sorting, pagination and search.
- Zustand is limited to browser-owned shared state.
- Storefront and admin share domains, not unrestricted actions.

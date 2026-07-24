# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Current branch:** `refactor/phase-1-architecture-guards`  
**Current phase:** Phase 1 — Establish architecture rules and language  
**Overall status:** In progress

Status values: `Not started`, `In progress`, `Blocked`, `Complete`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules and language | In progress | Guards pass with documented exceptions |
| 2 | Consolidate layouts and provider scope | Not started | Route and visual parity |
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

## Phase 1 tasks

| ID | Task | Status | Evidence |
| --- | --- | --- | --- |
| P1-T01 | Add product, inventory, catalogue, storefront, and admin language contract | Complete | `.agents/doctrine/architecture.md` and `conventions.md` |
| P1-T02 | Mark `features/**` as legacy for new code | Complete | Doctrine plus new-file architecture guard |
| P1-T03 | Mark top-level `server/**` as legacy for new business modules | Complete | Doctrine plus new-file architecture guard |
| P1-T04 | Add import-boundary rules | Complete | Architecture guard indexes imports and local module targets |
| P1-T05 | Prevent production imports from fixture directories | Complete | Guard scans production `src/**` imports |
| P1-T06 | Prevent Client Components from importing Prisma or server modules | Complete | Guard scans all Client Components |
| P1-T07 | Prevent TanStack hooks from importing `"use server"` modules | Complete | Guard resolves Server Action modules; one exact Phase 4 exception documented |
| P1-T08 | Prevent Route Handlers from importing Server Actions | Complete | Guard resolves route-handler imports with no allowlist |
| P1-T09 | Prevent mixed `catalog` and `catalogue` spelling | Complete | Changed files may not increase American-spelled catalogue debt |
| P1-T10 | Add migration-status document listing every domain | Complete | `phase-1-domain-status.md` |

## Phase 1 exact legacy exception

```text
src/features/admin/inventory/inventory-mutations.ts
  -> src/features/admin/inventory/inventory-actions.ts
Removal: Phase 4
```

The exception is machine-readable and stale-exception checked. No exception exists for Route
Handlers importing Server Actions, Client Components importing server/Prisma code, fixture
imports, or new runtime modules under legacy folders.

## Phase 1 acceptance gate

Implementation is present, but the phase remains **in progress** until these run against a secure
repository checkout:

```bash
pnpm check:architecture
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Local syntax validation and a synthetic guard fixture can validate the guard implementation, but
they do not replace repository-level checks.

If a guard blocks valid Next.js behaviour rather than an architecture defect, narrow the guard
and record the reason. Do not bypass it with a broad allowlist.

## Phase 1 explicit exclusions

Phase 1 does not:

- create or migrate runtime domain modules;
- move storefront routes or layouts;
- relocate QueryProvider;
- replace AdminStore or in-memory repositories;
- replace Server Actions with API routes;
- introduce Zustand;
- consolidate authentication;
- change checkout/payment authority;
- alter visible UI.

## Decision safeguards

- No phase intentionally redesigns the UI.
- Route Handlers do not call Server Actions.
- Server Components do not call internal APIs for their own reads.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- URL owns navigable filters, sorting, pagination, and search.
- Zustand is limited to browser-owned shared state.
- Storefront and admin share domains, not unrestricted actions.
- A later phase may not begin until the current acceptance gate passes.

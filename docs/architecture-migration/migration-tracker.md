# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Current branch:** `refactor/phase-1-architecture-guards`  
**Current phase:** Phase 1 — Establish architecture rules, language, and permanent validation  
**Overall status:** In progress

Status values: `Not started`, `In progress`, `Blocked`, `Complete`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language, and permanent validation | In progress | Guards and private validation pass with documented exceptions |
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
| P1-T11 | Add one permanent local command surface for Biome, TypeScript, tests, React Doctor, database, build, and Playwright | Complete | `package.json`, `run-gates.mjs`, and `run-local-verification.mjs` |
| P1-T12 | Remove paid hosted-runner dependence without exposing private source | Complete | Configurable `laitstyles-ci` self-hosted workflows plus public-deployment-only fallback contract |
| P1-T13 | Restore executable evidence, rerun, and deterministic repair feedback | Complete | Functional `task-progress.yml`, manifests, artifacts, PR commands, and Biome patch mode |

P1-T11 through P1-T13 were added by direct user instruction on July 24, 2026. They extend Phase 1
validation infrastructure only; they do not authorize Phase 2 runtime architecture changes.

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

Implementation is present, but the phase remains **in progress** until a trusted `laitstyles-ci`
runner is registered and the private source suites execute successfully:

```bash
pnpm validate
pnpm validate:full
pnpm validate:browser
```

The equivalent PR workflows must produce the required `static`, `tests`, `database`, `build`,
`browser-preflight`, and three Playwright project manifests. React Doctor warnings touching changed
scope must be resolved even though the legacy-wide scan remains advisory.

The public deployment workflow confirms availability and visual/browser smoke only. It does not
replace private architecture, Biome, TypeScript, test, Prisma, build, React Doctor, or source-backed
Playwright evidence.

If a guard blocks valid Next.js behaviour rather than an architecture defect, narrow the guard and
record the reason. Do not bypass it with a broad allowlist.

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

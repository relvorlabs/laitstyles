# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Current phase:** Phase 0 — Freeze and record current behaviour  
**Overall status:** Complete  
**Phase 0 score:** 10/10 evidence checklist

Status values: `Not started`, `In progress`, `Blocked`, `Complete`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules and language | Not started | Guards pass with documented exceptions |
| 2 | Consolidate layouts and provider scope | Not started | Route and visual parity |
| 3 | Create HTTP and domain-module foundation | Not started | Typed transport contract proven |
| 4 | Cut over products and inventory | Not started | Prisma-backed parity |
| 5 | Remove remaining admin dummy domains | Not started | No runtime in-memory business data |
| 6 | Split storefront state and add Zustand | Not started | State ownership and UI parity |
| 7 | Consolidate authentication | Not started | Auth flow parity |
| 8 | Make checkout and payment server-authoritative | Not started | Idempotent settlement |
| 9 | Delete legacy architecture | Not started | No legacy imports |
| 10 | Final validation and release readiness | Not started | Full gates and visual parity |

## Phase 0 tasks

| ID | Task | Status | Evidence or recorded limitation |
| --- | --- | --- | --- |
| P0-T01 | Record current default-branch commit SHA | Complete | `6f5087f4aa08a5d9bce5989bad7b230344cdb493` |
| P0-T02 | Record storefront, auth, account, API, and admin routes | Complete | Source baseline plus machine-generated runtime manifests |
| P0-T03 | Capture desktop screenshots for primary routes | Complete | Homepage, product interaction, and admin access boundary captured |
| P0-T04 | Capture tablet and mobile screenshots | Complete | `768x1024` and `375x812` projects captured |
| P0-T05 | Capture light and dark theme screenshots | Complete | Full-page and viewport captures for all projects |
| P0-T06 | Record header, footer, homepage, catalogue, cards, and PDP behaviour | Complete | Preservation contract, screenshots, link inventory, and product interaction evidence |
| P0-T07 | Record cart, saved-item, modal, drawer, and checkout interaction ownership | Complete | Source ownership map plus current product quick-view runtime behaviour |
| P0-T08 | Record admin table, form, inventory, navigation, and access boundaries | Complete | Source composition mapped; unauthenticated redirects captured; credentials intentionally excluded from public runner |
| P0-T09 | Add and execute Playwright characterization tests | Complete | 15/15 passing in external runner run `30099471635` |
| P0-T10 | Create production dummy-data inventory | Complete | Exact seed and in-memory ownership chains recorded |
| P0-T11 | Map every migration-relevant provider, store, query cache, and context | Complete | `phase-0-source-inventory.md` |
| P0-T12 | Map production imports from fixture or in-memory modules | Complete | Admin layout -> seed -> AdminStore -> in-memory repository chain recorded |
| P0-T13 | Preserve downloadable Playwright evidence | Complete | Artifact `8599046423`, digest recorded, expiry `2026-08-23` |
| P0-T14 | Record runtime console, page, and request failures | Complete | Zero homepage errors or failed requests across six theme/viewport runs |
| P0-T15 | Record deployment/source route discrepancies | Complete | Twelve deployment 404s recorded without guessing the cause |

## Phase 0 runtime evidence

```text
Runner repository: relvorlabs/agent-controller
Workflow run: 30099471635
Target: https://laitstyles.vercel.app/
Playwright: 1.61.1
Result: 15 passed, 0 failed, 0 skipped, 0 errors
Artifact: laitstyles-phase0-playwright-30099471635
Artifact ID: 8599046423
Digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
```

## Recorded limitations, not hidden passes

- The public deployment cannot be cryptographically tied to baseline commit `6f5087f4`; route differences are recorded for fresh-deployment verification.
- Authenticated admin mutations were not run because credentials were not placed in a public runner.
- Lint, TypeScript, unit tests, build, Prisma validation, architecture guards, and React Doctor were not run by the external browser runner. PR #37 changes documentation only; all source-level gates remain mandatory from Phase 1 onward.

These limitations do not leave Phase 0 tasks open because the required behaviour and environment boundaries are now explicitly characterized. They must not be converted into implied passes in later phases.

## Decision safeguards

- No phase may intentionally redesign the UI.
- No phase may call a Server Action from a Route Handler.
- Server Components must not call internal APIs for their own reads.
- Client remote state uses typed API clients and TanStack Query.
- Prisma remains the persistent source of truth.
- URL owns filters, sort, pagination, search, and other navigable state.
- Zustand is limited to browser-owned shared state.
- Storefront and admin share domains, not unrestricted actions.
- A phase is not complete without its acceptance gate.

## Next phase

Phase 1 may begin only after PR #37 is reviewed and accepted.

Phase 1 must:

1. update repository doctrine to the approved domain-module architecture;
2. add or update architecture guards without breaking the current tree prematurely;
3. record temporary exceptions for legacy paths that later phases will remove;
4. preserve the Phase 0 screenshot and runtime contract;
5. rerun the relevant source-level checks on a secure checkout environment.

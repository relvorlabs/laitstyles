# Architecture Migration Tracker

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Current phase:** Phase 0 — Freeze and record current behaviour  
**Overall status:** In progress

Status values: `Not started`, `In progress`, `Blocked`, `Complete`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | In progress | Baseline evidence complete |
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

| ID | Task | Status | Evidence or blocker |
| --- | --- | --- | --- |
| P0-T01 | Record current default-branch commit SHA | Complete | `6f5087f4aa08a5d9bce5989bad7b230344cdb493` |
| P0-T02 | Record storefront, auth, account, API, and admin routes | In progress | Human-reviewed baseline added; mechanical route manifest pending |
| P0-T03 | Capture desktop screenshots for primary routes | Blocked | Requires running application and browser tooling |
| P0-T04 | Capture mobile screenshots for primary routes | Blocked | Requires running application and browser tooling |
| P0-T05 | Capture light and dark theme screenshots | Blocked | Requires running application and browser tooling |
| P0-T06 | Record header, footer, homepage, catalogue, cards, and PDP behaviour | In progress | Preservation matrix documented; screenshots pending |
| P0-T07 | Record cart, saved-item, modal, drawer, and checkout interactions | In progress | Interaction list documented; runtime evidence pending |
| P0-T08 | Record admin table, form, inventory, and navigation behaviour | In progress | Route/surface list documented; runtime evidence pending |
| P0-T09 | Add or confirm Playwright characterization tests | In progress | Existing Playwright setup confirmed; coverage expansion pending |
| P0-T10 | Create production dummy-data inventory | In progress | Major in-memory paths identified; exhaustive import inventory pending |
| P0-T11 | Map every provider, store, query cache, and context | In progress | High-level ownership map added; exhaustive map pending |
| P0-T12 | Map production imports from fixture or in-memory modules | Not started | Requires mechanical source scan |

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

## Next tasks

1. Generate an exhaustive current route manifest from `src/app`.
2. Generate production import inventories for in-memory repositories, fixtures, providers, stores, and TanStack hooks.
3. Run the app and capture the preservation screenshots at configured Playwright viewports.
4. Execute the current validation suite and record pre-existing failures without fixing them in Phase 0.

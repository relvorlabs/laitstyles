# Phase 4 — Storefront client-state consolidation

Tracking: [#21](https://github.com/relvorlabs/laitstyles/issues/21)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: `946002369cb02fa9d969191e48cb7a0e05cf139b`

## State

`planning`

## Objective

Replace the overlapping storefront state providers with one client-state owner for cart, saved products and client-only holds, while preserving the Phase 2 server-owned catalogue and removing the remaining Generation-1 compatibility paths.

## Role chain

`orchestrator → planner → domain-engineer (only for auth-action contracts) → ui-engineer → reviewer`

The fixed role roster in `AGENTS.md` applies. Do not invent nested child-agent roles.

## Scope

- One storefront provider owning minimal `{cart, saved, holds}` ID/quantity records.
- One state source for `/cart`, cart sheet, saved products and holds.
- Overlay state moved to local ownership or a narrow overlay context.
- Sign-in dialog submits the canonical Phase 1 Server Actions.
- Remove client identity mirrors that can disagree with the server session.
- Delete `ShopProvider`, `StorefrontExperienceProvider`, `src/lib/catalogue.ts`, `src/lib/order.ts` and other compatibility code only after consumers are migrated.
- Group storefront routes under `(storefront)` without changing public URLs when safe.
- Explicit migration/reset behaviour for existing local/session storage keys.

## Exclusions

- No admin inventory persistence; Phase 3 owns it.
- No real checkout/payment implementation.
- No database-backed reservation semantics.
- No new global state dependency without demonstrated need.
- No visual redesign or public route changes.
- No canonical product-contract change without Phase 3/#19 coordination.

## Ownership

Primary:

- `src/features/storefront/shared/**`
- `src/features/storefront/shell/**`
- cart/saved/hold consumers under `src/features/storefront/**`
- storefront client portions of `src/app/**`
- compatibility provider/modules being retired
- storefront state and browser tests

Shared contracts requiring #19 coordination:

- auth action result/error states;
- canonical product identifiers and availability;
- account compatibility dependencies owned later by Phase 6.

## Required evidence

- Provider/state unit tests.
- Storage migration/reset tests.
- Browser flows at mobile and desktop widths for cart, auth dialog and navigation.
- Proof that admin/auth routes do not mount storefront providers.
- Proof that no full catalogue crosses a global client boundary.
- `pnpm` lint/typecheck/test/build results.
- Reviewer completion report.

## Completion criteria

- Exactly one provider owns cart/saved/holds.
- Cart page, header sheet and product actions agree.
- No live import of retired providers or compatibility modules remains.
- Storefront auth uses the canonical server path.
- Public URLs and Phase 2 catalogue authority remain unchanged.
- Reviewer gate passes or blockers are reported honestly.

## Progress ledger

```text
State: planning
Completed: phase charter created
Current: map provider consumers, storage keys and route-group implications
Blocked by: none for planning; auth result changes coordinate with Phase 5
Contracts changed: none
Validation evidence: none
Next handoff: planner → domain contract if needed → UI
```

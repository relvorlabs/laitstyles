# Phase 3 — Product management Prisma cutover

Tracking: [#20](https://github.com/relvorlabs/laitstyles/issues/20)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: `946002369cb02fa9d969191e48cb7a0e05cf139b`

## State

`planning`

## Objective

Replace only the admin Inventory product read/write path with real, capability-gated Prisma operations. The completed path must prove that an authorized admin edit is visible on the canonical storefront after shared-cache invalidation.

## Role chain

`orchestrator → planner → data-engineer (only when schema work is proven) → domain-engineer → ui-engineer → reviewer`

The fixed role roster in `AGENTS.md` applies. Do not invent nested child-agent roles. A subtask is handed to the existing role that owns its files.

## Scope

- Prisma-backed inventory list/detail reads.
- Create, update, archive, restore and delete operations used by the existing Inventory UI.
- `unique`, `stocked` and `variant` inventory semantics.
- Canonical Phase 1 staff-session capability checks at every server write.
- Transactional writes with audit events.
- `catalogue` and affected `product-${slug}` cache invalidation.
- Existing TanStack Query cache/invalidation seam, once backed by real server data.
- Inventory-only retirement of the in-memory repository/store mutation path.
- Playwright journey: admin edit → storefront reflects the edit.

## Exclusions

- Other admin domains remain in-memory until Phase 7.
- No provider/state consolidation; Phase 4 owns it.
- No UI redesign.
- No payment/checkout implementation.
- No destructive delete-all production operation without a separate approval.
- No silent deletion/recreation of variants that have historical references.

## Ownership

Primary:

- `src/server/commerce/catalogue/**`
- `src/server/commerce/inventory/**` when justified
- inventory Server Actions/transports
- `src/features/admin/inventory/**`
- inventory-specific code under `src/lib/admin/inventory/**` during cutover
- targeted Prisma migrations, tests and acceptance scripts

Shared contracts must be announced in #19 before changing:

- canonical product DTOs/cache tags;
- `src/lib/errors/**` / Result types;
- global admin repository provider;
- auth/session contracts.

## Required evidence

- Focused mapper/service/action/repository tests.
- Capability-denial tests.
- Tests for all three inventory models.
- `pnpm` lint/typecheck/test/build results.
- Browser evidence for persisted reload and storefront visibility.
- Reviewer diff report and remaining-risk statement.

## Completion criteria

- Inventory reads and mutations no longer succeed against browser memory.
- Persisted changes survive reload.
- Every mutation performs server-side authorization.
- Writes are transactional and audited.
- Storefront cache invalidation is demonstrated.
- Unrelated admin domains are untouched.
- Reviewer gate passes or blockers are reported honestly.

## Progress ledger

```text
State: planning
Completed: phase charter created
Current: reconcile the existing inventory cutover plan with Phase 1/2 code
Blocked by: none
Contracts changed: none
Validation evidence: none
Next handoff: planner → data/domain ownership map
```

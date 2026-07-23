# Phase 3 — Product management Prisma cutover

Tracking: [#20](https://github.com/relvorlabs/laitstyles/issues/20)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: `946002369cb02fa9d969191e48cb7a0e05cf139b`

## State

`review-fixes-applied — executable validation blocked`

Phase 3 is not complete, not rated 10/10 and not merge-ready. Source implementation and reviewer corrections are present on PR #24, but no current branch command has executed in CI because every GitHub Actions job fails before checkout.

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
- Intake stage transitions remain read-only until their own persistent workflow cutover.
- No provider/state consolidation; Phase 4 owns it.
- No UI redesign.
- No payment/checkout implementation.
- No destructive delete-all production operation without separate approval.
- No silent deletion/recreation of variants that have historical references.
- No claim that local preview/blob media is persisted; product saves require durable HTTP(S) media.

## Ownership

Primary:

- `src/server/commerce/catalogue/**`
- `src/server/commerce/inventory/**` when justified
- inventory Server Actions/transports
- `src/features/admin/inventory/**`
- inventory-specific code under `src/lib/admin/inventory/**` during cutover
- targeted Prisma migrations, tests and acceptance scripts

Shared contracts announced through #19:

- canonical unique-product condition labels now round-trip as database text instead of a lossy three-value union;
- Inventory mutation hooks are feature-owned under `src/features/admin/inventory/`;
- the canonical Phase 1 auth/session contract is unchanged;
- the global repository provider changes only the Inventory repository implementation.

## Implemented source path

- Inventory page and client repository read products, taxonomy and stock movements from authenticated, private/no-store endpoints.
- Product create/update writes use serializable Prisma transactions, capability checks, audit events and database-generated IDs.
- Archive, restore and permanent delete use server services; destructive dependency guards are evaluated inside the delete transaction.
- Taxonomy create/rename/delete persists to Prisma; usage checks occur inside the delete transaction.
- Stock balances preserve separate Prisma `reserved` and `committed` values while exposing protected units safely to the legacy editor DTO.
- Inventory-mode changes are rejected after stock or operational history exists, both optimistically and against the transactional row.
- Variant removal is blocked when hold, order or movement history exists.
- Condition labels such as `Very good` round-trip without being coerced to `Good`.
- Relative/blob media is rejected before a database transaction; durable HTTP(S) URLs are required.
- Product and taxonomy actions invalidate the shared `catalogue` tag and affected old/new `product-${slug}` tags.
- Inventory intake stage transitions no longer mutate browser memory; intake products remain editable as persistent catalogue records.
- Inventory detail no longer presents seeded Orders, Holds, Reviews or Activity as real history for Prisma products.
- The obsolete `src/lib/admin/inventory/inventory-mutations.ts` browser-store path is deleted.

## Reviewer defects corrected

1. Two corrupted uploaded source blobs were repaired.
2. Imported condition labels were being silently downgraded.
3. A stocked/unique product could be converted to variants while discarding recorded stock/history.
4. Product and taxonomy dependency checks had read-before-delete race windows.
5. Relative media could be written as though it were durable.
6. Intake still exposed a browser-memory mutation through Inventory.
7. Inventory detail mixed real products with unrelated seeded operational records.
8. A temporary compatibility module introduced a forbidden `lib → features` dependency; hooks are now feature-owned and the module is deleted.
9. Malformed Inventory UUIDs reached Prisma; reads now reject them before querying.

## Required evidence

- Focused mapper/service/action/repository tests.
- Capability-denial tests.
- Tests for all three inventory models.
- `pnpm` lint/typecheck/test/build results.
- Browser evidence for persisted reload and storefront visibility.
- Reviewer diff report and remaining-risk statement.

## Validation status

Not yet executable on the current head:

- [ ] focused Vitest tests
- [ ] Prisma validation
- [ ] Biome/lint
- [ ] TypeScript typecheck
- [ ] full Vitest suite
- [ ] production build
- [ ] authenticated persisted-reload journey
- [ ] admin-edit-to-storefront visibility journey

GitHub Actions evidence on the current head shows Admin, parity and Playwright runs all failing before their first step. The Admin job reports `steps: null` and no job log. The same zero-step failure is present on the Phase 2 base, so it is not attributed to Phase 3 source, but it still prevents a completion verdict.

## Completion criteria

- Inventory reads and mutations no longer succeed against browser memory.
- Persisted changes survive reload.
- Every mutation performs server-side authorization.
- Writes are transactional and audited.
- Storefront cache invalidation is demonstrated in a real journey.
- Unrelated admin domains remain on their declared boundary.
- All executable validation and browser gates pass.
- Reviewer marks the phase complete only after fresh evidence.

## Progress ledger

```text
State: review-fixes-applied — executable validation blocked
Completed: Prisma Inventory source path, reviewer defect corrections, focused regression tests authored
Current: waiting for an executable repository validation path
Blocked by: GitHub Actions jobs terminate before checkout with no steps/logs; no authenticated local checkout is available in this session
Contracts changed: condition labels are lossless strings; Inventory mutation hooks are feature-owned
Validation evidence: static diff/schema/doctrine review only on the current head; no current tests/build/browser run
Next handoff: reviewer reruns pnpm verify + focused tests + authenticated Playwright acceptance, then either fixes failures or approves merge
```

# Phase 3 — Product management Prisma cutover recovery

## State

`recovery-planning — not complete, not merge-ready`

## Reconciled source of truth

This recovery combines, without guessing:

1. `AGENTS.md` and `.agents/**` on current `main`.
2. The Claude architecture recovery plan: Phase 3 is the Inventory product-management Prisma pilot.
3. Closed Codex PR #24 and its charter at `7cdf2a996cf6b41adcc5c3b5ca62cc676db5bf4a`.
4. The exact Phase 3-only source range:
   `946002369cb02fa9d969191e48cb7a0e05cf139b..7cdf2a996cf6b41adcc5c3b5ca62cc676db5bf4a`.
5. Current `main` after the corrected Phase 2 merge:
   `3d643cb367801c049298eb90f7992f0df727e240`.

The old Phase 3 branch is 79 commits behind current `main` and contains an obsolete/rejected Phase 2 base. It must not be merged, rebased wholesale or treated as completed. Only the isolated Phase 3 Inventory delta may be recovered and reconciled against current contracts.

## Objective

Replace only the admin Inventory product read/write path with real, capability-gated Prisma operations. Completion is proven when an authorized admin edit persists across reload, invalidates the canonical catalogue cache, and is visible on the storefront through Playwright.

## Non-negotiable visual boundary

Preserve the existing:

- header and footer;
- homepage composition;
- product cards;
- catalogue layout;
- product-detail page;
- typography and spacing;
- responsive behaviour.

Phase 3 may connect the existing Inventory UI to real data, but it may not redesign storefront or admin presentation.

## In scope

- Prisma-backed Inventory product, taxonomy and stock-movement reads.
- Create, update, archive, restore and guarded permanent delete used by the existing Inventory UI.
- All three inventory modes: `unique`, `stocked`, `variant`.
- Canonical staff capability checks at every server mutation.
- Serializable/transactional writes, audit events and concurrency-safe destructive guards.
- `catalogue` and affected old/new `product-${slug}` cache invalidation.
- Existing TanStack Inventory query/mutation seam backed by real server data.
- Inventory-only retirement of browser-memory product mutations.
- Focused domain/action/adapter tests.
- Playwright journeys for persisted reload and admin-edit-to-storefront visibility.

## Explicit exclusions

- No storefront provider/state consolidation.
- No changes to header, footer, homepage, product cards, catalogue presentation or PDP presentation.
- No unrelated admin-domain persistence.
- No intake-stage mutation cutover.
- No payment/checkout work.
- No new state library.
- No broad shared-error rewrite.
- No auth/session contract changes.
- No schema migration unless a concrete current-main mismatch proves one is required.
- No local/blob media presented as durable persistence.
- No destructive delete-all operation.

## Role sequence

`orchestrator → planner → data-engineer only if proven necessary → domain-engineer → ui-engineer → reviewer`

The recovery will first port pure server/domain files and tests, then reconcile existing UI and query seams against current `main`. Modified shared files are merged manually; obsolete Phase 2/storefront blobs from PR #24 are never copied.

## Validation policy

All repository commands run in GitHub Actions. GPT terminals and local shell are not an acceptance path.

Required gates:

- focused Phase 3 Vitest tests;
- Prisma validation;
- strict button audit;
- Biome/lint;
- TypeScript;
- full Vitest suite;
- production build;
- React Doctor changed-scope review;
- authenticated persisted-reload Playwright journey;
- admin-edit-to-storefront Playwright journey;
- protected storefront diff/parity review;
- console/network error inspection for the changed journeys.

No gate is reported as passing unless the corresponding GitHub Actions job actually executes and supplies evidence.

## Completion criteria

- Inventory reads and mutations no longer succeed through browser memory.
- Persisted product/taxonomy changes survive reload.
- Every mutation authorizes on the server.
- Writes are transactional and audited.
- Inventory-mode and destructive operations preserve stock/history invariants.
- Storefront cache invalidation is proven through Playwright.
- Unrelated domains and protected presentation remain unchanged.
- Every required Actions and reviewer gate passes.

# Phase 1 Legacy Architecture Exceptions

**Status:** Active temporary exceptions  
**Owner:** Architecture migration  
**Rule:** This list may only shrink. New exceptions require an explicit architecture decision.

Phase 1 establishes the target rules without pretending the current tree has already completed
later migration phases. Every exception below is exact, has a reason, and has a scheduled removal
phase.

## Machine-enforced exception

| Edge | Reason | Removal phase |
| --- | --- | --- |
| `src/features/admin/inventory/inventory-mutations.ts` → `src/features/admin/inventory/inventory-actions.ts` | Existing TanStack mutations call a `"use server"` module directly. Replacing the transport belongs to the product/inventory cutover, not the rule-establishment phase. | Phase 4 |

The matching machine-readable entry lives in
`scripts/checks/architecture-legacy-exceptions.mjs`. The architecture guard fails when the edge
disappears but the exception remains, preventing stale allowlists.

## Legacy folder debt

These are migration boundaries, not allowlisted new-code locations:

- `src/features/**` — existing composition remains until domain consumers move; new production
  modules are blocked.
- top-level `src/server/**` and `src/server/commerce/**` — existing business code remains until
  its owning domain migrates; new production business modules are blocked.
- existing `catalog*` filenames and identifiers — the guard compares changed files with the base
  revision and rejects any increase in American-spelled catalogue debt.

## Explicitly not excepted

There is no exception for:

- Client Components importing Prisma, top-level server modules, or
  `modules/*/server/**`;
- production source importing test, story, development, or seed fixtures;
- Route Handlers importing Server Actions;
- new business modules under `src/features/**`;
- new business modules under top-level `src/server/**`.

## Removal discipline

When a later phase removes an exception:

1. remove the legacy edge or path;
2. remove the machine-readable exception in the same change;
3. update the domain migration status;
4. run `pnpm check:architecture`;
5. keep UI and runtime behaviour within the Phase 0 preservation baseline.

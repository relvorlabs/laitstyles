# Foundation Task 3 bounded guard report

## Scope and override

This commit contains the bounded module-export and architecture parser/classifier slice of
Foundation Task 3. The explicit owner override authorizes reviewer-owned guard and boundary-test
edits despite the reviewer role normally being verification-only. The user also authorized work
to continue while WS0 remains pending. Existing edits in `scripts/ci/collect-context.mjs`,
`scripts/ci/lib.mjs`, `.superpowers/sdd/progress.md`, `ci-evidence/**`, and concurrent UI source
were not edited or staged by this task.

The orchestrator directed this slice to be committed once the module and architecture
characterization was green rather than allowing the three specialized fail-closed contract
refactors to stall the major blocker. Therefore this report does not claim full Task 3 or WS1
acceptance.

## Implemented

- Replaced regex-only module scanning with exported, dependency-free parsing and a pure
  `classifyModuleGraph` contract.
- Filtered external package specifiers before internal resolution.
- Added alias/relative resolution for TypeScript, JavaScript, ESM, CommonJS and CSS modules.
- Classified multiline default, named, type, named re-export, star re-export and dynamic import
  syntax without treating comments or fixture strings as executable imports.
- Replaced architecture text matching with exported `classifyArchitectureGraph` analysis.
- Classified alias/relative fixture imports, client/server edges, direct and re-exported Server
  Actions, TanStack-to-Action coupling, Route Handler-to-Action coupling, and executable Server
  Component internal API calls.
- Compared American `catalog` identifiers only against the deterministic changed-file range,
  excluding external package specifiers and unchanged database identifiers.
- Limited legacy target-ownership checks to newly introduced imports so supported, unchanged
  migration edges are not mislabeled as new violations.
- Kept CLI execution behind exact `pathToFileURL(process.argv[1])` entry-point guards.

## TDD evidence

RED, Node 25.9.0 / Vitest 4.1.10:

`node node_modules/vitest/vitest.mjs run src/lib/boundaries/app-provider-boundary.test.ts src/lib/boundaries/server-client-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts src/modules/admin-persistence-boundary.test.ts src/modules/products/product-module-boundaries.test.ts scripts/checks/storefront-server-boundary.test.ts --reporter=verbose`

- Exit 1 as expected.
- Guard modules executed their CLIs during import and called `process.exit(1)`.
- The pure classifier exports did not exist.

GREEN focused characterization:

- Products module/export boundary: 6/6 tests passed, including both new module classifier cases.
- Architecture characterization: 4/4 targeted cases passed; 13 unrelated cases were skipped by
  the test-name filter.
- Architecture CLI: exit 0, 735 source files, 3 Server Action modules, 0 errors, 0 warnings.

## Exact counts

| Guard | Before | After | Result |
| --- | ---: | ---: | --- |
| Module export | 746 | 37 | Required gate still blocked |
| External package false positives | 655 | 0 | Removed |
| Architecture | 59 | 0 | Pass |

The earlier handoff inventory was 749/655/94. The shared tree had changed by the time this task
captured its exact Node 25 baseline, which was 746/655/91. Both figures are recorded rather than
silently conflated.

## Blockers and handoffs

The 37 remaining module-export diagnostics are not repaired in this reviewer-owned slice:

- Phase 6 UI compatibility: missing storefront overlay modules, missing
  `storefront-client-state`, and missing `useStorefrontOverlay` export.
- Domain source: `src/lib/admin/orders/orders-query-options.ts` still imports the deleted admin
  repository boundary; `product-catalogue.tsx` imports missing `CatalogueFilterType`.
- Legacy tests: multiple tests import deleted catalogue, inventory, order, seed, selector and
  storefront-state modules.
- Guard follow-up: Prisma's generated `client.js` uses CommonJS
  `module.exports = { ...require('.') }`; exact CommonJS re-export traversal remains to be added.

The complete focused suite also exposes pre-existing source-owned failures in the admin
persistence and storefront-state boundary cases, including the missing Phase 6 state contract.

Deferred Task 3 work:

- `error-validation-contract.mjs`, `layout-provider-contract.mjs`, and
  `http-module-contract.mjs` still need exported pure checks, entry-point guards, and explicit
  fail-closed characterization.
- `pnpm check:architecture` cannot pass until the 37 module diagnostics and specialized contract
  blockers are resolved.
- `pnpm typecheck` and full validation were not rerun for this bounded slice. The orchestrator
  reports the current compile blocker as the missing Phase 6 storefront overlay-events runtime
  module.

No WS0 or WS1 acceptance is claimed.

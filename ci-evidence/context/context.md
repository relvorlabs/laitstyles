# CI implementation context

- Range: `origin/main...HEAD`
- Changed files: 30
- Loaded skill manifests: 0
- Patch bytes retained: 300030

## Changed files
- `.superpowers/sdd/task-3-report.md`
- `docs/architecture-migration/phase-1-6-full-acceptance.md`
- `docs/architecture-migration/phase-1-legacy-exceptions.md`
- `docs/superpowers/plans/2026-07-26-phase-1-3-foundation-remediation.md`
- `docs/superpowers/plans/2026-07-26-phase-1-6-full-acceptance-index.md`
- `docs/superpowers/plans/2026-07-26-phase-4-5-persistence-remediation.md`
- `docs/superpowers/plans/2026-07-26-phase-6-browser-certification.md`
- `docs/superpowers/specs/2026-07-26-phase-1-6-full-acceptance-design.md`
- `scripts/checks/architecture-guard.mjs`
- `scripts/checks/architecture-legacy-exceptions.mjs`
- `scripts/checks/error-validation-contract.mjs`
- `scripts/checks/layout-provider-contract.mjs`
- `scripts/checks/module-export-guard.mjs`
- `scripts/checks/storefront-server-boundary.test.ts`
- `scripts/ci/collect-context.mjs`
- `scripts/ci/lib.mjs`
- `src/features/storefront/account/orders/order-state-copy.test.ts`
- `src/features/storefront/shared/add-to-bag-label.test.ts`
- `src/features/storefront/shared/cart-lines.test.ts`
- `src/features/storefront/shared/storefront-auth-provider.tsx`
- `src/features/storefront/shared/storefront-client-state-persistence.test.ts`
- `src/features/storefront/shared/storefront-client-state.test.ts`
- `src/features/storefront/shared/storefront-overlay-events.test.ts`
- `src/features/storefront/shared/storefront-overlays.tsx`
- `src/lib/boundaries/server-client-boundary.test.ts`
- `src/lib/boundaries/storefront-state-boundary.test.ts`
- `src/modules/admin-persistence-boundary.test.ts`
- `src/modules/products/client/use-catalogue-navigation.ts`
- `src/modules/products/product-module-boundaries.test.ts`
- `src/stores/storefront-ui.store.ts`

## Diff stat
```text
.superpowers/sdd/task-3-report.md                  |  91 +++
 .../phase-1-6-full-acceptance.md                   |  78 ++
 .../phase-1-legacy-exceptions.md                   | 102 ++-
 .../2026-07-26-phase-1-3-foundation-remediation.md | 868 +++++++++++++++++++++
 .../2026-07-26-phase-1-6-full-acceptance-index.md  | 171 ++++
 ...2026-07-26-phase-4-5-persistence-remediation.md | 743 ++++++++++++++++++
 .../2026-07-26-phase-6-browser-certification.md    | 433 ++++++++++
 .../2026-07-26-phase-1-6-full-acceptance-design.md | 511 ++++++++++++
 scripts/checks/architecture-guard.mjs              | 362 ++++-----
 scripts/checks/architecture-legacy-exceptions.mjs  | 154 +++-
 scripts/checks/error-validation-contract.mjs       |  42 +-
 scripts/checks/layout-provider-contract.mjs        |   1 +
 scripts/checks/module-export-guard.mjs             | 380 +++++----
 scripts/checks/storefront-server-boundary.test.ts  |  20 +
 scripts/ci/collect-context.mjs                     |  32 +-
 scripts/ci/lib.mjs                                 |   7 +-
 .../account/orders/order-state-copy.test.ts        |   7 +-
 .../storefront/shared/add-to-bag-label.test.ts     |   2 +-
 src/features/storefront/shared/cart-lines.test.ts  |   2 +-
 .../storefront/shared/storefront-auth-provider.tsx |   7 +-
 .../storefront-client-state-persistence.test.ts    |   2 +-
 .../shared/storefront-client-state.test.ts         |   2 +-
 .../shared/storefront-overlay-events.test.ts       |   4 +-
 .../storefront/shared/storefront-overlays.tsx      |  56 +-
 src/lib/boundaries/server-client-boundary.test.ts  | 109 ++-
 .../boundaries/storefront-state-boundary.test.ts   |  24 +-
 src/modules/admin-persistence-boundary.test.ts     |  24 +
 .../products/client/use-catalogue-navigation.ts    |  36 +-
 .../products/product-module-boundaries.test.ts     | 104 ++-
 src/stores/storefront-ui.store.ts                  |   2 +-
 30 files changed, 3841 insertions(+), 535 deletions(-)
```

## Commits
```text
5f083ed (HEAD -> codex/phase-1-6-full-acceptance) test(architecture): align validation guards with modules
22264df fix(storefront): migrate legacy client imports
deb7cd3 test(architecture): harden foundation guards
6655c30 test(architecture): bound deferred compatibility edges
b29858d chore(ci): capture exact-head acceptance provenance
9f48bf2 (main) docs(architecture): plan phase 1-6 full acceptance
9da5a60 docs(architecture): define phase 1-6 full acceptance
```

# CI implementation context

- Range: `origin/main...HEAD`
- Changed files: 182
- Loaded skill manifests: 0
- Patch bytes retained: 300031

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
- `src/app/(storefront)/cart/page.tsx`
- `src/app/(storefront)/collections/[slug]/page.tsx`
- `src/app/admin/inventory/page.tsx`
- `src/app/admin/returns/page.tsx`
- `src/app/api/v1/admin/holds/route.test.ts`
- `src/app/api/v1/admin/inventory/route.test.ts`
- `src/app/api/v1/admin/orders/offline-sales/route.test.ts`
- `src/app/api/v1/admin/products/[id]/archive/route.ts`
- `src/app/api/v1/admin/products/[id]/restore/route.ts`
- `src/app/api/v1/admin/products/route.test.ts`
- `src/app/api/v1/admin/products/taxonomy/[id]/route.ts`
- `src/features/admin/customers/customers-url.test.ts`
- `src/features/admin/customers/customers-url.ts`
- `src/features/admin/customers/customers-workspace.tsx`
- `src/features/admin/data/admin-domain-keys.test.ts`
- `src/features/admin/holds/hold-conversion-dialog.tsx`
- `src/features/admin/holds/holds-url.test.ts`
- `src/features/admin/holds/holds-workspace.tsx`
- `src/features/admin/inventory/inventory-workspace.tsx`
- `src/features/admin/orders/order-selectors.ts`
- `src/features/admin/orders/order-timeline.tsx`
- `src/features/admin/orders/orders-url.test.ts`
- `src/features/admin/orders/orders-workspace.tsx`
- `src/features/admin/overview/open-orders-preview.tsx`
- `src/features/admin/product-editor/product-editor-dialog.tsx`
- `src/features/admin/record-sale/record-sale-controller.tsx`
- `src/features/admin/record-sale/record-sale-customer-step.tsx`
- `src/features/admin/record-sale/record-sale-dialog.tsx`
- `src/features/admin/record-sale/record-sale-payment-step.tsx`
- `src/features/admin/record-sale/record-sale-types.ts`
- `src/features/admin/returns/create-return-dialog.tsx`
- `src/features/admin/returns/returns-url.test.ts`
- `src/features/admin/returns/returns-workspace.tsx`
- `src/features/admin/settings/settings-workspace.tsx`
- `src/features/admin/shared/admin-pagination.tsx`
- `src/features/admin/shell/admin-shell.tsx`
- `src/features/storefront/account/orders/order-state-copy.test.ts`
- `src/features/storefront/account/sections/overview-section.tsx`
- `src/features/storefront/checkout/checkout-flow-v2.tsx`
- `src/features/storefront/home/sections/category-section.tsx`
- `src/features/storefront/home/sections/hero-section.tsx`
- `src/features/storefront/home/sections/one-of-one-section.tsx`
- `src/features/storefront/home/sections/recently-viewed-section.tsx`
- `src/features/storefront/home/sections/trust-section.tsx`
- `src/features/storefront/home/storefront-home.tsx`
- `src/features/storefront/shared/add-to-bag-label.test.ts`
- `src/features/storefront/shared/cart-lines.test.ts`
- `src/features/storefront/shared/storefront-auth-dialog-host.tsx`
- `src/features/storefront/shared/storefront-auth-provider.tsx`
- `src/features/storefront/shared/storefront-client-state-persistence.test.ts`
- `src/features/storefront/shared/storefront-client-state.test.ts`
- `src/features/storefront/shared/storefront-overlay-events.test.ts`
- `src/features/storefront/shared/storefront-overlays.tsx`
- `src/lib/admin/customers/customer-products.ts`
- `src/lib/admin/customers/customer-selectors.test.ts`
- `src/lib/admin/inventory/inventory-types.ts`
- `src/lib/admin/orders/orders-query-options.ts`
- `src/lib/admin/product-editor/product-editor-types.ts`
- `src/lib/boundaries/module-export-guard.test.ts`
- `src/lib/boundaries/server-client-boundary.test.ts`
- `src/lib/boundaries/storefront-state-boundary.test.ts`
- `src/lib/prisma/client.ts`
- `src/lib/query/storefront-query-client.ts`
- `src/modules/admin-persistence-boundary.test.ts`
- `src/modules/cart/cart-restoration.ts`
- `src/modules/customers/client/api.ts`
- `src/modules/customers/schema.ts`
- `src/modules/customers/server/commands.ts`
- `src/modules/customers/server/mappers.ts`
- `src/modules/customers/server/queries.ts`
- `src/modules/holds/client/api.ts`
- `src/modules/holds/client/hooks.ts`
- `src/modules/holds/schema.ts`
- `src/modules/holds/server/api-errors.ts`
- `src/modules/holds/server/commands.test.ts`
- `src/modules/holds/server/commands.ts`
- `src/modules/holds/server/mappers.ts`
- `src/modules/holds/server/queries.ts`
- `src/modules/inventory/client/api.ts`
- `src/modules/inventory/client/hooks.ts`
- `src/modules/inventory/server/adjust-stock.test.ts`
- `src/modules/inventory/server/adjust-stock.ts`
- `src/modules/inventory/server/operational-stock.ts`
- `src/modules/inventory/server/product-page.ts`
- `src/modules/inventory/server/stock-write.test.ts`
- `src/modules/inventory/server/stock-write.ts`
- `src/modules/orders/client/api.ts`
- `src/modules/orders/client/hooks.ts`
- `src/modules/orders/schema.ts`
- `src/modules/orders/server/mappers.test.ts`
- `src/modules/orders/server/offline-sale-checkout.ts`
- `src/modules/orders/server/offline-sale.ts`
- `src/modules/orders/server/queries.ts`
- `src/modules/orders/server/transition-order.ts`
- `src/modules/overview/server/queries.ts`
- `src/modules/payments/server/paystack.test.ts`
- `src/modules/payments/server/paystack.ts`
- `src/modules/products/client/api.test.ts`
- `src/modules/products/client/api.ts`
- `src/modules/products/client/catalogue-search-params.ts`
- `src/modules/products/client/hooks.ts`
- `src/modules/products/client/use-catalogue-navigation.ts`
- `src/modules/products/product-module-boundaries.test.ts`
- `src/modules/products/server/commands.ts`
- `src/modules/products/server/editor-ownership.test.ts`
- `src/modules/products/server/lifecycle-commands.test.ts`
- `src/modules/products/server/lifecycle-commands.ts`
- `src/modules/products/server/rules.ts`
- `src/modules/products/server/storefront/catalogue-projection.ts`
- `src/modules/products/server/storefront/mappers.ts`
- `src/modules/products/server/storefront/page-selection.test.ts`
- `src/modules/products/server/storefront/shell-query.ts`
- `src/modules/products/server/storefront/type-ownership.test.ts`
- `src/modules/products/server/storefront/visibility.ts`
- `src/modules/products/server/taxonomy-commands.ts`
- `src/modules/products/server/write-helpers.ts`
- `src/modules/products/ui/storefront/overlays/filter-drawer.tsx`
- `src/modules/products/ui/storefront/overlays/quick-view-overlay.tsx`
- `src/modules/products/ui/storefront/overlays/search-overlay.tsx`
- `src/modules/products/ui/storefront/overlays/sort-overlay.tsx`
- `src/modules/products/ui/storefront/product-catalogue.tsx`
- `src/modules/products/ui/storefront/product-purchase-panel.tsx`
- `src/modules/products/ui/storefront/product-recommendations.tsx`
- `src/modules/returns/client/api.ts`
- `src/modules/returns/schema.ts`
- `src/modules/returns/server/api-errors.ts`
- `src/modules/returns/server/commands.ts`
- `src/modules/returns/server/mappers.ts`
- `src/modules/returns/server/queries.ts`
- `src/modules/reviews/schema.test.ts`
- `src/modules/reviews/server/policy.test.ts`
- `src/modules/reviews/server/repository.test.ts`
- `src/modules/reviews/ui/storefront/review-page.tsx`
- `src/modules/settings/client/api.ts`
- `src/modules/settings/client/hooks.ts`
- `src/modules/settings/server/commands.ts`
- `src/modules/settings/server/mappers.ts`
- `src/modules/settings/server/queries.ts`
- `src/modules/storefront-shell/client/storefront-hold-clock.test.tsx`
- `src/modules/storefront-shell/client/storefront-overlay-events.ts`
- `src/modules/storefront-shell/client/storefront-runtime.ts`
- `src/modules/storefront-shell/ui/brand-mark.tsx`
- `src/modules/storefront-shell/ui/information-overlays.tsx`
- `src/modules/storefront-shell/ui/site-chrome.tsx`
- `src/modules/storefront-shell/ui/site-header.tsx`
- `src/modules/storefront-shell/ui/storefront-account-menu.tsx`
- `src/modules/storefront-shell/ui/storefront-cart-sheet.tsx`
- `src/providers/query-provider.tsx`
- `src/providers/storefront-query-provider.tsx`
- `src/providers/storefront-state-hydrator.tsx`
- `src/server/commerce/catalogue/catalogue-limits.test.ts`
- `src/server/commerce/catalogue/mappers.test.ts`
- `src/server/commerce/catalogue/storefront-page-query.test.ts`
- `src/server/commerce/catalogue/variant-measurements.test.ts`
- `src/server/commerce/inventory/inventory-mappers.test.ts`
- `src/server/commerce/inventory/inventory-read.test.ts`
- `src/server/commerce/inventory/inventory-regression-mappers.test.ts`
- `src/server/commerce/inventory/inventory-regression-writes.test.ts`
- `src/server/commerce/inventory/inventory-transaction-boundaries.test.ts`
- `src/server/commerce/orders/account-orders.test.ts`
- `src/server/commerce/reviews/public-reviews.test.ts`
- `src/stores/cart.store.ts`
- `src/stores/saved-items.store.ts`
- `src/stores/storefront-ui.store.ts`
- `src/types/paystack-inline-js.d.ts`
- `tsconfig.json`

## Diff stat
```text
.superpowers/sdd/task-3-report.md                  |  91 +++
 .../phase-1-6-full-acceptance.md                   |  76 ++
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
 scripts/checks/module-export-guard.mjs             | 393 ++++++----
 scripts/checks/storefront-server-boundary.test.ts  |  20 +
 scripts/ci/collect-context.mjs                     |  67 +-
 scripts/ci/lib.mjs                                 |   8 +-
 src/app/(storefront)/cart/page.tsx                 |  17 +-
 src/app/(storefront)/collections/[slug]/page.tsx   |   5 +-
 src/app/admin/inventory/page.tsx                   |   1 -
 src/app/admin/returns/page.tsx                     |   6 +-
 src/app/api/v1/admin/holds/route.test.ts           |   6 +-
 src/app/api/v1/admin/inventory/route.test.ts       |   9 +-
 .../v1/admin/orders/offline-sales/route.test.ts    |   3 +-
 .../api/v1/admin/products/[id]/archive/route.ts    |   5 +-
 .../api/v1/admin/products/[id]/restore/route.ts    |   5 +-
 src/app/api/v1/admin/products/route.test.ts        |   2 +-
 .../api/v1/admin/products/taxonomy/[id]/route.ts   |  10 +-
 src/features/admin/customers/customers-url.test.ts |   2 +
 src/features/admin/customers/customers-url.ts      |   3 +-
 .../admin/customers/customers-workspace.tsx        |  10 +-
 src/features/admin/data/admin-domain-keys.test.ts  |  46 +-
 .../admin/holds/hold-conversion-dialog.tsx         |   3 +-
 src/features/admin/holds/holds-url.test.ts         |   2 +
 src/features/admin/holds/holds-workspace.tsx       |   6 +-
 .../admin/inventory/inventory-workspace.tsx        |   2 +-
 src/features/admin/orders/order-selectors.ts       |   6 +-
 src/features/admin/orders/order-timeline.tsx       |   2 +-
 src/features/admin/orders/orders-url.test.ts       |   2 +
 src/features/admin/orders/orders-workspace.tsx     |   2 +-
 .../admin/overview/open-orders-preview.tsx         |   8 +-
 .../admin/product-editor/product-editor-dialog.tsx |   5 +-
 .../admin/record-sale/record-sale-controller.tsx   |   4 +-
 .../record-sale/record-sale-customer-step.tsx      |   4 +-
 .../admin/record-sale/record-sale-dialog.tsx       |   5 +-
 .../admin/record-sale/record-sale-payment-step.tsx |  12 +-
 .../admin/record-sale/record-sale-types.ts         |   5 +-
 .../admin/returns/create-return-dialog.tsx         |   5 +-
 src/features/admin/returns/returns-url.test.ts     |   2 +
 src/features/admin/returns/returns-workspace.tsx   |   5 +-
 src/features/admin/settings/settings-workspace.tsx |   5 +-
 src/features/admin/shared/admin-pagination.tsx     |   5 +-
 src/features/admin/shell/admin-shell.tsx           |   8 +-
 .../account/orders/order-state-copy.test.ts        |   7 +-
 .../account/sections/overview-section.tsx          |  38 +-
 .../storefront/checkout/checkout-flow-v2.tsx       |   4 +-
 .../storefront/home/sections/category-section.tsx  |  11 +-
 .../storefront/home/sections/hero-section.tsx      |   8 +-
 .../home/sections/one-of-one-section.tsx           |   9 +-
 .../home/sections/recently-viewed-section.tsx      |   9 +-
 .../storefront/home/sections/trust-section.tsx     |  40 +-
 src/features/storefront/home/storefront-home.tsx   |  10 +-
 .../storefront/shared/add-to-bag-label.test.ts     |   2 +-
 src/features/storefront/shared/cart-lines.test.ts  |   2 +-
 .../shared/storefront-auth-dialog-host.tsx         |   6 +-
 .../storefront/shared/storefront-auth-provider.tsx |   7 +-
 .../storefront-client-state-persistence.test.ts    |   2 +-
 .../shared/storefront-client-state.test.ts         |   2 +-
 .../shared/storefront-overlay-events.test.ts       |   4 +-
 .../storefront/shared/storefront-overlays.tsx      |  56 +-
 src/lib/admin/customers/customer-products.ts       |  10 +
 src/lib/admin/customers/customer-selectors.test.ts | 230 +++---
 src/lib/admin/inventory/inventory-types.ts         |   8 +-
 src/lib/admin/orders/orders-query-options.ts       |  11 +-
 .../admin/product-editor/product-editor-types.ts   |   2 +-
 src/lib/boundaries/module-export-guard.test.ts     |  65 ++
 src/lib/boundaries/server-client-boundary.test.ts  | 109 ++-
 .../boundaries/storefront-state-boundary.test.ts   |  49 +-
 src/lib/prisma/client.ts                           |   2 +-
 src/lib/query/storefront-query-client.ts           |   2 +-
 src/modules/admin-persistence-boundary.test.ts     |  24 +
 src/modules/cart/cart-restoration.ts               |   2 +-
 src/modules/customers/client/api.ts                |   4 +-
 src/modules/customers/schema.ts                    |   8 +-
 src/modules/customers/server/commands.ts           |   3 +-
 src/modules/customers/server/mappers.ts            |  23 +-
 src/modules/customers/server/queries.ts            |   6 +-
 src/modules/holds/client/api.ts                    |   7 +-
 src/modules/holds/client/hooks.ts                  |  11 +-
 src/modules/holds/schema.ts                        |   6 +-
 src/modules/holds/server/api-errors.ts             |   3 +-
 src/modules/holds/server/commands.test.ts          |  12 +-
 src/modules/holds/server/commands.ts               |  14 +-
 src/modules/holds/server/mappers.ts                |   5 +-
 src/modules/holds/server/queries.ts                |   6 +-
 src/modules/inventory/client/api.ts                |   2 +-
 src/modules/inventory/client/hooks.ts              |   7 +-
 src/modules/inventory/server/adjust-stock.test.ts  |   7 +-
 src/modules/inventory/server/adjust-stock.ts       |   3 +-
 src/modules/inventory/server/operational-stock.ts  |  12 +-
 src/modules/inventory/server/product-page.ts       |   4 +-
 src/modules/inventory/server/stock-write.test.ts   |  92 +--
 src/modules/inventory/server/stock-write.ts        |   9 +-
 src/modules/orders/client/api.ts                   |   2 +-
 src/modules/orders/client/hooks.ts                 |   7 +-
 src/modules/orders/schema.ts                       |   3 +-
 src/modules/orders/server/mappers.test.ts          |   5 +-
 src/modules/orders/server/offline-sale-checkout.ts |   5 +-
 src/modules/orders/server/offline-sale.ts          |   4 +-
 src/modules/orders/server/queries.ts               |  11 +-
 src/modules/orders/server/transition-order.ts      |   8 +-
 src/modules/overview/server/queries.ts             |   2 +-
 src/modules/payments/server/paystack.test.ts       |   6 +-
 src/modules/payments/server/paystack.ts            |   3 +-
 src/modules/products/client/api.test.ts            |   5 +-
 src/modules/products/client/api.ts                 |  23 +-
 .../products/client/catalogue-search-params.ts     |  94 ++-
 src/modules/products/client/hooks.ts               |   7 +-
 .../products/client/use-catalogue-navigation.ts    | 202 +++--
 .../products/product-module-boundaries.test.ts     | 104 ++-
 src/modules/products/server/commands.ts            |   6 +-
 .../products/server/editor-ownership.test.ts       |   4 +-
 .../products/server/lifecycle-commands.test.ts     |  15 +-
 src/modules/products/server/lifecycle-commands.ts  |   7 +-
 src/modules/products/server/rules.ts               |   2 +-
 .../server/storefront/catalogue-projection.ts      |  10 +-
 src/modules/products/server/storefront/mappers.ts  |   4 +-
 .../server/storefront/page-selection.test.ts       |   5 +-
 .../products/server/storefront/shell-query.ts      |   2 +-
 .../server/storefront/type-ownership.test.ts       |   4 +-
 .../products/server/storefront/visibility.ts       |   5 +-
 src/modules/products/server/taxonomy-commands.ts   |   7 +-
 src/modules/products/server/write-helpers.ts       |  10 +-
 .../ui/storefront/overlays/filter-drawer.tsx       |   5 +-
 .../ui/storefront/overlays/quick-view-overlay.tsx  |  30 +-
 .../ui/storefront/overlays/search-overlay.tsx      |   7 +-
 .../ui/storefront/overlays/sort-overlay.tsx        |   9 +-
 .../products/ui/storefront/product-catalogue.tsx   |  26 +-
 .../ui/storefront/product-purchase-panel.tsx       |  13 +-
 .../ui/storefront/product-recommendations.tsx      |   4 +-
 src/modules/returns/client/api.ts                  |   2 +-
 src/modules/returns/schema.ts                      |   5 +-
 src/modules/returns/server/api-errors.ts           |   6 +-
 src/modules/returns/server/commands.ts             |  22 +-
 src/modules/returns/server/mappers.ts              |  10 +-
 src/modules/returns/server/queries.ts              |  18 +-
 src/modules/reviews/schema.test.ts                 |  14 +-
 src/modules/reviews/server/policy.test.ts          |  47 +-
 src/modules/reviews/server/repository.test.ts      | 114 ++-
 src/modules/reviews/ui/storefront/review-page.tsx  |   6 +-
 src/modules/settings/client/api.ts                 |   9 +-
 src/modules/settings/client/hooks.ts               |   5 +-
 src/modules/settings/server/commands.ts            |  28 +-
 src/modules/settings/server/mappers.ts             |   4 +-
 src/modules/settings/server/queries.ts             |   7 +-
 .../client/storefront-hold-clock.test.tsx          |   5 +-
 .../client/storefront-overlay-events.ts            |   5 +-
 .../storefront-shell/client/storefront-runtime.ts  |  19 +-
 src/modules/storefront-shell/ui/brand-mark.tsx     |  48 +-
 .../storefront-shell/ui/information-overlays.tsx   | 154 +++-
 src/modules/storefront-shell/ui/site-chrome.tsx    |   6 +-
 src/modules/storefront-shell/ui/site-header.tsx    |  73 +-
 .../ui/storefront-account-menu.tsx                 |   5 +-
 .../storefront-shell/ui/storefront-cart-sheet.tsx  |  24 +-
 src/providers/query-provider.tsx                   |   4 +-
 src/providers/storefront-query-provider.tsx        |   4 +-
 src/providers/storefront-state-hydrator.tsx        |   7 +-
 .../commerce/catalogue/catalogue-limits.test.ts    |   2 +-
 src/server/commerce/catalogue/mappers.test.ts      |   2 +-
 .../catalogue/storefront-page-query.test.ts        |   4 +-
 .../catalogue/variant-measurements.test.ts         |   2 +-
 .../commerce/inventory/inventory-mappers.test.ts   |  10 +-
 .../commerce/inventory/inventory-read.test.ts      |  51 +-
 .../inventory/inventory-regression-mappers.test.ts |   2 +-
 .../inventory/inventory-regression-writes.test.ts  |   8 +-
 .../inventory-transaction-boundaries.test.ts       |   4 +-
 src/server/commerce/orders/account-orders.test.ts  |   2 +-
 src/server/commerce/reviews/public-reviews.test.ts |   2 +-
 src/stores/cart.store.ts                           |  12 +-
 src/stores/saved-items.store.ts                    |   7 +-
 src/stores/storefront-ui.store.ts                  |   2 +-
 src/types/paystack-inline-js.d.ts                  |   5 +
 tsconfig.json                                      |   2 +-
 182 files changed, 5093 insertions(+), 1586 deletions(-)
```

## Commits
```text
8959632 (HEAD -> codex/phase-1-6-full-acceptance) chore(format): apply Biome safe fixes
9152f3e fix(domains): reconcile canonical type contracts
8d79dc1 fix(products): align catalogue navigation contracts
bbf10bd test(domains): migrate stale legacy coverage
63b0009 fix(ci): harden acceptance provenance
6b7ef59 test(architecture): resolve generated Prisma exports
5f083ed test(architecture): align validation guards with modules
22264df fix(storefront): migrate legacy client imports
deb7cd3 test(architecture): harden foundation guards
6655c30 test(architecture): bound deferred compatibility edges
b29858d chore(ci): capture exact-head acceptance provenance
9f48bf2 (main) docs(architecture): plan phase 1-6 full acceptance
9da5a60 docs(architecture): define phase 1-6 full acceptance
```

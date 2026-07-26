# Phase 1 Legacy Architecture Exceptions

**Status:** Active temporary exceptions  
**Owner:** Architecture migration  
**Rule:** This list may only shrink. Removing an edge and its machine entry happens in one commit.

Phase 1 establishes the target rules without pretending Phase 7 authentication or Phase 8
checkout settlement has already migrated. The machine-readable authority is
`scripts/checks/architecture-legacy-exceptions.mjs`; every entry names one exact importer and
one exact imported specifier, an owner, a reason, and a removal phase. The architecture guard
checks both observed-to-declared and declared-to-observed directions.

## Phase 7 authentication compatibility

These edges are owned by the domain engineer and are removed in Phase 7.

| Importer | Imported specifier |
| --- | --- |
| `src/app/storefront-route-boundary.tsx` | `@/server/auth/session` |
| `src/app/auth/sign-in/page.tsx` | `@/server/auth/session` |
| `src/app/admin/layout.tsx` | `@/server/auth/session` |
| `src/app/admin/inventory/page.tsx` | `@/server/auth/session` |
| `src/app/(storefront)/account/profile/page.tsx` | `@/server/auth/session` |
| `src/app/(storefront)/account/profile/actions.ts` | `@/server/auth/session` |
| `src/app/(storefront)/account/orders/page.tsx` | `@/server/auth/session` |
| `src/app/(storefront)/account/orders/[orderNumber]/page.tsx` | `@/server/auth/session` |
| `src/app/(storefront)/account/orders/[orderNumber]/items/[orderLineId]/review/actions.ts` | `@/server/auth/session` |
| `src/app/(storefront)/account/orders/[orderNumber]/items/[orderLineId]/review/page.tsx` | `@/server/auth/session` |
| `src/lib/http/auth.ts` | `@/server/auth/session` |
| `src/modules/customers/server/commands.ts` | `@/server/auth/session` |
| `src/modules/holds/server/commands.ts` | `@/server/auth/session` |
| `src/modules/inventory/server/adjust-stock.ts` | `@/server/auth/session` |
| `src/modules/inventory/server/stock-write.ts` | `@/server/auth/session` |
| `src/modules/orders/server/offline-sale-checkout.ts` | `@/server/auth/session` |
| `src/modules/orders/server/offline-sale-draft.ts` | `@/server/auth/session` |
| `src/modules/orders/server/offline-sale.ts` | `@/server/auth/session` |
| `src/modules/orders/server/transition-order.ts` | `@/server/auth/session` |
| `src/modules/products/server/lifecycle-commands.ts` | `@/server/auth/session` |
| `src/modules/products/server/product-commands.ts` | `@/server/auth/session` |
| `src/modules/products/server/rules.ts` | `@/server/auth/session` |
| `src/modules/products/server/taxonomy-commands.ts` | `@/server/auth/session` |
| `src/modules/returns/server/commands.ts` | `@/server/auth/session` |
| `src/modules/settings/server/commands.ts` | `@/server/auth/session` |
| `src/app/auth/callback/route.ts` | `@/server/auth/profile` |
| `src/server/auth/session.ts` | `@/server/auth/profile` |
| `src/app/storefront-client-boundary.tsx` | `@/features/storefront/shared/storefront-auth-provider` |
| `src/modules/storefront-shell/ui/site-chrome.tsx` | `@/features/storefront/shared/storefront-auth-provider` |
| `src/modules/storefront-shell/ui/storefront-account-menu.tsx` | `@/features/storefront/shared/storefront-auth-provider` |
| `src/app/storefront-client-boundary.tsx` | `@/features/storefront/shared/storefront-auth-dialog-host` |
| `src/app/storefront-client-boundary.tsx` | `@/features/storefront/shared/storefront-auth-session` |
| `src/app/storefront-route-boundary.tsx` | `@/features/storefront/shared/storefront-auth-session` |

Only `src/server/auth/session.ts` and `src/server/auth/profile.ts` are declared legacy top-level
auth files. A third production file under `src/server/auth/**` is not allowed by folder or glob.

## Phase 8 checkout compatibility

These route-level presentation edges are owned by the UI engineer and are removed in Phase 8.

| Importer | Imported specifier |
| --- | --- |
| `src/app/(storefront)/checkout/page.tsx` | `@/features/storefront/checkout/checkout-flow-v2` |
| `src/app/(storefront)/order-confirmation/page.tsx` | `@/features/storefront/checkout/order-receipt` |

No checkout directory, nested checkout-to-checkout import, settlement operation, wildcard, or
second route consumer is covered by these entries.

## Type-only Product shim

`src/features/storefront/shared/storefront-auth-dialog.tsx` has one exact type-only import from
`@/features/storefront/shared/catalogue-data`. That shim may export only the `Product` type from
`@/modules/products/ui/storefront/catalogue-data`; `export *` and runtime exports are rejected.
It does not authorize a runtime Product dependency or another consumer.

## Explicitly not excepted

The obsolete Phase 4 TanStack-to-Server-Action exception is absent because its edge no longer
exists. There is no exception for Client Components importing Prisma or server modules,
production fixture/seed imports, Route Handlers importing Server Actions, or new business
modules under `src/features/**` or top-level `src/server/**`.

## Removal discipline

When a later phase removes an exception:

1. remove the legacy edge and its exact machine-readable entry in the same commit;
2. update the owning domain migration status;
3. run the focused boundary tests and `pnpm check:architecture`;
4. preserve Phase 0 UI and runtime behaviour.

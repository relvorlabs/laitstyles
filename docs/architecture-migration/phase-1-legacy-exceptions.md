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

**2026-07-27 (P7-T03):** all 25 `@/server/auth/session` edges were removed in one commit —
`src/server/auth/session.ts` relocated to `src/modules/auth/server/session.ts` and every importer
now points at the in-module path directly, needing no exception. See
`docs/superpowers/specs/2026-07-27-phase-7-auth-consolidation-design.md`. The moved file still
imports the legacy `src/server/auth/profile.ts` (profile.ts itself moves in P7-T04), so its own
entry changed from `src/server/auth/session.ts` to `src/modules/auth/server/session.ts` in the
profile row below rather than disappearing.

| Importer | Imported specifier |
| --- | --- |
| `src/app/auth/callback/route.ts` | `@/server/auth/profile` |
| `src/modules/auth/server/session.ts` | `@/server/auth/profile` |
| `src/app/storefront-client-boundary.tsx` | `@/features/storefront/shared/storefront-auth-provider` |
| `src/modules/storefront-shell/ui/site-chrome.tsx` | `@/features/storefront/shared/storefront-auth-provider` |
| `src/modules/storefront-shell/ui/storefront-account-menu.tsx` | `@/features/storefront/shared/storefront-auth-provider` |
| `src/app/storefront-client-boundary.tsx` | `@/features/storefront/shared/storefront-auth-dialog-host` |

Only `src/server/auth/profile.ts` is declared a legacy top-level auth file (until P7-T04). A
second production file under `src/server/auth/**` is not allowed by folder or glob.

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

On 2026-07-27, as part of the provider-centralization change, three edges were removed in one
commit: `src/app/storefront-route-boundary.tsx` → `@/server/auth/session` (session resolution
moved to root layout), `src/app/storefront-client-boundary.tsx` →
`@/features/storefront/shared/storefront-auth-session`, and
`src/app/storefront-route-boundary.tsx` → `@/features/storefront/shared/storefront-auth-session`
(storefront auth narrowed to actions-only). See
`docs/superpowers/specs/2026-07-27-provider-centralization-design.md`.

On 2026-07-27, as part of Phase 7 task P7-T03, all 25 `@/server/auth/session` edges were removed
in one commit: `src/server/auth/session.ts` relocated to `src/modules/auth/server/session.ts`
(content unchanged) and every one of its 25 production importers repointed to the in-module path
directly. The relocated file's own `@/server/auth/profile` import is registered as a new, narrower
temporary edge (`src/modules/auth/server/session.ts` → `@/server/auth/profile`, replacing the
prior `src/server/auth/session.ts` entry), retired in P7-T04 when `profile.ts` itself moves into
the module. See `docs/superpowers/specs/2026-07-27-phase-7-auth-consolidation-design.md`.

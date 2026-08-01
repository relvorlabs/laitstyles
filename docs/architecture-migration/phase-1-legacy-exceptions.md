# Phase 1 Legacy Architecture Exceptions

**Status:** Complete — zero active exceptions  
**Owner:** Architecture migration  
**Rule:** This list may only shrink. Removing an edge and its machine entry happens in one commit.

Phase 7 authentication and Phase 8 checkout compatibility are complete. The machine-readable
authority is `scripts/checks/architecture-legacy-exceptions.mjs`; its exception array is empty.
When an exception exists, every entry names one exact importer and one exact imported specifier,
an owner, a reason, and a removal phase. The architecture guard checks both
observed-to-declared and declared-to-observed directions.

## Phase 7 authentication compatibility — complete, zero edges remain

Phase 7 authentication consolidation is done. All 30 original edges owned by this section are
retired; the table that used to live here is now empty by construction, not by omission.

**2026-07-27 (P7-T03):** all 25 `@/server/auth/session` edges were removed in one commit —
`src/server/auth/session.ts` relocated to `src/modules/auth/server/session.ts` and every importer
now points at the in-module path directly, needing no exception.

**2026-07-27 (P7-T04):** the remaining 2 `@/server/auth/profile` edges were removed in one commit —
`src/server/auth/profile.ts` relocated to `src/modules/auth/server/account-provisioning.ts` and
both former importers (`src/app/auth/callback/route.ts`, `src/modules/auth/server/session.ts`) now
point at the in-module path directly. `src/server/auth/**` no longer exists.

**2026-07-27 (P7-T10/T11):** the final 5 edges were removed in one commit —
`src/features/storefront/shared/{storefront-auth-dialog,storefront-auth-dialog-host,
storefront-auth-provider}.tsx` relocated to `src/modules/auth/ui/{auth-dialog,auth-dialog-host,
storefront-auth-provider}.tsx` (3 `storefront-auth-provider` importer edges + 1 composition edge
retired), and `src/features/storefront/shared/catalogue-data.ts` (the type-only `Product` shim)
deleted outright — the moved `auth-dialog.tsx` now imports `Product` directly from
`@/modules/products/ui/storefront/catalogue-data`, the canonical source the shim only ever
re-exported. See `docs/superpowers/specs/2026-07-27-phase-7-auth-consolidation-design.md`.

No legacy top-level auth file remains declared. `src/server/auth/**` no longer exists.
`src/features/storefront/shared/storefront-runtime.ts` was deleted after every consumer moved to
`@/modules/storefront-shell/client/storefront-runtime`; no shared runtime compatibility shim
remains.

## Phase 8 checkout compatibility — complete, zero edges remain

Phase 8 checkout compatibility is complete. The standalone checkout page is gone, and
`src/app/(storefront)/order-confirmation/page.tsx` now authenticates the consumer and reads the
canonical persisted order before rendering `@/modules/checkout/ui/order-confirmation`. The two
stale route-level exception entries were retired. No checkout directory or shared runtime
compatibility shim remains under `src/features/storefront/**`.

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

On 2026-07-27, as part of Phase 7 task P7-T04, the last 2 auth compatibility edges tied to
`src/server/auth/**` were removed in one commit: `src/server/auth/profile.ts` relocated to
`src/modules/auth/server/account-provisioning.ts` (content unchanged) and both its importers
(`src/app/auth/callback/route.ts`, `src/modules/auth/server/session.ts`) repointed to the in-module
path directly. `src/server/auth/**` no longer exists on disk.

On 2026-07-27, as part of Phase 7 tasks P7-T10/T11, the final 5 auth compatibility edges were
removed in one commit: `src/features/storefront/shared/{storefront-auth-dialog,
storefront-auth-dialog-host,storefront-auth-provider}.tsx` relocated to
`src/modules/auth/ui/{auth-dialog,auth-dialog-host,storefront-auth-provider}.tsx` (content
unchanged; no JSX, className, or interaction-state edit) with their 3 importers + 1 composition
edge repointed to the in-module path directly, and `src/features/storefront/shared/catalogue-data.ts`
(the type-only `Product` shim) deleted after `auth-dialog.tsx` was repointed to import `Product`
directly from `@/modules/products/ui/storefront/catalogue-data`. `legacyProductTypeOnlyEdge` is
removed from `architecture-legacy-exceptions.mjs`, and the test that asserted its exact shape
(`src/modules/products/product-module-boundaries.test.ts`, "keeps every phase exception exact and
type-only") is removed with it — there is no longer an exception to verify. Phase 7's section of
this document is now empty of active edges.

On 2026-08-01, Phase 8 checkout compatibility closed with four dead legacy files deleted:
`src/features/storefront/checkout/checkout-helpers.test.ts`,
`src/features/storefront/checkout/order-receipt.test.ts`,
`src/features/storefront/checkout/components/confirm-metric.tsx`, and
`src/features/storefront/shared/storefront-runtime.ts`. The corresponding stale exceptions were
retired for `src/app/(storefront)/checkout/page.tsx` →
`@/features/storefront/checkout/checkout-flow-v2` and
`src/app/(storefront)/order-confirmation/page.tsx` →
`@/features/storefront/checkout/order-receipt`. The machine-readable exception array is now empty.

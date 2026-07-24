# Laitstyles Architecture Migration

This directory is the controlling workspace for the architecture migration approved on
July 24, 2026.

## Documents

- [`decision-and-migration-review.md`](decision-and-migration-review.md) — approved decisions,
  target structure, phase plan, and acceptance gates.
- [`phase-0-baseline.md`](phase-0-baseline.md) — completed source/runtime baseline and UI
  preservation contract.
- [`phase-0-source-inventory.md`](phase-0-source-inventory.md) — production seed/in-memory,
  provider, store, context, query-cache, and persistence ownership.
- [`phase-0-playwright-evidence.md`](phase-0-playwright-evidence.md) — external Playwright run,
  artifact metadata, screenshots, route manifest, interactions, and limitations.
- [`phase-1-domain-status.md`](phase-1-domain-status.md) — every migration-relevant domain,
  current owner, target owner, phase, and status.
- [`phase-1-legacy-exceptions.md`](phase-1-legacy-exceptions.md) — exact temporary exceptions and
  removal phases.
- [`phase-2-layout-provider-status.md`](phase-2-layout-provider-status.md) — exact Phase 2 scope,
  final route/provider map, acceptance state and rollback.
- [`migration-tracker.md`](migration-tracker.md) — phase/task status and acceptance gates.
- [`../ci/permanent-validation.md`](../ci/permanent-validation.md) — local commands, private
  self-hosted runner, public deployment fallback, and repair loop.

## Current status

Phase 0 was merged in `072cc92aa5301342f060633663094f956089ef1a`.

Phase 1 was merged through PR #38 in
`1ca1b184207ea2a36fa41c10162b8a059abe5289` by explicit repository-owner direction. Its private
source suites remain queued until a trusted runner with the `laitstyles-ci` label is registered.
That is recorded validation debt, not a pass.

Phase 2 source implementation is complete on `refactor/phase-2-layout-provider-scope`, but the
acceptance gate remains blocked because source-backed static and browser validation has not run.

Phase 2 is limited to:

- consolidating storefront route layouts through a URL-neutral route group;
- removing duplicated storefront layout wrappers;
- keeping theme and toaster at the app root;
- scoping TanStack Query to the smallest current consuming surface;
- adding layout/provider and final route-map invariants;
- recording route/visual parity evidence when it becomes available.

It does not migrate domains, APIs, Prisma ownership, AdminStore, storefront state, authentication,
checkout authority, payment settlement, or UI presentation.

## Phase 2 source composition

```text
RootLayout
  -> AppProvider
     -> ThemeProvider
     -> routes
     -> Toaster

AdminLayout
  -> staff access resolution
  -> QueryProvider
     -> AdminShell

src/app/(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> (home)                  /
     -> products                /products/**
     -> collections             /collections/**
     -> cart                    /cart
     -> checkout                /checkout
     -> order-confirmation      /order-confirmation
     -> account/layout.tsx
        -> AccountShell         /account/**
```

Every discovered storefront and account route now lives beneath `(storefront)`. Existing page,
loading, error, not-found and action files were retained as renames. The account layout alone was
simplified to remove the duplicate outer storefront boundary while preserving `AccountShell` and
metadata. The former `src/app/storefront-layout.tsx` compatibility file and the duplicate segment
layout re-exports are gone.

Because `(storefront)` is a route group, it is omitted from public URLs. Runtime confirmation is
still required before this phase can be declared complete.

## Runtime evidence retained

```text
Phase 0 target: https://laitstyles.vercel.app/
Phase 0 run: 30099471635
Phase 0 result: 15 passed, 0 failed
Phase 0 artifact: 8599046423

Permanent public workflow commit: ea33659835976c3823f4ecbf29508eb4275377b0
Validation run: 30102855564
Artifact: 8600369626
```

Public-deployment evidence supplements but does not replace private source validation and does not
prove the current Phase 2 branch.

## Permanent validation model

Private workflows target a trusted Linux x64 self-hosted runner carrying `laitstyles-ci`. Local
entry points remain:

```bash
pnpm validate
pnpm validate:fix
pnpm validate:full
pnpm validate:browser
```

Phase 2 still requires architecture, Biome, TypeScript, Vitest, build, React Doctor and source-backed
Playwright evidence. A queued runner, zero-step workflow, unavailable artifact, missing branch
preview, or public-deployment-only run is not a private source pass.

## Non-negotiable preservation rule

Every phase preserves the Phase 0 header, footer, homepage composition, product cards, catalogue,
PDP, account/cart/checkout/admin presentation, typography, spacing, themes, interactions, and
responsive behaviour.

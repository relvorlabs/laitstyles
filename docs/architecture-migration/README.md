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
- [`phase-3-http-module-status.md`](phase-3-http-module-status.md) — complete Phase 3 source scope,
  tests, acceptance state and rollback.
- [`phase-3-cache-invalidation-contract.md`](phase-3-cache-invalidation-contract.md) — remote cache,
  query-key, cancellation and invalidation rules for later domain cutovers.
- [`migration-tracker.md`](migration-tracker.md) — phase/task status and acceptance gates.
- [`../ci/permanent-validation.md`](../ci/permanent-validation.md) — local commands, private
  self-hosted runner, public deployment fallback, and repair loop.

## Current status

Phase 0 was merged in `072cc92aa5301342f060633663094f956089ef1a`.

Phase 1 was squash-merged through PR #38 in
`1ca1b184207ea2a36fa41c10162b8a059abe5289` by explicit repository-owner direction. Its private
source suites remain queued until a trusted runner carrying `laitstyles-ci` is registered. That is
recorded validation debt, not a pass.

Phase 2 was squash-merged through PR #39 in
`558e34852f38f0982c7ce9d7c32422f09bbf8775` by explicit repository-owner direction while source,
route and visual validation remained blocked. Its route/provider implementation is merged, but the
unexecuted gate remains validation debt.

Phase 3 source implementation is complete on `refactor/phase-3-http-module-foundation`; its
acceptance gate remains pending until the private workflows execute.

Phase 3 includes:

- client-compatible typed success, error and pagination contracts;
- server-only Route Handler response, validation and error mapping;
- safe `x-request-id` correlation and structured failure logging;
- reusable API session, staff capability and permission-policy helpers;
- a typed browser API client with stable transport errors and preserved cancellation;
- the `/api/v1/**` machine-readable namespace;
- the smallest useful module proving shared schema, server query and browser client boundaries;
- intentional admin QueryClient defaults and cache/invalidation rules;
- colocated contract tests, runtime HTTP smoke and architecture guards;
- compatibility preservation for existing endpoints and consumers.

It does not migrate products, inventory, auth ownership, checkout, payments, orders, customers,
returns, delivery, Prisma ownership or UI presentation.

## Phase 3 source composition

```text
src/modules/health/client/api.ts
  -> src/lib/http/client.ts
  -> GET /api/v1/health
  -> src/lib/http/server.ts
  -> src/modules/health/server/queries.ts
```

Response contracts:

```text
Success: { data, meta? }
Error:   { error: { code, message, fieldErrors? } }
Page:    { page, pageSize, total, pageCount }
```

The existing `/api/health` endpoint remains unchanged. Legacy admin inventory endpoints remain in
place for their current consumers and are not migrated before Phase 4.

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
prove the current Phase 3 branch.

## Permanent validation model

Private workflows target a trusted Linux x64 self-hosted runner carrying `laitstyles-ci`. Local
entry points remain:

```bash
pnpm validate
pnpm validate:fix
pnpm validate:full
pnpm validate:browser
```

Phase 3 requires architecture, Biome, TypeScript, Vitest, build, React Doctor and runtime API
evidence. A queued runner, zero-step workflow, unavailable artifact, unexecuted test or
public-deployment-only run is not a private source pass.

## Non-negotiable preservation rule

Every phase preserves the Phase 0 header, footer, homepage composition, product cards, catalogue,
PDP, account/cart/checkout/admin presentation, typography, spacing, themes, interactions and
responsive behaviour.

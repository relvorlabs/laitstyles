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
- [`migration-tracker.md`](migration-tracker.md) — phase/task status and acceptance gates.

## Current status

Phase 0 was merged to `main` in commit
`072cc92aa5301342f060633663094f956089ef1a`.

Phase 1 is **in progress** on `refactor/phase-1-architecture-guards`.

Phase 1 is limited to:

- replacing obsolete doctrine with the approved domain-module target;
- marking `features/**` and top-level `server/**` as legacy for new business code;
- adding migration-safe architecture rules;
- documenting current domain ownership;
- recording exact temporary exceptions.

It does not move routes, providers, runtime domains, data access, or UI.

## Phase 0 runtime evidence retained

```text
Target: https://laitstyles.vercel.app/
Runner: relvorlabs/agent-controller
Workflow run: 30099471635
Playwright: 15 passed, 0 failed
Artifact ID: 8599046423
Artifact digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
Artifact expiry: 2026-08-23
```

The private-repository GitHub jobs were billing-blocked before checkout. That remains an
environment limitation, not a test failure or pass.

## Phase 1 acceptance gate

Phase 1 may complete only when the updated architecture guard and repository checks run on a
secure checkout and either pass or expose explicitly documented, valid temporary exceptions.

Required source-level validation:

```bash
pnpm check:architecture
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Phase 2 must not begin while this gate is open.

## Non-negotiable preservation rule

Every phase preserves the Phase 0 header, footer, homepage composition, product cards, catalogue,
PDP, account/cart/checkout/admin presentation, typography, spacing, themes, interactions, and
responsive behaviour.

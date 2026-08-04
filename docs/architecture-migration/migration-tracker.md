# Architecture Migration Tracker

**Reconciled against `main`:** 2026-08-04

This is the only migration status authority. Phases 0-8 are integrated in source and are omitted
because completed work is represented by the codebase and Git history.

## Current status

| Phase | Goal | Status | Exit condition |
| --- | --- | --- | --- |
| 9 | Delete remaining legacy architecture | In progress | No active presentation or composition remains under `src/features/admin/**`; guards reject retired ownership |
| 10 | Final validation and release readiness | Not started | Exact-head static, unit, build, database, browser, accessibility, responsive, Supabase, and Paystack gates pass |

## Phase 9 active scope

The storefront/account tree, storefront CSS and home ownership, Admin Team, Admin Promotions, and
Admin Orders presentation primitives are already migrated. The remaining source scope is active
Admin presentation and composition under `src/features/admin/**`.

Required outcomes:

- move each active Admin surface to its owning `src/modules/<domain>/ui/**` boundary;
- keep `src/app/admin/**` route and layout files thin;
- remove migrated `src/features/admin/**` files and imports in the same slice;
- tighten architecture guards after each retired ownership boundary;
- preserve existing Admin behaviour, accessibility, responsive layout, and visual presentation.

Do not add new production capability under `src/features/**` or broaden Phase 9 into unrelated
redesign work.

## Phase 10 open gates

Phase 10 certifies the integrated source; it is not permission to reimplement completed phases.
Run the repository-owned gates from `.agents/doctrine/validation-and-reporting.md` and
`docs/ci/permanent-validation.md` on one exact candidate head.

Open acceptance areas:

- reconcile the Node version authorities before collecting exact-head evidence: `package.json`,
  `.node-version`, and `.nvmrc` currently require Node 24 while validation documentation and CI
  require Node 25;
- full architecture, Biome, TypeScript, Vitest, production build, and React Doctor gates;
- Prisma validation, migration status/deploy readiness, generated client, and real database flows;
- authenticated Supabase email, OAuth, recovery, MFA, session-management, and sign-out flows;
- checkout creation, payment methods, verification, refunds, disputes, owner finance, and real
  Paystack recovery/provider states;
- source-backed browser checks at 375x812, 768x1024, and 1280x800, including light/dark parity,
  keyboard/focus behaviour, console errors, and failed network requests.

No skipped, queued, unavailable, deployment-only, stale-SHA, or wrong-toolchain run counts as a
pass.

## Completion rule

When Phase 9 source ownership is retired, change it to `Complete`. When every Phase 10 gate passes
on the same exact head, record the candidate SHA and evidence locations here, mark Phase 10
`Complete`, then remove this migration directory after moving any enduring rule into doctrine.

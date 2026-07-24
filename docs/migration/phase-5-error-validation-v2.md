# Phase 5 — error and validation normalization

Tracking: [#22](https://github.com/relvorlabs/laitstyles/issues/22)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: `main@082224f67f37e02fe95defd378b1e6fd5375ffc0`

## State

`source implementation complete — executable validation blocked — draft — not merge-ready`

No architecture, Prisma, button, Biome, TypeScript, Vitest, build, React-review, or browser gate is recorded as passing. GitHub-hosted jobs currently terminate before checkout with `steps: null` and no logs.

## Goal

Establish one canonical typed expected-failure contract, validate live untrusted server entry points with Zod, prevent provider internals from reaching users, and replace expected-state throws or message-string control flow with typed codes while preserving unexpected failures for diagnostics and error boundaries.

## Stable dependency contracts preserved

- Phase 3 Inventory product, lifecycle, taxonomy, and cache-invalidation business rules remain unchanged.
- Phase 4 storefront client-state ownership and server-session identity authority remain unchanged.
- Inventory product condition remains a lossless database label.
- Account persistence, payment execution, and visual redesign remain outside Phase 5.

## Implemented contracts

### Canonical Result

- `src/lib/errors/index.ts` remains the only `Result<T, E>` implementation.
- Representative admin callers now import directly from `@/lib/errors`.
- `src/lib/admin/shared/result.ts` is a zero-logic compatibility re-export for untouched legacy reducers; the architecture contract rejects any second implementation.
- Domain-specific error unions remain feature-owned.

### Auth validation and provider safety

- Password sign-in/sign-up `FormData` is Zod-parsed and normalized.
- Sign-up terms acceptance is enforced by the Server Action, not only the checkbox UI.
- Password, Google OAuth start, OAuth callback, and sign-out failures map provider codes to fixed allow-listed customer copy.
- Auth redirects serialize an allow-listed error code and safe internal return path only.
- The auth error page ignores arbitrary message query values.
- Provider failures retain server-only structured diagnostics containing operation, provider code, status, and error class; raw messages, credentials, and customer inputs are excluded.
- The storefront auth provider consumes canonical `{ ok, value | error }` Results.

### Inventory action boundaries

- Product payloads reuse the canonical product-editor Zod schema.
- Product lifecycle IDs, save intents, taxonomy kinds, encoded taxonomy IDs, and taxonomy names are validated before domain services run.
- Session-resolution outages remain unexpected errors; they are not disguised as permission failures.
- Existing Phase 3 domain services remain the authority for business rules.

### Verified-review expected failures

- Order and order-line identifiers are Zod-validated.
- Signed-out, missing-customer, malformed-link, eligibility, validation, and withdrawal failures return typed action-state codes and fixed copy.
- Review submission and withdrawal render expected failures inline.
- Session/database unavailability still throws to the error boundary.

## Regression protection authored

- canonical Result discriminant tests;
- auth schemas, provider-code mapping, Server Action result, redirect, and diagnostics tests;
- Inventory action schema and adapter tests;
- review submission/withdrawal action and component tests;
- browser tests proving auth query text is not reflected at desktop, tablet, or mobile viewports;
- `scripts/checks/error-validation-contract.mjs`, included by `pnpm check:architecture`, enforcing one Result implementation, Zod boundaries, server-enforced terms, code-only auth redirects, structured diagnostics, non-reflection coverage, and typed review/Inventory failures.

## Explicit non-changes

- No repository-wide exception rewrite.
- No swallowed infrastructure or programmer failures.
- No new error framework or dependency.
- No Phase 3 inventory policy change.
- No Phase 4 provider/state ownership change.
- No public-route, layout, typography, spacing, or responsive-design change.

## Required evidence before completion

1. Restore GitHub-hosted runner allocation.
2. Run `pnpm check:architecture`, Prisma validation, strict button audit, and Biome.
3. Run TypeScript and the complete Vitest suite.
4. Run the production build and React review.
5. Run relevant Playwright journeys on mobile, tablet, and desktop.
6. Fix every evidenced source failure on this branch and rerun until the required checks genuinely pass.
7. Reviewer posts an evidence-backed completion report before the PR leaves draft.

## Progress ledger

```text
State: source implementation complete; executable validation blocked
Completed: canonical Result consolidation; auth Zod/code/diagnostics hardening; Inventory boundary validation; typed review expected failures; unit, architecture, component, and browser regressions authored
Current: hold PR draft and inspect the exact-head workflows for the first runner-executed evidence
Blocked by: repository/account GitHub-hosted runners terminate before checkout with steps=null and no logs
Contracts changed: typed auth action Results; code-only auth redirects; typed review action-state codes; validated Inventory action adapters
Files/surfaces owned: shared errors, auth actions/routes/provider-safe mapping, Inventory action adapters, verified-review actions/form, focused tests and architecture contract
Validation evidence: source review only; no command is represented as executed or passing
Next handoff: reviewer after real runner allocation is restored
```

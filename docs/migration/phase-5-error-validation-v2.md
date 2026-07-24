# Phase 5 — error and validation normalization

Tracking: [#22](https://github.com/relvorlabs/laitstyles/issues/22)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: current `main` after merged Phase 3 and Phase 4 contracts

## State

`planning and implementation — draft — validation pending`

No lint, typecheck, test, build, or browser gate is recorded as passing until GitHub executes the repository commands.

## Goal

Establish one canonical typed expected-failure contract, validate relevant server entry points with Zod, prevent provider internals from reaching users, and replace expected-state throws or message-string control flow with typed codes while preserving unexpected failures for logging and error boundaries.

## Stable dependency contracts

Phase 3 and Phase 4 are merged into `main`.

- Inventory actions/services return typed product, lifecycle, and taxonomy results.
- Inventory product condition remains a lossless database label.
- Storefront password sign-in/sign-up/sign-out use typed Server Action results.
- Server session remains identity authority.
- Cart/saved/hold ownership is outside Phase 5 and must not change.

## Initial inventory

- Canonical cross-cutting result helpers currently live in `src/lib/errors/index.ts`.
- A duplicate generic result implementation remains in `src/lib/admin/shared/result.ts` and is imported by prototype/admin reducers and validation modules.
- Auth actions parse `FormData` manually and map provider failures by searching raw message text.
- OAuth callback redirects one raw Supabase `error.message` into a user-visible query parameter.
- Inventory action inputs and identified review/account/admin server entries require boundary-by-boundary validation review.
- Expected failures must remain typed; programmer and infrastructure faults must still throw.

## Scope

1. **Canonical result contract**
   - keep exactly one `Result<T, E>` implementation under `src/lib/errors/**`;
   - migrate duplicate admin imports;
   - preserve existing domain-specific discriminated error unions.
2. **Validation boundaries**
   - Zod-parse password auth `FormData`;
   - Zod-parse externally supplied inventory action identifiers and taxonomy inputs;
   - review other live Server Actions in account/reviews/admin and add validation only where an untrusted boundary exists.
3. **Safe provider mapping**
   - map Supabase/auth callback failures to fixed codes and copy;
   - never expose raw provider messages, stack traces, or database details in redirects or UI;
   - retain unexpected failure observability.
4. **Typed expected states**
   - replace known `Error.message` comparisons and expected bare throws with typed result codes;
   - make UI handling exhaustive where a discriminated result is consumed;
   - do not redesign any screen.
5. **Regression protection**
   - unit tests for result helpers, schemas, safe provider mapping, redirects, and representative action handling;
   - architecture checks that reject duplicate Result primitives and raw provider errors in user-visible auth redirects.

## Explicit exclusions

- No broad repository-wide exception rewrite.
- No swallowed unexpected failures.
- No Phase 3 business-rule changes.
- No Phase 4 state ownership changes.
- No account persistence implementation; Phase 6 consumes this contract.
- No payment/checkout execution or visual redesign.
- No new error framework or dependency.

## Role chain

`orchestrator → planner → domain-engineer → ui-engineer → reviewer`

The fixed `AGENTS.md` roster applies. No invented or nested child roles.

## Required evidence before completion

- exactly one canonical Result implementation;
- relevant auth/action boundaries Zod-validated;
- no raw Supabase/provider error reaches a visible redirect or result;
- no traced expected-state branch compares `Error.message` strings;
- focused Vitest coverage;
- architecture guard, Prisma validation, strict button audit, Biome, TypeScript, full Vitest, production build, React review, and relevant Playwright flows;
- reviewer completion report.

## Progress ledger

```text
State: planning and implementation
Completed: dependency gate opened; fresh branch created from current main; initial live-contract inventory recorded
Current: enumerate duplicate result imports, auth/provider exposure, raw action inputs, expected throws, and message-string branches
Blocked by: no source blocker; executable validation may remain blocked by GitHub-hosted runner allocation
Contracts changed: none yet
Files/surfaces owned: src/lib/errors/**, duplicate result module/imports, auth actions/callback, traced expected-failure adapters and tests
Validation evidence: none yet
Next handoff: planner inventory → domain contract → caller migration → reviewer
```

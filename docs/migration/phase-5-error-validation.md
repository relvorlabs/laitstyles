# Phase 5 — Error and validation normalization

Tracking: [#22](https://github.com/relvorlabs/laitstyles/issues/22)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: `946002369cb02fa9d969191e48cb7a0e05cf139b`

## State

`blocked` for implementation; planning-only work is allowed.

## Dependency gate

Wait for Phase 3 and Phase 4 to publish stable action/result contracts. Do not normalize types that those phases are still replacing.

## Objective

Create one typed expected-failure contract, validate relevant server entries with Zod, remove raw provider error exposure and replace expected-state bare throws or magic-string matching with structured handling.

## Role chain

`orchestrator → planner → domain-engineer → ui-engineer → reviewer`

The fixed role roster in `AGENTS.md` applies. Do not invent nested child-agent roles.

## Scope

- Merge duplicate Result/expected-failure primitives into one canonical module.
- Zod-validate auth action inputs and other identified server-entry inputs.
- Map Supabase/provider failures to fixed user-safe copy.
- Remove raw `error.message` values from redirects and visible states.
- Replace expected-state bare throws and message-string comparisons with typed codes/unions.
- Preserve thrown unexpected failures for logging and error boundaries.
- Add action/service regression tests and document the canonical contract.

## Exclusions

- No blind repository-wide mechanical rewrite.
- No swallowing unexpected failures.
- No Phase 3 business-rule or Phase 4 state-ownership changes.
- No account persistence; Phase 6 consumes this contract.
- No new error framework/dependency without proven need.

## Ownership

Primary:

- `src/lib/errors/**`
- the duplicate admin/shared Result module
- auth Server Actions and user-safe error-copy adapters
- traced expected-failure branches in account/review/admin actions
- result, schema, action and copy-mapping tests

Shared contract changes must be posted to #19 before migration.

## Required evidence

- Inventory of all migrated result/error consumers.
- Tests for invalid inputs, expected failures and provider-message redaction.
- Exhaustive caller handling where unions are used.
- `pnpm` lint/typecheck/test/build results.
- Reviewer security/privacy and diff report.

## Completion criteria

- One canonical expected-failure primitive remains.
- Relevant server inputs are Zod-validated.
- No raw provider error reaches URLs or user copy.
- No known expected-state flow compares `Error.message` strings.
- Unexpected failures remain observable.
- Reviewer gate passes or blockers are reported honestly.

## Progress ledger

```text
State: blocked
Completed: phase charter created
Current: planner may inventory error/result surfaces without source edits
Blocked by: stable Phase 3 and Phase 4 contracts
Contracts changed: none
Validation evidence: none
Next handoff: planner inventory → dependency wait
```

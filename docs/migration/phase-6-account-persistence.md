# Phase 6 — Truthful, persistent account area

Tracking: [#23](https://github.com/relvorlabs/laitstyles/issues/23)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: `946002369cb02fa9d969191e48cb7a0e05cf139b`

## State

`blocked` for implementation; planning-only work is allowed.

## Dependency gates

- Wait for Phase 5's canonical action/error contract.
- Record the product decision: profile only versus profile + addresses. Until decided, implementation defaults to profile persistence only and must not invent address semantics.

## Objective

Remove fake account saves. Every interactive account section must either persist session-owned data through real server operations or be visibly disabled/labelled as unsupported.

## Role chain

`orchestrator → planner → data-engineer (only for a proven schema gap) → domain-engineer → ui-engineer → reviewer`

The fixed role roster in `AGENTS.md` applies. Do not invent nested child-agent roles.

## Scope

- Read persisted profile values into the account profile form.
- Real `updateProfile` Server Action/domain operation.
- Canonical Phase 1 session ownership enforcement.
- Server-side Zod validation and Phase 5 typed expected failures.
- Revalidation/refresh after successful writes.
- Remove success feedback that currently occurs without I/O.
- Audit profile, addresses, security and preferences sections and classify each as real, disabled with honest copy, or separately scoped.
- Implement addresses only after an explicit decision and a safe existing ownership contract are confirmed.

## Exclusions

- No invented address/default/fulfilment semantics.
- No unsupported payment-method, password-storage or two-factor features.
- No client-supplied profile/customer ownership IDs.
- No local-state simulation presented as persistence.
- No unrelated admin Customers migration.
- No visual redesign.

## Ownership

Primary:

- `src/features/storefront/account/**`
- account pages under `src/app/account/**`
- canonical account/profile server modules and Server Actions
- account schemas, tests and targeted migrations only when proven necessary

Shared contracts requiring #19 coordination:

- Phase 5 Result/error convention;
- Phase 4 provider-removal dependencies;
- any address-scope decision;
- Phase 1 session contract remains unchanged.

## Required evidence

- Ownership, validation and persistence tests.
- Reload/browser proof that profile changes persist.
- Browser/a11y proof that unsupported sections are truthful and non-deceptive.
- `pnpm` lint/typecheck/test/build results.
- Reviewer completion report.

## Completion criteria

- Profile values load from and save to Prisma.
- Success feedback follows a confirmed server write only.
- Ownership is resolved server-side.
- Unsupported sections have no fake success path.
- Address behaviour follows an explicit decision or remains out of scope.
- Reviewer gate passes or blockers are reported honestly.

## Progress ledger

```text
State: blocked
Completed: phase charter created; profile-only safe default recorded
Current: planner may inventory account sections and schema support
Blocked by: Phase 5 contract and address-scope decision
Contracts changed: none
Validation evidence: none
Next handoff: planner audit → decision record → domain/data if required
```

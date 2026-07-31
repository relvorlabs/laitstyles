# Complete API Plan 07 — Owner Finance Gate

**Plan:** `docs/superpowers/plans/2026-07-28-complete-api-07-owner-finance.md`  
**Spec:** `docs/superpowers/specs/2026-07-28-complete-api-account-payments-design.md`  
**Branch:** `codex/plan-07-owner-finance`  
**Reviewed source head:** `f4e98e8c051757badac2422376d7691817567e49`  
**Reviewer verdict:** **IMPLEMENTATION COMPLETE BY SOURCE REVIEW; EXECUTION GATE BLOCKED**

## Six-role execution record

The implementation followed the fixed role system introduced by commit
`66433b46e164c60a5e1821de21ef964a4f6d7ba8`.

1. **Orchestrator** — synchronized Plan 07 from PR #58, kept checkout/refund/dispute contracts owned by Plans 05/06, sequenced the Plan 07 handoffs, and prevented integration before cleanup.
2. **Planner** — reconciled every Plan 07 task with the approved payments specification and mapped the work across Prisma, provider adapters, domain commands, Route Handlers, typed clients, UI and review evidence.
3. **Data engineer** — hardened payout recipients, transfers, transfer events, settlements and settlement mappings; added encrypted account-number storage, keyed fingerprints, idempotency constraints and the owner-finance migration.
4. **Domain engineer** — implemented Paystack balance, ledger, settlement, bank, recipient and transfer boundaries; finance reconciliation; recent-auth checks; owner-only transfer commands; OTP, failure, reversal and signed-event convergence.
5. **UI engineer** — implemented the owner finance workspace, read-only manager state, provider/local drill-downs, masked recipients, explicit transfer review, OTP continuation and reconciliation status without optimistic financial success.
6. **Reviewer** — reviewed the plan/spec boundaries, corrected persisted-intent crash recovery, restored missing drill-down test mocks, added focused recovery tests, removed temporary infrastructure and recorded actual validation evidence without converting unavailable execution into a pass.

## Implementation matrix

| Plan task | Status | Evidence |
| --- | --- | --- |
| 1. Finance capabilities | Implemented | `finance:read`, owner-only `finance:transfer`, and `payments:refund` use the existing trusted-role permission architecture. |
| 2. Finance read adapters | Implemented | Balance, ledger, transaction detail/timeline/totals, settlements and settlement transactions use strict Paystack normalization and minor-unit amounts. |
| 3. Bank, recipient and transfer adapters | Implemented | Bank lookup, account resolution, recipient lifecycle, transfer initiation/verification, OTP finalization/resend and signed transfer-event normalization are provider-backed. |
| 4. Finance queries and reconciliation | Implemented | Private/no-store finance reads join provider facts to local records and expose matched/provider-only/local-only/amount/currency/status mismatch outcomes without mutating payment state. |
| 5. Recipient and transfer commands | Implemented | Recipient account numbers are encrypted at rest and masked in projections; transfer intents and immutable audit events precede provider calls; unresolved transfers preserve the exact reference. |
| 6. Owner finance APIs | Implemented | Thin `/api/v1/admin/finance/**` handlers separate read and transfer capabilities, enforce trusted origin/recent auth/idempotency and return typed stable envelopes. |
| 7. Owner finance workspace | Implemented | Admin finance overview, ledger/detail, settlements/detail, recipients, transfer review, OTP and reconciliation consumers use typed TanStack Query contracts. |
| 8. Reviewer/live gate | Blocked | Source review and focused test additions are complete, but the configured runners did not execute the requested command suite. |

## Final crash-recovery correction

An idempotent replay no longer returns an unsubmitted local transfer intent as if provider work had completed.

For a pending intent with no provider transfer code, provider status or prior provider synchronization:

1. verify Paystack using the **stored original reference**;
2. when Paystack already knows the transfer, reconcile that provider state locally;
3. only when Paystack reports the reference as absent, submit the persisted command using the same amount, recipient, currency, reason and reference;
4. ambiguous or unavailable provider truth moves the same intent to `needs_reconciliation`;
5. no replay path creates a new transfer reference.

`src/modules/payments/server/transfers.test.ts` covers resumability classification, exact-reference command reconstruction and corrupted persisted-intent rejection.

## Cleanup completed

- Temporary PR #61 is closed and was not merged.
- `.github/workflows/plan07-agent-export.yml` was deleted from the Plan 07 branch.
- The production branch contains no export artifact or temporary validation workflow.

## Validation evidence

A GitHub-hosted completion workflow was triggered against source head
`70065d6adca7bd5e11de82bd56b93d479ad2808a` with PostgreSQL and commands for:

- Prisma validate, migration deploy and migration status;
- focused Plan 07 Vitest files;
- architecture checks;
- Biome;
- TypeScript;
- lint;
- production build;
- React Doctor.

Workflow run `30591434547` completed with `failure`, but GitHub reported an empty job-step list and no downloadable job log. Therefore it failed before any repository command produced evidence. No listed command is reported as passed or failed from that run.

The repository `Implementation Quality` run `30591434582` remained queued on the configured self-hosted runner at review time.

### Commands still requiring executed evidence

```bash
pnpm prisma:validate
pnpm prisma:migrate:deploy
pnpm prisma:migrate:status
pnpm test \
  src/modules/payments/server/paystack/finance.test.ts \
  src/modules/payments/server/paystack/transfers.test.ts \
  src/modules/payments/server/payout-secrets.test.ts \
  src/modules/payments/server/recent-auth.test.ts \
  src/modules/payments/server/reconciliation.test.ts \
  src/modules/payments/server/transfers.test.ts \
  src/modules/payments/server/webhooks/paystack-handler.test.ts \
  src/modules/payments/finance-schema.test.ts \
  src/app/api/v1/admin/finance/finance-routes.test.ts \
  src/modules/payments/ui/finance/finance-workspace.test.tsx
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm lint
pnpm build
pnpm react-doctor
```

## Live acceptance still requiring configured Paystack evidence

- test-business balance, ledger, transaction and settlement reads;
- bank resolution and recipient creation/deactivation;
- transfer initiation with the persisted reference;
- OTP-required finalization and resend limits;
- ambiguous-result reconciliation;
- signed success, failed and reversed webhook replay;
- owner denial/read-only manager behavior in a live authenticated session;
- required responsive, keyboard, theme and accessibility checks.

Unavailable runners, credentials, webhooks or provider features remain explicit blockers and are not treated as successful validation.

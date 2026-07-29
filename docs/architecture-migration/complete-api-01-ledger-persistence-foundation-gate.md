# Plan 01 (ledger-persistence-foundation) - Foundation Reviewer Gate evidence

**Plan:** docs/superpowers/plans/2026-07-28-complete-api-01-ledger-persistence-foundation.md
**Task:** Task 5 - Foundation Reviewer Gate
**Reviewed at:** HEAD c3e8456f on worktree-plan-01-ledger-persistence
**Reviewer verdict:** BLOCKED - one genuine pre-merge security gap found in Step 1 (see below).
All other Step 1 checks and every Step 2 gate command pass cleanly.

## Step 1 - Migration safety inspection

Inspected prisma/migrations/20260729060000_payment_finance_foundation/migration.sql and the
follow-up prisma/migrations/20260729070000_fix_settlement_mapping_fk_actions/migration.sql,
plus the Task 2 account-foundation migration for the codebase's established RLS pattern.

### Indexes
Every new relation created in Task 2/3 has a supporting index: FK columns used in query paths are
indexed (payments_authorization_idx, payment_refunds_payment_requested_idx,
payment_disputes_payment_idx, payout_transfers_recipient_idx,
settlement_transaction_mappings_settlement_idx / _payment_idx / _transfer_idx,
outbox_messages_status_available_idx, idempotency_records_expires_idx, etc.). Audit-trail-only
FK columns (payment_refunds.requested_by_profile_id, payout_recipients.created_by_profile_id,
payout_transfers.initiated_by_profile_id, payout_transfer_events.actor_profile_id) have no
dedicated index - consistent with how existing audit columns elsewhere in this schema are treated,
not a new gap. No missing-index issue found.

### Cascades
Reconfirmed the Task-3 fix-pass: settlement_transaction_mappings.payment_id and
.transfer_id were changed from ON DELETE SET NULL to ON DELETE RESTRICT in migration
20260729070000, which now correctly matches the settlement_transaction_mappings_exactly_one_target
CHECK constraint (a SET NULL would have violated that CHECK on delete). Verified this migration
does not touch the already-deployed 20260729060000 file (avoids checksum mismatch) and does not
regress the intentional CASCADE deletes (e.g. payment_authorizations -> customers CASCADE,
payment_refunds/payment_disputes -> payments CASCADE, payout_transfer_events ->
payout_transfers CASCADE) or the intentional SET NULL on optional/nullable references
(payment_refunds.return_id, *_profile_id actor columns, payments.payment_authorization_id).
All cascades read as intentional for their relation's ownership semantics.

### Financial amount checks
Confirmed 22 CHECK constraints in 20260729060000 covering: positive/non-negative amount guards on
every money column (payments.amount, payment_refunds.requested_amount/processed_amount,
payment_disputes.amount, payout_transfers.amount, provider_settlements.total_amount/
total_fees, settlement_transaction_mappings.amount/fee), a refund-cannot-exceed-request guard,
an exactly-one-target guard on settlement mappings, a default-authorization-must-be-active guard, and
terminal-state-timestamp-matches-status guards on every state machine table. Task 3's review record
cited "20" and the actual count is 22 (undercounted, nothing missing) - confirmed here as a
non-blocking cosmetic correction, not a new finding.

### RLS - the safety call

Call: the current RLS gap on payment_authorizations and payment_refunds is a genuine
must-fix-before-merge exposure, not an acceptable-to-ship gap. This blocks the gate.

Reasoning:

1. Established codebase pattern. Every other customer-visible table in this schema -
   profiles, profile_details, customers (from 20260724121500_supabase_auth_profile_bridge),
   and all nine Task 2 account-preference/support tables (from 20260728205817_complete_account_foundation)
   - has RLS enabled with explicit owner-scoped policies deriving ownership from
   (select auth.uid()) joined through profiles/customers. payment_authorizations and
   payment_refunds are payment-method and refund records scoped to an individual customer -
   the same shape of data as every table that already gets this treatment. They currently have
   zero RLS enabled at all (not "RLS enabled with no policies," which would at least default-deny
   through PostgreSQL - RLS is simply off).
2. Real, present exposure vector - not contingent on future Route Handlers. src/lib/supabase/client.ts
   already instantiates a browser-side Supabase client (createBrowserClient) using the public/publishable
   key, and it is referenced from live auth code today. Supabase exposes every public-schema table
   through PostgREST by default (via the standard anon/authenticated role grants Supabase applies
   at project provisioning), and nothing in this migration history revokes those default grants -
   confirmed by grepping all migrations for revoke/grant: none exist. That means the absence of
   application Route Handlers/Server Actions querying these tables (the point raised in the task
   context) does not close the exposure: any authenticated end user's browser session can call
   supabase.from('payment_authorizations').select('*') directly against PostgREST today and, with
   no RLS enabled, receive every customer's stored authorization codes, signatures, card
   metadata (last4, bank, exp_month/exp_year) and refund records - not just their own. This is
   independent of and prior to any Task 5+/Plan 02+ application code being written.
3. Consistent with the plan-suite's own stated global constraint: "New exposed public tables
   require reviewed RLS SQL in the Prisma migration." payment_authorizations/payment_refunds
   are exposed public tables carrying the most sensitive data in the whole plan.

The four other RLS-less tables from Task 3 (provider_webhook_events, payment_disputes,
idempotency_records, outbox_messages) are judged differently, per the task context, and that
judgment is affirmed here: they are server-only/operational tables with no natural per-customer
owner shape and no legitimate reason for a browser client ever to query them directly; leaving
them RLS-disabled (relying on the server's privileged connection being the only writer/reader) is
consistent with how this repo already treats purely internal tables.

Recommendation: dispatch a follow-up implementer task to add owner-scoped RLS policies to
payment_authorizations (owner = customers.profile_id via customer_id) and payment_refunds
(owner = the payments.customer_id the refund's payment_id points to), mirroring the guarded
do $$ ... $$ pattern already used in 20260728205817_complete_account_foundation/migration.sql,
before Plan 01 is merged and Plans 02-04 are unblocked. This was not implemented in this task -
Task 5 is a reviewer/gate task with no source-edit mandate.

## Step 2 - Authoritative focused gates

All commands run from the worktree with .env.local sourced (set -a && source .env.local && set +a)
where DB connectivity was required.

| Command | Result |
| --- | --- |
| pnpm prisma:format | PASS - "Formatted prisma in 1.07s" |
| pnpm prisma:validate | PASS - "The schemas at prisma are valid" |
| pnpm prisma:generate | PASS - Prisma Client v7.8.0 generated |
| pnpm prisma:migrate:status | PASS - "Database schema is up to date!" (7 migrations found, applied) |
| pnpm test src/modules/account-persistence-boundary.test.ts src/modules/payment-persistence-boundary.test.ts src/modules/operations | PASS - 5 test files, 22/22 tests passed |
| pnpm check:architecture | Raw exit code 1 (1 error, 1 warning), but both findings are pre-existing and out of Plan 01's scope: src/features/storefront/account/modals/account-modals.tsx (963 lines, god-module error) and src/modules/auth/ui/auth-dialog.tsx (642 lines, warning) - confirmed both already exceeded these thresholds at the plan's base commit 54570e02 (962/641 lines respectively) and neither file appears in Plan 01's changed-file set (git diff --stat 54570e02..HEAD -- src prisma). No new architecture-guard failure introduced by this plan. |
| pnpm biome | Raw exit code 1 (56 errors, 63 warnings), but confirmed zero overlap with any file this plan touched (prisma/*.prisma, prisma/migrations/**, src/modules/operations/**, src/modules/*-persistence-boundary.test.ts) - all findings are in unrelated app routes/admin pages (src/app/auth/**, src/app/admin/*/loading.tsx, etc.), largely CRLF/formatting noise on files never modified by any Plan 01 task. No new Biome failure introduced by this plan. |
| pnpm typecheck | PASS - tsc --noEmit exit code 0, no diagnostics |

Full-suite pnpm test was not run per the task brief's explicit scoping to the command above; the
brief notes roughly 10 pre-existing unrelated failures exist in the full suite and are not this
gate's concern.

## Outcome

Step 2 gates are entirely clean for Plan 01's own scope (no new failures anywhere). Step 1 surfaces
one genuine, reasoned BLOCKING finding: payment_authorizations/payment_refunds need owner-scoped
RLS policies before this plan can be considered merge-ready, because the exposure is real today
(browser Supabase client plus default PostgREST grants), not merely theoretical or deferred to
future application code. No RLS SQL was added in this task, per Task 5's reviewer-only, no-source-
edit mandate - this is a fix to be dispatched as a follow-up implementer task.

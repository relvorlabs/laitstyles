# Plan 01, Task 3: Add Payment, Refund and Finance Persistence — report

Plan: docs/superpowers/plans/2026-07-28-complete-api-01-ledger-persistence-foundation.md
Worktree: C:/Users/olaitan/Dev/laitstyles/.claude/worktrees/plan-01-ledger-persistence
Branch: worktree-plan-01-ledger-persistence
Commit: aea741f5 "feat(payments): add financial operation records"

## Starting point

Picked up an uncommitted, interrupted attempt already in the working tree: the Step 1 test
(`src/modules/payment-persistence-boundary.test.ts`), the two new schema files
(`prisma/payment-operations.prisma`, `prisma/payout-finance.prisma`), and the `payments`
extension in `prisma/schema.prisma`. Reviewed the draft against the brief's Step 3 requirements
(Decimal(12,2) money, string provider IDs, the six named unique constraints, `raw_response` not
exposed through public types) and found it complete and correct — kept it as-is rather than
redoing it.

## Work done

1. **RED verified**: `pnpm test src/modules/payment-persistence-boundary.test.ts` failed with
   `expected undefined to be defined` for every new delegate (env vars had to be sourced from
   `.env.local` into the shell first — `pnpm test` does not auto-load them; `prisma.config.ts`
   only loads `.env.local` for the Prisma CLI, not for vitest).
2. **Migration generated via the documented P4002 workaround**: snapshotted `prisma/` from HEAD
   (commit 77625744, before this task's changes) via `git archive`, then ran
   `prisma migrate diff --from-schema=<snapshot>/prisma --to-schema=prisma --script` (pure
   schema-to-schema diff, no live DB touched). Hand-placed the output into
   `prisma/migrations/20260729060000_payment_finance_foundation/migration.sql`.
3. **Hardened the migration** (appended after the generated DDL, following Task 2's
   "Reviewed constraints" convention):
   - Positive/non-negative amount CHECKs on `payments.amount`, `payment_refunds.requested_amount`/
     `processed_amount`, `payment_disputes.amount`, `payout_transfers.amount`,
     `provider_settlements.total_amount`/`total_fees`, `settlement_transaction_mappings.amount`/`fee`.
   - `payment_refunds_processed_not_exceeding_requested`: `processed_amount <= requested_amount`.
   - `payment_authorizations_default_requires_active`: closes the gap the existing partial unique
     index (`payment_authorizations_one_default_unique`, one `is_default=true` row per customer)
     leaves open — a non-`active` authorization can never be marked default. Together the two
     constraints enforce "one active default authorization per customer".
   - Terminal-state timestamp pairing CHECKs (status ⇔ timestamp-not-null) on
     `payment_authorizations.deactivated_at`, `payment_refunds.processed_at`/`failed_at`,
     `provider_webhook_events.processed_at`, `payment_disputes.resolved_at`,
     `payout_transfers.completed_at`, `provider_settlements.settled_at`,
     `idempotency_records.completed_at`, `outbox_messages.sent_at`, plus
     `payments.verified_at`/`verification_source` (set together or not at all).
   - `settlement_transaction_mappings_exactly_one_target`: exactly one of `payment_id`/`transfer_id`.
   - All new tables are empty at creation time in this migration, and `payments` (pre-existing)
     was verified empty in the target DB before adding a CHECK to it, so no constraint needed
     `NOT VALID`.
   - RLS enabled (no `authenticated`/consumer policies) on exactly the 5 tables the brief named:
     `payout_recipients`, `payout_transfers`, `payout_transfer_events`, `provider_settlements`,
     `settlement_transaction_mappings`. Verified post-apply via a direct query
     (`pg_class.relrowsecurity`) that RLS is `true` on those 5 and `false` on
     `payment_authorizations`/`payment_refunds`, matching intent.
   - Left `payment_authorizations`/`payment_refunds` (customer-visible, owner-scoped policies out
     of this task's named RLS scope) and `provider_webhook_events`/`payment_disputes`/
     `idempotency_records`/`outbox_messages` (Task 4's tables) without RLS — noted in-migration.
4. Applied via `pnpm prisma:migrate:deploy` (not `migrate dev` — no drift check, just applies the
   pending folder). Ran the full Step 5 sequence: `prisma:format`, `prisma:validate`,
   `prisma:generate`, `prisma:migrate:status` (all clean/up to date), then the boundary test —
   GREEN.
5. Queried the DB directly to confirm all 20 hand-written CHECK constraints and the 5 RLS flags
   landed as written (not just that the migration file "looked right").
6. Ran the full `pnpm test` suite. 10 files / 12 tests failed, all pre-existing and unrelated
   (admin inventory route 400-vs-422 status code mismatches, a storefront type-ownership
   facade-import assertion) — none import Prisma or touch anything this task changed. Confirmed
   by `git stash`-ing this task's changes and re-running the two representative failing files
   against clean HEAD: identical failures. Popped the stash, regenerated the Prisma client, and
   re-ran the boundary test — still GREEN.
7. Committed per Step 6's exact message, staging only `prisma/**` and the test file (left
   `.claude/settings.local.json`'s pre-existing benign diff untouched and unstaged, per the
   task's instruction).

## Files touched (all under this worktree)

- `C:\Users\olaitan\Dev\laitstyles\.claude\worktrees\plan-01-ledger-persistence\prisma\schema.prisma`
- `C:\Users\olaitan\Dev\laitstyles\.claude\worktrees\plan-01-ledger-persistence\prisma\payment-operations.prisma`
- `C:\Users\olaitan\Dev\laitstyles\.claude\worktrees\plan-01-ledger-persistence\prisma\payout-finance.prisma`
- `C:\Users\olaitan\Dev\laitstyles\.claude\worktrees\plan-01-ledger-persistence\prisma\migrations\20260729060000_payment_finance_foundation\migration.sql`
- `C:\Users\olaitan\Dev\laitstyles\.claude\worktrees\plan-01-ledger-persistence\src\modules\payment-persistence-boundary.test.ts`

## Concerns / notes for the reviewer

- The migration folder name (`20260729060000_payment_finance_foundation`) was hand-chosen (no
  live `migrate dev` run to generate a timestamp), following the same pattern Task 2 used.
- RLS scope was interpreted literally from the brief's named list of 5 tables; `payment_authorizations`
  and `payment_refunds` — customer-visible — do not yet have owner-scoped RLS policies. This is a
  conscious, documented gap (see migration comment), not an oversight, but worth the whole-branch
  reviewer's attention before Plan 01 is considered fully closed.
- `pnpm test` (full suite) has 10 pre-existing failing files unrelated to this task (admin
  inventory route status-code assertions, storefront type-ownership). Confirmed pre-existing via
  stash-and-rerun against clean HEAD; not touched by this task.

## Fix: settlement mapping FK actions

Review finding on commit `aea741f5`: `settlement_transaction_mappings.payment_id`/`.transfer_id`
used `onDelete: SetNull` on their relations to `payments`/`payout_transfers`, but the same
migration's `settlement_transaction_mappings_exactly_one_target` CHECK requires exactly one of
the two columns to be non-null at all times. A delete of a referenced `payments` or
`payout_transfers` row would make Postgres attempt to null the referencing column, which the
CHECK would then reject — the SetNull action could never actually succeed. Fixed by switching
both relations to `onDelete: Restrict`, matching the existing `payout_transfers → payout_recipients`
pattern already in `prisma/payout-finance.prisma`.

### What changed

- `prisma/payout-finance.prisma`: `settlement_transaction_mappings.payments` and
  `.payout_transfers` relations changed from `onDelete: SetNull` to `onDelete: Restrict`.
- New migration `prisma/migrations/20260729070000_fix_settlement_mapping_fk_actions/migration.sql`
  (the already-deployed `20260729060000_payment_finance_foundation/migration.sql` was left
  untouched to avoid a checksum mismatch on `prisma migrate status`/`deploy`).

### Migration-diff sanity check

Snapshotted `prisma/` from `aea741f5` (`git archive aea741f5 prisma | tar -x -C <tmpdir>`) and ran:

```
prisma migrate diff --from-schema=<tmpdir>/prisma --to-schema=prisma --script
```

Output was exactly the two expected FK changes, nothing else:

```sql
-- DropForeignKey
ALTER TABLE "settlement_transaction_mappings" DROP CONSTRAINT "settlement_transaction_mappings_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "settlement_transaction_mappings" DROP CONSTRAINT "settlement_transaction_mappings_transfer_id_fkey";

-- AddForeignKey
ALTER TABLE "settlement_transaction_mappings" ADD CONSTRAINT "settlement_transaction_mappings_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_transaction_mappings" ADD CONSTRAINT "settlement_transaction_mappings_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "payout_transfers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
```

This was hand-placed into the new migration folder verbatim (no live DB touched to generate it).

### Apply and verify

Applied via `pnpm prisma:migrate:deploy` — `Applying migration \`20260729070000_fix_settlement_mapping_fk_actions\`` /
`All migrations have been successfully applied.`

Ran the full Step 5 sequence, all clean:

- `pnpm prisma:format` → `Formatted prisma in 975ms`
- `pnpm prisma:validate` → `The schemas at prisma are valid`
- `pnpm prisma:generate` → `Generated Prisma Client (v7.8.0)`
- `pnpm prisma:migrate:status` → `7 migrations found in prisma/migrations` / `Database schema is up to date!`

Re-ran the boundary test with `DATABASE_URL` (and the rest of `.env.local`) sourced into the
shell first (same requirement noted in the original report — `pnpm test` does not auto-load
`.env.local`):

```
pnpm test src/modules/payment-persistence-boundary.test.ts
```

Result: `Test Files  1 passed (1)` / `Tests  1 passed (1)` — GREEN, unchanged from before this fix
(this change doesn't touch the test-covered surface).

### Direct DB verification

Queried `pg_constraint` directly for all foreign keys on `settlement_transaction_mappings`:

```sql
SELECT conname, confdeltype::text AS confdeltype
FROM pg_constraint
WHERE conrelid = 'public.settlement_transaction_mappings'::regclass
  AND contype = 'f'
ORDER BY conname;
```

Result:

```json
[
  { "conname": "settlement_transaction_mappings_payment_id_fkey", "confdeltype": "r" },
  { "conname": "settlement_transaction_mappings_settlement_id_fkey", "confdeltype": "c" },
  { "conname": "settlement_transaction_mappings_transfer_id_fkey", "confdeltype": "r" }
]
```

`payment_id_fkey` and `transfer_id_fkey` are now `r` (RESTRICT), matching the schema change.
`settlement_id_fkey` remains `c` (CASCADE, unchanged — correct, since a settlement row cascading
its own mapping rows is the intended behavior for that relation).

### Minor note on the original report's CHECK constraint count

The original report (line 61, "Work done" step 5) said "20 hand-written CHECK constraints." A
direct count in `20260729060000_payment_finance_foundation/migration.sql` is 22. The count in the
prose was wrong; nothing is functionally missing — this is a documentation correction only.

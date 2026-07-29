-- CreateEnum
CREATE TYPE "payment_authorization_status" AS ENUM ('pending', 'active', 'challenged', 'inactive');

-- CreateEnum
CREATE TYPE "payment_refund_status" AS ENUM ('pending', 'processing', 'needs_attention', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "provider_webhook_event_status" AS ENUM ('received', 'processing', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "payment_dispute_status" AS ENUM ('awaiting_evidence', 'pending', 'resolved', 'declined');

-- CreateEnum
CREATE TYPE "idempotency_status" AS ENUM ('in_progress', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "payment_verification_source" AS ENUM ('webhook', 'manual_verify', 'callback');

-- CreateEnum
CREATE TYPE "payout_transfer_status" AS ENUM ('pending', 'otp_required', 'processing', 'success', 'failed', 'reversed');

-- CreateEnum
CREATE TYPE "payout_transfer_event_kind" AS ENUM ('initiated', 'otp_requested', 'otp_verified', 'success', 'failed', 'reversed', 'note');

-- CreateEnum
CREATE TYPE "settlement_status" AS ENUM ('pending', 'success', 'failed');

-- CreateEnum
CREATE TYPE "outbox_message_status" AS ENUM ('pending', 'processing', 'sent', 'failed');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "failure_code" TEXT,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "payment_authorization_id" UUID,
ADD COLUMN     "provider_customer_code" TEXT,
ADD COLUMN     "verification_source" "payment_verification_source",
ADD COLUMN     "verified_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "payment_authorizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL DEFAULT 'paystack',
    "provider_customer_code" TEXT,
    "authorization_code" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "payment_authorization_status" NOT NULL DEFAULT 'pending',
    "reusable" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT,
    "card_type" TEXT,
    "bank" TEXT,
    "last4" TEXT,
    "exp_month" TEXT,
    "exp_year" TEXT,
    "continuation_url" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "deactivated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "return_id" UUID,
    "provider" "payment_provider" NOT NULL DEFAULT 'paystack',
    "provider_reference" TEXT,
    "requested_amount" DECIMAL(12,2) NOT NULL,
    "processed_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "status" "payment_refund_status" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "failure_reason" TEXT,
    "requested_by_profile_id" UUID,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "payment_provider" NOT NULL DEFAULT 'paystack',
    "event_type" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "provider_webhook_event_status" NOT NULL DEFAULT 'received',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_disputes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL DEFAULT 'paystack',
    "provider_dispute_id" TEXT NOT NULL,
    "status" "payment_dispute_status" NOT NULL DEFAULT 'awaiting_evidence',
    "category" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "reason" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "evidence_due_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "idempotency_status" NOT NULL DEFAULT 'in_progress',
    "request_hash" TEXT,
    "response_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "payment_provider" NOT NULL DEFAULT 'paystack',
    "recipient_code" TEXT NOT NULL,
    "recipient_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank_name" TEXT,
    "bank_code" TEXT,
    "account_number_last4" TEXT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_profile_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL DEFAULT 'paystack',
    "reference" TEXT NOT NULL,
    "provider_transfer_code" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "reason" TEXT,
    "status" "payout_transfer_status" NOT NULL DEFAULT 'pending',
    "otp_required" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" TEXT,
    "initiated_by_profile_id" UUID,
    "initiated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_transfer_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_id" UUID NOT NULL,
    "kind" "payout_transfer_event_kind" NOT NULL,
    "status" "payout_transfer_status",
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_profile_id" UUID,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "payout_transfer_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_settlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "payment_provider" NOT NULL DEFAULT 'paystack',
    "provider_settlement_id" TEXT NOT NULL,
    "status" "settlement_status" NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "total_fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "settled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_transaction_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settlement_id" UUID NOT NULL,
    "payment_id" UUID,
    "transfer_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_transaction_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_message_status" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_authorizations_customer_status_idx" ON "payment_authorizations"("customer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_authorizations_one_default_unique" ON "payment_authorizations"("customer_id") WHERE ("is_default" = true);

-- CreateIndex
CREATE UNIQUE INDEX "payment_authorizations_customer_provider_signature_unique" ON "payment_authorizations"("customer_id", "provider", "signature");

-- CreateIndex
CREATE UNIQUE INDEX "payment_authorizations_provider_code_unique" ON "payment_authorizations"("provider", "authorization_code");

-- CreateIndex
CREATE INDEX "payment_refunds_payment_requested_idx" ON "payment_refunds"("payment_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "payment_refunds_return_idx" ON "payment_refunds"("return_id");

-- CreateIndex
CREATE INDEX "payment_refunds_status_updated_idx" ON "payment_refunds"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_provider_reference_unique" ON "payment_refunds"("provider", "provider_reference") WHERE (provider_reference IS NOT NULL);

-- CreateIndex
CREATE INDEX "provider_webhook_events_status_received_idx" ON "provider_webhook_events"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_webhook_events_provider_event_unique" ON "provider_webhook_events"("provider", "event_id");

-- CreateIndex
CREATE INDEX "payment_disputes_payment_idx" ON "payment_disputes"("payment_id");

-- CreateIndex
CREATE INDEX "payment_disputes_status_evidence_due_idx" ON "payment_disputes"("status", "evidence_due_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_disputes_provider_dispute_unique" ON "payment_disputes"("provider", "provider_dispute_id");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_idx" ON "idempotency_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_scope_key_unique" ON "idempotency_records"("scope", "idempotency_key");

-- CreateIndex
CREATE INDEX "payout_recipients_active_idx" ON "payout_recipients"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "payout_recipients_provider_code_unique" ON "payout_recipients"("provider", "recipient_code");

-- CreateIndex
CREATE INDEX "payout_transfers_recipient_idx" ON "payout_transfers"("recipient_id");

-- CreateIndex
CREATE INDEX "payout_transfers_status_updated_idx" ON "payout_transfers"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payout_transfers_provider_reference_unique" ON "payout_transfers"("provider", "reference");

-- CreateIndex
CREATE INDEX "payout_transfer_events_transfer_occurred_idx" ON "payout_transfer_events"("transfer_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "provider_settlements_status_settled_idx" ON "provider_settlements"("status", "settled_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_settlements_provider_id_unique" ON "provider_settlements"("provider", "provider_settlement_id");

-- CreateIndex
CREATE INDEX "settlement_transaction_mappings_settlement_idx" ON "settlement_transaction_mappings"("settlement_id");

-- CreateIndex
CREATE INDEX "settlement_transaction_mappings_payment_idx" ON "settlement_transaction_mappings"("payment_id");

-- CreateIndex
CREATE INDEX "settlement_transaction_mappings_transfer_idx" ON "settlement_transaction_mappings"("transfer_id");

-- CreateIndex
CREATE INDEX "outbox_messages_status_available_idx" ON "outbox_messages"("status", "available_at");

-- CreateIndex
CREATE INDEX "payments_authorization_idx" ON "payments"("payment_authorization_id");

-- AddForeignKey
ALTER TABLE "payment_authorizations" ADD CONSTRAINT "payment_authorizations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_requested_by_profile_id_fkey" FOREIGN KEY ("requested_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_recipients" ADD CONSTRAINT "payout_recipients_created_by_profile_id_fkey" FOREIGN KEY ("created_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_transfers" ADD CONSTRAINT "payout_transfers_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "payout_recipients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_transfers" ADD CONSTRAINT "payout_transfers_initiated_by_profile_id_fkey" FOREIGN KEY ("initiated_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_transfer_events" ADD CONSTRAINT "payout_transfer_events_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "payout_transfers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payout_transfer_events" ADD CONSTRAINT "payout_transfer_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_transaction_mappings" ADD CONSTRAINT "settlement_transaction_mappings_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "provider_settlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_transaction_mappings" ADD CONSTRAINT "settlement_transaction_mappings_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "settlement_transaction_mappings" ADD CONSTRAINT "settlement_transaction_mappings_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "payout_transfers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_authorization_id_fkey" FOREIGN KEY ("payment_authorization_id") REFERENCES "payment_authorizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;


-- ---------------------------------------------------------------------------
-- This migration was produced via schema-to-schema `prisma migrate diff`
-- (old snapshot: git archive of the prior commit's prisma/ directory, new:
-- the working schema), not `prisma migrate dev`, because `migrate dev`/`diff
-- --from-config-datasource`/`--from-migrations` all fail with P4002 against
-- this project's dev/staging database (a real cross-schema FK,
-- `profiles_auth_user_fk`, that `schemas = ["public"]` deliberately excludes).
-- Applied with `prisma migrate deploy`, which does not drift-check. See
-- .superpowers/sdd/plan-01-progress.md for the full workaround record.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Reviewed constraints (hand-written, appended to the generated DDL above).
-- `payments` is a pre-existing table but has zero rows in this database at
-- migration time (verified before writing this migration), and every other
-- table below is newly created in this same migration, so no CHECK
-- constraint here needs NOT VALID.
-- ---------------------------------------------------------------------------

-- Positive/non-negative money amounts.
alter table public.payments
  add constraint payments_amount_positive
  check (amount > 0);

alter table public.payment_refunds
  add constraint payment_refunds_requested_amount_positive
  check (requested_amount > 0);

alter table public.payment_refunds
  add constraint payment_refunds_processed_amount_non_negative
  check (processed_amount >= 0);

-- A refund can never process more than what was requested.
alter table public.payment_refunds
  add constraint payment_refunds_processed_not_exceeding_requested
  check (processed_amount <= requested_amount);

alter table public.payment_disputes
  add constraint payment_disputes_amount_positive
  check (amount > 0);

alter table public.payout_transfers
  add constraint payout_transfers_amount_positive
  check (amount > 0);

alter table public.provider_settlements
  add constraint provider_settlements_total_amount_non_negative
  check (total_amount >= 0);

alter table public.provider_settlements
  add constraint provider_settlements_total_fees_non_negative
  check (total_fees >= 0);

alter table public.settlement_transaction_mappings
  add constraint settlement_transaction_mappings_amount_non_negative
  check (amount >= 0);

alter table public.settlement_transaction_mappings
  add constraint settlement_transaction_mappings_fee_non_negative
  check (fee >= 0);

-- A settlement line reconciles exactly one of a captured payment or an
-- outgoing transfer, never both and never neither.
alter table public.settlement_transaction_mappings
  add constraint settlement_transaction_mappings_exactly_one_target
  check (
    (payment_id is not null and transfer_id is null)
    or (payment_id is null and transfer_id is not null)
  );

-- One ACTIVE default authorization per customer. The partial unique index
-- `payment_authorizations_one_default_unique` (above, generated from the
-- Prisma `@@unique(..., where: { is_default: true })` attribute) already
-- guarantees at most one row per customer has `is_default = true`; this
-- CHECK closes the remaining gap by forbidding a non-active authorization
-- from ever being marked default in the first place.
alter table public.payment_authorizations
  add constraint payment_authorizations_default_requires_active
  check (not is_default or status = 'active'::public.payment_authorization_status);

-- Terminal-state timestamps: a state-machine timestamp column must be set
-- if and only if the row is in the state(s) it records.
alter table public.payment_authorizations
  add constraint payment_authorizations_deactivated_at_matches_status
  check (
    (status = 'inactive'::public.payment_authorization_status) = (deactivated_at is not null)
  );

alter table public.payment_refunds
  add constraint payment_refunds_processed_at_matches_status
  check (
    (status = 'processed'::public.payment_refund_status) = (processed_at is not null)
  );

alter table public.payment_refunds
  add constraint payment_refunds_failed_at_matches_status
  check (
    (status = 'failed'::public.payment_refund_status) = (failed_at is not null)
  );

-- provider_webhook_events has a single terminal timestamp column shared by
-- both terminal outcomes (successfully processed or given up on).
alter table public.provider_webhook_events
  add constraint provider_webhook_events_processed_at_matches_status
  check (
    (status in ('processed'::public.provider_webhook_event_status, 'failed'::public.provider_webhook_event_status))
    = (processed_at is not null)
  );

alter table public.payment_disputes
  add constraint payment_disputes_resolved_at_matches_status
  check (
    (status in ('resolved'::public.payment_dispute_status, 'declined'::public.payment_dispute_status))
    = (resolved_at is not null)
  );

alter table public.payout_transfers
  add constraint payout_transfers_completed_at_matches_status
  check (
    (status in (
      'success'::public.payout_transfer_status,
      'failed'::public.payout_transfer_status,
      'reversed'::public.payout_transfer_status
    ))
    = (completed_at is not null)
  );

alter table public.provider_settlements
  add constraint provider_settlements_settled_at_matches_status
  check (
    (status = 'success'::public.settlement_status) = (settled_at is not null)
  );

alter table public.idempotency_records
  add constraint idempotency_records_completed_at_matches_status
  check (
    (status in ('completed'::public.idempotency_status, 'failed'::public.idempotency_status))
    = (completed_at is not null)
  );

alter table public.outbox_messages
  add constraint outbox_messages_sent_at_matches_status
  check (
    (status = 'sent'::public.outbox_message_status) = (sent_at is not null)
  );

-- `payments.verified_at`/`verification_source` are set together, or not at
-- all, mirroring the terminal-timestamp pairing above.
alter table public.payments
  add constraint payments_verified_at_matches_verification_source
  check ((verified_at is null) = (verification_source is null));

-- ---------------------------------------------------------------------------
-- Row level security: owner-only payout/settlement tables. These tables are
-- staff/system-managed store finance records with no per-customer owner --
-- there is no `authenticated`-role policy on any of them, so the anon/
-- authenticated Supabase roles have no access at all once RLS is enabled;
-- only the server's privileged (RLS-bypassing) connection can read or write.
-- Enabling RLS does not require `auth.uid()`/the `authenticated` role to
-- exist, so (unlike the policy-creation blocks in
-- 20260724121500_supabase_auth_profile_bridge and
-- 20260728205817_complete_account_foundation) this is not guarded -- it must
-- succeed the same way against a bare PostgreSQL database used by
-- `prisma migrate reset`/CI.
--
-- `payment_authorizations`, `payment_refunds`, `provider_webhook_events`,
-- `payment_disputes`, `idempotency_records` and `outbox_messages` are
-- consciously left without RLS here: the first two are customer-visible
-- financial records whose owner-scoped policies are out of this task's
-- named scope, and the remaining four are internal operational tables that
-- Task 4 (idempotency/webhook-inbox/outbox operations) owns.
-- ---------------------------------------------------------------------------
alter table public.payout_recipients enable row level security;
alter table public.payout_transfers enable row level security;
alter table public.payout_transfer_events enable row level security;
alter table public.provider_settlements enable row level security;
alter table public.settlement_transaction_mappings enable row level security;

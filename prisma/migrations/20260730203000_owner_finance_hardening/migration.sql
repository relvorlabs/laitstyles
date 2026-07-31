-- Plan 07 owner-finance persistence hardening.
-- Existing rows remain readable; new domain commands populate encrypted and
-- reconciliation fields before any provider mutation.

ALTER TYPE "payout_transfer_status" ADD VALUE IF NOT EXISTS 'needs_reconciliation';
ALTER TYPE "payout_transfer_event_kind" ADD VALUE IF NOT EXISTS 'reconciliation_requested';
ALTER TYPE "settlement_status" ADD VALUE IF NOT EXISTS 'processing';

ALTER TABLE "payout_recipients"
  ADD COLUMN "account_name" TEXT,
  ADD COLUMN "account_number_ciphertext" TEXT,
  ADD COLUMN "account_fingerprint" TEXT,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(6),
  ADD COLUMN "provider_snapshot" JSONB NOT NULL DEFAULT '{}';

DROP INDEX IF EXISTS "payout_recipients_active_idx";
CREATE INDEX "payout_recipients_active_idx"
  ON "payout_recipients"("is_active", "deleted_at");
CREATE UNIQUE INDEX "payout_recipients_account_fingerprint_unique"
  ON "payout_recipients"("provider", "currency", "bank_code", "account_fingerprint")
  WHERE "account_fingerprint" IS NOT NULL AND "deleted_at" IS NULL;

ALTER TABLE "payout_transfers"
  ADD COLUMN "provider_status" TEXT,
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "request_hash" TEXT,
  ADD COLUMN "otp_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reconciliation_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "provider_response" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "last_otp_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "last_provider_sync_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "payout_transfers_provider_code_unique"
  ON "payout_transfers"("provider", "provider_transfer_code")
  WHERE "provider_transfer_code" IS NOT NULL;
CREATE UNIQUE INDEX "payout_transfers_provider_idempotency_unique"
  ON "payout_transfers"("provider", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX "payout_transfers_reconciliation_idx"
  ON "payout_transfers"("reconciliation_required", "updated_at");

ALTER TABLE "payout_transfer_events"
  ADD COLUMN "provider_event_id" TEXT,
  ADD COLUMN "provider_snapshot" JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX "payout_transfer_events_provider_event_unique"
  ON "payout_transfer_events"("provider_event_id")
  WHERE "provider_event_id" IS NOT NULL;

ALTER TABLE "provider_settlements"
  ADD COLUMN "effective_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "total_processed" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "settlement_account_name" TEXT,
  ADD COLUMN "settlement_account_number_last4" TEXT,
  ADD COLUMN "provider_snapshot" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "last_provider_sync_at" TIMESTAMPTZ(6);

ALTER TABLE "settlement_transaction_mappings"
  ADD COLUMN "provider_transaction_id" TEXT,
  ADD COLUMN "provider_reference" TEXT;
CREATE UNIQUE INDEX "settlement_transaction_provider_unique"
  ON "settlement_transaction_mappings"("settlement_id", "provider_transaction_id")
  WHERE "provider_transaction_id" IS NOT NULL;
CREATE INDEX "settlement_transaction_reference_idx"
  ON "settlement_transaction_mappings"("provider_reference");

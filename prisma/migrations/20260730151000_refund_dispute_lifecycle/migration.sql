-- Plan 06 refund/dispute command identity and provider reconciliation facts.

ALTER TABLE "public"."payment_refunds"
  ADD COLUMN "provider_status" TEXT,
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_provider_sync_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "payment_refunds_payment_idempotency_unique"
  ON "public"."payment_refunds"("payment_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "public"."payment_refunds"
  ADD CONSTRAINT "payment_refunds_requested_amount_positive"
    CHECK ("requested_amount" > 0) NOT VALID,
  ADD CONSTRAINT "payment_refunds_processed_amount_bounds"
    CHECK ("processed_amount" >= 0 AND "processed_amount" <= "requested_amount") NOT VALID;

ALTER TABLE "public"."payment_disputes"
  ADD COLUMN "provider_status" TEXT,
  ADD COLUMN "last_provider_sync_at" TIMESTAMPTZ(6),
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "public"."payment_disputes"
  ADD CONSTRAINT "payment_disputes_amount_positive"
    CHECK ("amount" > 0) NOT VALID;

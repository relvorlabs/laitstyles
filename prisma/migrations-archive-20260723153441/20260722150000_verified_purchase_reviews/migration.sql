-- Preserve the existing review lifecycle while aligning the public value with
-- storefront terminology.
ALTER TYPE "public"."review_status" RENAME VALUE 'approved' TO 'published';
ALTER TYPE "public"."review_status" ADD VALUE 'withdrawn';

-- CreateEnum
CREATE TYPE "public"."order_line_fulfilment_status" AS ENUM (
  'unfulfilled',
  'processing',
  'ready_for_dispatch',
  'dispatched',
  'partially_delivered',
  'delivered',
  'partially_cancelled',
  'cancelled',
  'partially_returned',
  'returned'
);

-- CreateEnum
CREATE TYPE "public"."order_line_refund_status" AS ENUM (
  'not_refunded',
  'partially_refunded',
  'refunded'
);

-- CreateEnum
CREATE TYPE "public"."review_fit" AS ENUM (
  'runs_small',
  'true_to_size',
  'runs_large',
  'not_applicable'
);

-- Add the customer-facing order identifier, then backfill existing rows from
-- their immutable UUIDs before enforcing the invariant.
ALTER TABLE "public"."orders" ADD COLUMN "order_number" TEXT;

UPDATE "public"."orders"
SET "order_number" = 'LS-' || upper(substr(replace("id"::text, '-', ''), 1, 10));

ALTER TABLE "public"."orders"
  ALTER COLUMN "order_number" SET NOT NULL;

CREATE UNIQUE INDEX "orders_order_number_unique"
  ON "public"."orders"("order_number");

-- Add line-level fulfilment and refund facts. Historical rows intentionally
-- remain unfulfilled rather than inferring delivery from the aggregate order.
ALTER TABLE "public"."order_lines"
  ADD COLUMN "fulfilment_status" "public"."order_line_fulfilment_status" NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN "delivered_quantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "delivered_at" TIMESTAMPTZ(6),
  ADD COLUMN "cancelled_quantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "refund_status" "public"."order_line_refund_status" NOT NULL DEFAULT 'not_refunded',
  ADD COLUMN "refunded_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "refunded_at" TIMESTAMPTZ(6),
  ADD CONSTRAINT "order_lines_delivered_quantity_check"
    CHECK ("delivered_quantity" >= 0 AND "delivered_quantity" <= "quantity"),
  ADD CONSTRAINT "order_lines_cancelled_quantity_check"
    CHECK ("cancelled_quantity" >= 0 AND "cancelled_quantity" <= "quantity"),
  ADD CONSTRAINT "order_lines_refunded_amount_check"
    CHECK ("refunded_amount" >= 0);

-- Add review metadata and preserve original submission/publication times.
ALTER TABLE "public"."product_reviews"
  ADD COLUMN "fit" "public"."review_fit",
  ADD COLUMN "size_ordered" TEXT,
  ADD COLUMN "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "published_at" TIMESTAMPTZ(6);

UPDATE "public"."product_reviews"
SET "submitted_at" = "created_at";

UPDATE "public"."product_reviews"
SET "published_at" = "reviewed_at"
WHERE "status" = 'published';

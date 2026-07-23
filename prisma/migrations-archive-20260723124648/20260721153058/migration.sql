/*
  Warnings:

  - You are about to drop the column `converted_order_id` on the `holds` table. All the data in the column will be lost.
  - The `stage` column on the `holds` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `payment_progress` column on the `holds` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `holds` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `stage` column on the `intake_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `stock_state` column on the `order_lines` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `payment_status` on the `order_payment_events` table. All the data in the column will be lost.
  - The `payment_status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fulfilment_status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `customer_id` on the `product_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `product_reviews` table. All the data in the column will be lost.
  - The `status` column on the `product_reviews` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `product_id` on the `return_lines` table. All the data in the column will be lost.
  - You are about to drop the column `variant_id` on the `return_lines` table. All the data in the column will be lost.
  - The `disposition` column on the `return_lines` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `customer_id` on the `returns` table. All the data in the column will be lost.
  - The `status` column on the `returns` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[customer_id]` on the table `customer_addresses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[profile_id]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id]` on the table `intake_records` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,position]` on the table `product_measurements` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,position]` on the table `product_media` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,variant_id,position]` on the table `product_media` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_line_id]` on the table `product_reviews` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[return_id,order_line_id]` on the table `return_lines` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id]` on the table `stock_levels` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,variant_id]` on the table `stock_levels` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `product_name` to the `order_lines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kind` to the `order_payment_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_line_id` to the `product_reviews` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `kind` on the `stock_movements` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'suspended', 'disabled');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('pending', 'sending', 'accepted', 'in_transit', 'delivered', 'failed', 'cancelled', 'returned');

-- CreateEnum
CREATE TYPE "fulfilment_method" AS ENUM ('delivery', 'pickup');

-- CreateEnum
CREATE TYPE "fulfilment_status" AS ENUM ('unfulfilled', 'processing', 'ready_for_dispatch', 'dispatched', 'delivered', 'partially_returned', 'returned', 'cancelled');

-- CreateEnum
CREATE TYPE "hold_payment_progress" AS ENUM ('not_started', 'initialized', 'pending', 'successful', 'failed');

-- CreateEnum
CREATE TYPE "hold_stage" AS ENUM ('product', 'cart', 'checkout', 'payment');

-- CreateEnum
CREATE TYPE "hold_status" AS ENUM ('active', 'converted', 'released', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "intake_stage" AS ENUM ('received', 'grading', 'photography', 'copy', 'pricing', 'blocked', 'ready', 'completed');

-- CreateEnum
CREATE TYPE "order_line_stock_state" AS ENUM ('uncommitted', 'reserved', 'committed', 'released', 'returned');

-- CreateEnum
CREATE TYPE "order_payment_status" AS ENUM ('pending', 'processing', 'paid', 'partially_refunded', 'refunded', 'review_required', 'cancelled');

-- CreateEnum
CREATE TYPE "payment_attempt_status" AS ENUM ('initializing', 'initialized', 'pending', 'success', 'failed', 'abandoned', 'reversed', 'review_required');

-- CreateEnum
CREATE TYPE "payment_event_kind" AS ENUM ('attempt_created', 'initialized', 'pending', 'succeeded', 'failed', 'abandoned', 'reversed', 'review_required', 'refund_recorded', 'note');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('paystack', 'manual');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "return_line_disposition" AS ENUM ('pending', 'restock', 'repair', 'damaged', 'discard', 'return_to_customer');

-- CreateEnum
CREATE TYPE "return_status" AS ENUM ('requested', 'approved', 'rejected', 'received', 'inspecting', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "stock_movement_kind" AS ENUM ('received', 'reserved', 'reservation_released', 'committed', 'commitment_released', 'sold', 'returned', 'damaged', 'adjusted');

-- DropForeignKey
ALTER TABLE "holds" DROP CONSTRAINT "holds_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "product_reviews" DROP CONSTRAINT "product_reviews_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "product_reviews" DROP CONSTRAINT "product_reviews_product_id_fkey";

-- DropForeignKey
ALTER TABLE "return_lines" DROP CONSTRAINT "return_lines_product_id_fkey";

-- DropForeignKey
ALTER TABLE "return_lines" DROP CONSTRAINT "return_lines_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "returns" DROP CONSTRAINT "returns_customer_id_fkey";

-- DropIndex
DROP INDEX "customers_profile_idx";

-- DropIndex
DROP INDEX "intake_records_store_stage_idx";

-- DropIndex
DROP INDEX "product_media_product_id_position_key";

-- DropIndex
DROP INDEX "product_reviews_customer_idx";

-- DropIndex
DROP INDEX "product_reviews_product_status_idx";

-- DropIndex
DROP INDEX "profiles_single_admin_unique";

-- AlterTable
ALTER TABLE "holds" DROP COLUMN "converted_order_id",
ADD COLUMN     "converted_at" TIMESTAMPTZ(6),
ADD COLUMN     "order_id" UUID,
DROP COLUMN "stage",
ADD COLUMN     "stage" "hold_stage" NOT NULL DEFAULT 'product',
DROP COLUMN "payment_progress",
ADD COLUMN     "payment_progress" "hold_payment_progress" NOT NULL DEFAULT 'not_started',
DROP COLUMN "status",
ADD COLUMN     "status" "hold_status" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "intake_records" ADD COLUMN     "blocking_reasons" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "graded_at" TIMESTAMPTZ(6),
ADD COLUMN     "graded_by_profile_id" UUID,
ADD COLUMN     "ready_for_listing" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "stage",
ADD COLUMN     "stage" "intake_stage" NOT NULL DEFAULT 'received';

-- AlterTable
ALTER TABLE "order_lines" ADD COLUMN     "product_name" TEXT NOT NULL,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "variant_label" TEXT,
DROP COLUMN "stock_state",
ADD COLUMN     "stock_state" "order_line_stock_state" NOT NULL DEFAULT 'uncommitted';

-- AlterTable
ALTER TABLE "order_payment_events" DROP COLUMN "payment_status",
ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
ADD COLUMN     "kind" "payment_event_kind" NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "payment_id" UUID,
ADD COLUMN     "status" "payment_attempt_status";

-- AlterTable
ALTER TABLE "order_timeline_events" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "delivery_name" TEXT,
ADD COLUMN     "delivery_phone" TEXT,
ADD COLUMN     "delivery_zone_id" UUID,
ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fulfilment_method" "fulfilment_method" NOT NULL DEFAULT 'delivery',
ADD COLUMN     "paid_at" TIMESTAMPTZ(6),
ADD COLUMN     "pickup_location_id" UUID,
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
DROP COLUMN "payment_status",
ADD COLUMN     "payment_status" "order_payment_status" NOT NULL DEFAULT 'pending',
DROP COLUMN "fulfilment_status",
ADD COLUMN     "fulfilment_status" "fulfilment_status" NOT NULL DEFAULT 'unfulfilled';

-- AlterTable
ALTER TABLE "product_reviews" DROP COLUMN "customer_id",
DROP COLUMN "product_id",
ADD COLUMN     "order_line_id" UUID NOT NULL,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reviewed_by_profile_id" UUID,
DROP COLUMN "status",
ADD COLUMN     "status" "review_status" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "published_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "last_seen_at" TIMESTAMPTZ(6),
ADD COLUMN     "status" "account_status" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "return_lines" DROP COLUMN "product_id",
DROP COLUMN "variant_id",
DROP COLUMN "disposition",
ADD COLUMN     "disposition" "return_line_disposition" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "returns" DROP COLUMN "customer_id",
ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "received_at" TIMESTAMPTZ(6),
DROP COLUMN "status",
ADD COLUMN     "status" "return_status" NOT NULL DEFAULT 'requested';

-- AlterTable
ALTER TABLE "stock_levels" ADD COLUMN     "committed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
DROP COLUMN "kind",
ADD COLUMN     "kind" "stock_movement_kind" NOT NULL;

-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "updated_by_profile_id" UUID;

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "provider" TEXT,
    "service_code" TEXT,
    "status" "delivery_status" NOT NULL DEFAULT 'pending',
    "provider_reference" TEXT,
    "request_payload" JSONB,
    "provider_response" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "requested_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "dispatched_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "delivery_rating" INTEGER,
    "packaging_rating" INTEGER,
    "service_rating" INTEGER,
    "title" TEXT,
    "body" TEXT,
    "status" "review_status" NOT NULL DEFAULT 'pending',
    "reviewed_by_profile_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL DEFAULT 'paystack',
    "reference" TEXT NOT NULL,
    "access_code" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "status" "payment_attempt_status" NOT NULL DEFAULT 'initializing',
    "provider_transaction_id" TEXT,
    "channel" TEXT,
    "gateway_response" TEXT,
    "raw_response" JSONB,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_status_updated_idx" ON "deliveries"("status", "updated_at");

-- CreateIndex
CREATE INDEX "deliveries_provider_reference_idx" ON "deliveries"("provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "order_reviews_order_id_key" ON "order_reviews"("order_id");

-- CreateIndex
CREATE INDEX "order_reviews_status_created_idx" ON "order_reviews"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "order_reviews_moderator_idx" ON "order_reviews"("reviewed_by_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_order_created_idx" ON "payments"("order_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_status_updated_idx" ON "payments"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_transaction_unique" ON "payments"("provider", "provider_transaction_id") WHERE (provider_transaction_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "activity_events_product_occurred_idx" ON "activity_events"("product_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "activity_events_order_occurred_idx" ON "activity_events"("order_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_target_idx" ON "audit_events"("target_table", "target_id");

-- CreateIndex
CREATE INDEX "catalogue_categories_position_idx" ON "catalogue_categories"("position");

-- CreateIndex
CREATE INDEX "catalogue_collections_position_idx" ON "catalogue_collections"("position");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_addresses_one_default_unique" ON "customer_addresses"("customer_id") WHERE ("is_default" = true);

-- CreateIndex
CREATE UNIQUE INDEX "customers_profile_unique" ON "customers"("profile_id");

-- CreateIndex
CREATE INDEX "delivery_zones_enabled_position_idx" ON "delivery_zones"("enabled", "position");

-- CreateIndex
CREATE INDEX "delivery_zones_city_enabled_idx" ON "delivery_zones"("city", "enabled");

-- CreateIndex
CREATE INDEX "holds_customer_status_idx" ON "holds"("customer_id", "status");

-- CreateIndex
CREATE INDEX "holds_order_status_idx" ON "holds"("order_id", "status");

-- CreateIndex
CREATE INDEX "holds_store_status_expires_idx" ON "holds"("status", "expires_at");

-- CreateIndex
CREATE INDEX "holds_stock_target_status_idx" ON "holds"("product_id", "variant_id", "status");

-- CreateIndex
CREATE INDEX "intake_records_stage_created_idx" ON "intake_records"("stage", "created_at");

-- CreateIndex
CREATE INDEX "intake_records_assignee_stage_idx" ON "intake_records"("assigned_profile_id", "stage");

-- CreateIndex
CREATE INDEX "intake_records_readiness_idx" ON "intake_records"("ready_for_listing", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "intake_records_product_id_key" ON "intake_records"("product_id");

-- CreateIndex
CREATE INDEX "order_lines_order_id_idx" ON "order_lines"("order_id");

-- CreateIndex
CREATE INDEX "order_lines_product_id_idx" ON "order_lines"("product_id");

-- CreateIndex
CREATE INDEX "order_lines_variant_id_idx" ON "order_lines"("variant_id") WHERE (variant_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "order_payment_events_payment_occurred_idx" ON "order_payment_events"("payment_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "orders_payment_status_placed_idx" ON "orders"("payment_status", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_fulfilment_status_placed_idx" ON "orders"("fulfilment_status", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_delivery_zone_idx" ON "orders"("delivery_zone_id");

-- CreateIndex
CREATE INDEX "orders_pickup_location_idx" ON "orders"("pickup_location_id");

-- CreateIndex
CREATE INDEX "pickup_locations_enabled_position_idx" ON "pickup_locations"("enabled", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_measurements_product_id_position_key" ON "product_measurements"("product_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_product_position_unique" ON "product_media"("product_id", "position") WHERE (variant_id IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "product_media_variant_position_unique" ON "product_media"("product_id", "variant_id", "position") WHERE (variant_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_order_line_id_key" ON "product_reviews"("order_line_id");

-- CreateIndex
CREATE INDEX "product_reviews_status_created_idx" ON "product_reviews"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "product_reviews_moderator_idx" ON "product_reviews"("reviewed_by_profile_id");

-- CreateIndex
CREATE INDEX "product_variants_product_id_position_idx" ON "product_variants"("product_id", "position");

-- CreateIndex
CREATE INDEX "products_publication_published_idx" ON "products"("publication", "published_at" DESC);

-- CreateIndex
CREATE INDEX "products_age_idx" ON "products"("created_at" ASC);

-- CreateIndex
CREATE INDEX "profiles_role_status_idx" ON "profiles"("role", "status");

-- CreateIndex
CREATE INDEX "profiles_email_idx" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "return_lines_order_line_id_idx" ON "return_lines"("order_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_lines_return_order_line_unique" ON "return_lines"("return_id", "order_line_id");

-- CreateIndex
CREATE INDEX "returns_store_status_idx" ON "returns"("status");

-- CreateIndex
CREATE INDEX "returns_order_requested_idx" ON "returns"("order_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "stock_levels_store_reserved_idx" ON "stock_levels"("reserved");

-- CreateIndex
CREATE INDEX "stock_levels_store_committed_idx" ON "stock_levels"("committed");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_product_unique" ON "stock_levels"("product_id") WHERE (variant_id IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_variant_unique" ON "stock_levels"("product_id", "variant_id") WHERE (variant_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "stock_movements_variant_occurred_idx" ON "stock_movements"("variant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_order_idx" ON "stock_movements"("related_order_id");

-- CreateIndex
CREATE INDEX "stock_movements_hold_idx" ON "stock_movements"("related_hold_id");

-- CreateIndex
CREATE INDEX "store_settings_updated_by_profile_id_idx" ON "store_settings"("updated_by_profile_id");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_graded_by_profile_id_fkey" FOREIGN KEY ("graded_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "pickup_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "order_lines"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_related_hold_id_fkey" FOREIGN KEY ("related_hold_id") REFERENCES "holds"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_related_return_id_fkey" FOREIGN KEY ("related_return_id") REFERENCES "returns"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_updated_by_profile_id_fkey" FOREIGN KEY ("updated_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

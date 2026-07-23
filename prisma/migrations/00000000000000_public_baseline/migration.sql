-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "account_role" AS ENUM ('consumer', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'suspended', 'disabled');

-- CreateEnum
CREATE TYPE "cloudinary_asset_kind" AS ENUM ('product-cover', 'product-detail', 'product-defect', 'store-logo', 'store-brand');

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
CREATE TYPE "order_line_fulfilment_status" AS ENUM ('unfulfilled', 'processing', 'ready_for_dispatch', 'dispatched', 'partially_delivered', 'delivered', 'partially_cancelled', 'cancelled', 'partially_returned', 'returned');

-- CreateEnum
CREATE TYPE "order_line_refund_status" AS ENUM ('not_refunded', 'partially_refunded', 'refunded');

-- CreateEnum
CREATE TYPE "order_payment_status" AS ENUM ('pending', 'processing', 'paid', 'partially_refunded', 'refunded', 'review_required', 'cancelled');

-- CreateEnum
CREATE TYPE "payment_attempt_status" AS ENUM ('initializing', 'initialized', 'pending', 'success', 'failed', 'abandoned', 'reversed', 'review_required');

-- CreateEnum
CREATE TYPE "payment_event_kind" AS ENUM ('attempt_created', 'initialized', 'pending', 'succeeded', 'failed', 'abandoned', 'reversed', 'review_required', 'refund_recorded', 'note');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('paystack', 'manual');

-- CreateEnum
CREATE TYPE "product_channel" AS ENUM ('storefront', 'physical-store', 'whatsapp', 'instagram');

-- CreateEnum
CREATE TYPE "product_inventory_mode" AS ENUM ('unique', 'stocked', 'variant');

-- CreateEnum
CREATE TYPE "product_lifecycle" AS ENUM ('draft', 'intake', 'active', 'archived');

-- CreateEnum
CREATE TYPE "product_publication" AS ENUM ('published', 'unpublished', 'scheduled');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('pending', 'published', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "review_fit" AS ENUM ('runs_small', 'true_to_size', 'runs_large', 'not_applicable');

-- CreateEnum
CREATE TYPE "return_line_disposition" AS ENUM ('pending', 'restock', 'repair', 'damaged', 'discard', 'return_to_customer');

-- CreateEnum
CREATE TYPE "return_status" AS ENUM ('requested', 'approved', 'rejected', 'received', 'inspecting', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "stock_movement_kind" AS ENUM ('received', 'reserved', 'reservation_released', 'committed', 'commitment_released', 'sold', 'returned', 'damaged', 'adjusted');

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "actor_profile_id" UUID,
    "product_id" UUID,
    "order_id" UUID,
    "customer_id" UUID,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_profile_id" UUID,
    "action" TEXT NOT NULL,
    "target_table" TEXT,
    "target_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image_url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogue_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogue_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloudinary_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL DEFAULT 'cloudinary',
    "resource_type" TEXT NOT NULL DEFAULT 'image',
    "kind" "cloudinary_asset_kind" NOT NULL,
    "public_id" TEXT NOT NULL,
    "secure_url" TEXT NOT NULL,
    "delivery_url" TEXT,
    "format" TEXT,
    "version" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "alt" TEXT NOT NULL DEFAULT '',
    "created_by_profile_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cloudinary_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "delivery_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_profile_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_saved_products" (
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_saved_products_pkey" PRIMARY KEY ("customer_id","product_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "type" TEXT NOT NULL DEFAULT 'individual',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_days" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "holds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "order_id" UUID,
    "quantity" INTEGER NOT NULL,
    "stage" "hold_stage" NOT NULL DEFAULT 'product',
    "source" TEXT NOT NULL,
    "payment_progress" "hold_payment_progress" NOT NULL DEFAULT 'not_started',
    "status" "hold_status" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "converted_at" TIMESTAMPTZ(6),
    "note" TEXT,

    CONSTRAINT "holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "stage" "intake_stage" NOT NULL DEFAULT 'received',
    "assigned_profile_id" UUID,
    "graded_by_profile_id" UUID,
    "grade" TEXT,
    "blocking_reasons" JSONB NOT NULL DEFAULT '[]',
    "ready_for_listing" BOOLEAN NOT NULL DEFAULT false,
    "graded_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "product_name" TEXT NOT NULL,
    "variant_label" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "stock_state" "order_line_stock_state" NOT NULL DEFAULT 'uncommitted',
    "fulfilment_status" "order_line_fulfilment_status" NOT NULL DEFAULT 'unfulfilled',
    "delivered_quantity" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMPTZ(6),
    "cancelled_quantity" INTEGER NOT NULL DEFAULT 0,
    "refund_status" "order_line_refund_status" NOT NULL DEFAULT 'not_refunded',
    "refunded_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refunded_at" TIMESTAMPTZ(6),

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "payment_id" UUID,
    "kind" "payment_event_kind" NOT NULL,
    "status" "payment_attempt_status",
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "method" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_profile_id" UUID,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "order_payment_events_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "order_timeline_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_profile_id" UUID,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "order_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "channel" TEXT,
    "payment_status" "order_payment_status" NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "fulfilment_method" "fulfilment_method" NOT NULL DEFAULT 'delivery',
    "fulfilment_status" "fulfilment_status" NOT NULL DEFAULT 'unfulfilled',
    "delivery_zone_id" UUID,
    "pickup_location_id" UUID,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "delivery_name" TEXT,
    "delivery_phone" TEXT,
    "delivery_city" TEXT,
    "delivery_address" JSONB,
    "courier" JSONB,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "refunded_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "attention" TEXT,
    "created_by_profile_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "pickup_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_channels" (
    "product_id" UUID NOT NULL,
    "channel" "product_channel" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_channels_pkey" PRIMARY KEY ("product_id","channel")
);

-- CreateTable
CREATE TABLE "product_measurements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "asset_id" UUID NOT NULL,
    "kind" "cloudinary_asset_kind" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_line_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "fit" "review_fit",
    "size_ordered" TEXT,
    "status" "review_status" NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "reviewed_by_profile_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sku" TEXT,
    "size" TEXT,
    "colour" TEXT,
    "price" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "collection_id" UUID,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "inventory_mode" "product_inventory_mode" NOT NULL,
    "brand" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "reference_price" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "lifecycle" "product_lifecycle" NOT NULL DEFAULT 'draft',
    "publication" "product_publication" NOT NULL DEFAULT 'unpublished',
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 1,
    "archive_number" TEXT,
    "sku" TEXT,
    "condition" TEXT,
    "size_label" TEXT,
    "colour" TEXT,
    "material" TEXT,
    "fit" TEXT,
    "style" TEXT,
    "care_instructions" TEXT,
    "flaw_notes" TEXT,
    "weight_grams" INTEGER,
    "pickup_available" BOOLEAN NOT NULL DEFAULT true,
    "delivery_restrictions" TEXT NOT NULL DEFAULT '',
    "packaging_notes" TEXT NOT NULL DEFAULT '',
    "scheduled_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "role" "account_role" NOT NULL DEFAULT 'consumer',
    "status" "account_status" NOT NULL DEFAULT 'active',
    "display_name" TEXT,
    "phone" TEXT,
    "avatar_cloudinary_public_id" TEXT,
    "avatar_url" TEXT,
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "return_id" UUID NOT NULL,
    "order_line_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "disposition" "return_line_disposition" NOT NULL DEFAULT 'pending',

    CONSTRAINT "return_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "status" "return_status" NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "total_received" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "committed" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "returned" INTEGER NOT NULL DEFAULT 0,
    "damaged" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "kind" "stock_movement_kind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_profile_id" UUID,
    "note" TEXT,
    "related_order_id" UUID,
    "related_hold_id" UUID,
    "related_return_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_brand_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "asset_id" UUID NOT NULL,
    "kind" "cloudinary_asset_kind" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_brand_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "identity" JSONB NOT NULL DEFAULT '{}',
    "selling" JSONB NOT NULL DEFAULT '{}',
    "payments" JSONB NOT NULL DEFAULT '{}',
    "notifications" JSONB NOT NULL DEFAULT '{}',
    "updated_by_profile_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_store_occurred_idx" ON "activity_events"("occurred_at" DESC);

-- CreateIndex
CREATE INDEX "activity_events_product_occurred_idx" ON "activity_events"("product_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "activity_events_order_occurred_idx" ON "activity_events"("order_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_store_created_idx" ON "audit_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_target_idx" ON "audit_events"("target_table", "target_id");

-- CreateIndex
CREATE INDEX "catalogue_categories_position_idx" ON "catalogue_categories"("position");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_categories_slug_key" ON "catalogue_categories"("slug");

-- CreateIndex
CREATE INDEX "catalogue_collections_position_idx" ON "catalogue_collections"("position");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_collections_slug_key" ON "catalogue_collections"("slug");

-- CreateIndex
CREATE INDEX "cloudinary_assets_store_kind_idx" ON "cloudinary_assets"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "cloudinary_assets_public_id_key" ON "cloudinary_assets"("public_id");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_addresses_one_default_unique" ON "customer_addresses"("customer_id") WHERE ("is_default" = true);

-- CreateIndex
CREATE INDEX "customer_notes_store_customer_idx" ON "customer_notes"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_profile_unique" ON "customers"("profile_id");

-- CreateIndex
CREATE INDEX "customers_store_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "delivery_zones_enabled_position_idx" ON "delivery_zones"("enabled", "position");

-- CreateIndex
CREATE INDEX "delivery_zones_city_enabled_idx" ON "delivery_zones"("city", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_status_updated_idx" ON "deliveries"("status", "updated_at");

-- CreateIndex
CREATE INDEX "deliveries_provider_reference_idx" ON "deliveries"("provider_reference");

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
CREATE INDEX "order_payment_events_order_occurred_idx" ON "order_payment_events"("order_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "order_payment_events_payment_occurred_idx" ON "order_payment_events"("payment_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "order_reviews_order_id_key" ON "order_reviews"("order_id");

-- CreateIndex
CREATE INDEX "order_reviews_status_created_idx" ON "order_reviews"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "order_reviews_moderator_idx" ON "order_reviews"("reviewed_by_profile_id");

-- CreateIndex
CREATE INDEX "order_timeline_events_order_occurred_idx" ON "order_timeline_events"("order_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_unique" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_placed_idx" ON "orders"("customer_id", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_store_placed_idx" ON "orders"("placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_payment_status_placed_idx" ON "orders"("payment_status", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_fulfilment_status_placed_idx" ON "orders"("fulfilment_status", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "orders_delivery_zone_idx" ON "orders"("delivery_zone_id");

-- CreateIndex
CREATE INDEX "orders_pickup_location_idx" ON "orders"("pickup_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_order_created_idx" ON "payments"("order_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_status_updated_idx" ON "payments"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_transaction_unique" ON "payments"("provider", "provider_transaction_id") WHERE (provider_transaction_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "pickup_locations_enabled_position_idx" ON "pickup_locations"("enabled", "position");

-- CreateIndex
CREATE INDEX "product_channels_channel_idx" ON "product_channels"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "product_measurements_product_id_position_key" ON "product_measurements"("product_id", "position");

-- CreateIndex
CREATE INDEX "product_media_product_position_idx" ON "product_media"("product_id", "position");

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
CREATE UNIQUE INDEX "product_variants_product_sku_unique" ON "product_variants"("product_id", "sku") WHERE (sku IS NOT NULL);

-- CreateIndex
CREATE INDEX "products_store_inventory_mode_idx" ON "products"("inventory_mode");

-- CreateIndex
CREATE INDEX "products_store_lifecycle_publication_idx" ON "products"("lifecycle", "publication");

-- CreateIndex
CREATE INDEX "products_publication_published_idx" ON "products"("publication", "published_at" DESC);

-- CreateIndex
CREATE INDEX "products_age_idx" ON "products"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "products_store_archive_number_unique" ON "products"("archive_number") WHERE (archive_number IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_store_sku_unique" ON "products"("sku") WHERE (sku IS NOT NULL);

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
CREATE INDEX "stock_levels_store_available_idx" ON "stock_levels"("available");

-- CreateIndex
CREATE INDEX "stock_levels_store_reserved_idx" ON "stock_levels"("reserved");

-- CreateIndex
CREATE INDEX "stock_levels_store_committed_idx" ON "stock_levels"("committed");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_product_unique" ON "stock_levels"("product_id") WHERE (variant_id IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_variant_unique" ON "stock_levels"("product_id", "variant_id") WHERE (variant_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "stock_movements_product_occurred_idx" ON "stock_movements"("product_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_variant_occurred_idx" ON "stock_movements"("variant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_store_occurred_idx" ON "stock_movements"("occurred_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_order_idx" ON "stock_movements"("related_order_id");

-- CreateIndex
CREATE INDEX "stock_movements_hold_idx" ON "stock_movements"("related_hold_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_brand_assets_kind_position_key" ON "store_brand_assets"("kind", "position");

-- CreateIndex
CREATE INDEX "store_settings_updated_by_profile_id_idx" ON "store_settings"("updated_by_profile_id");

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cloudinary_assets" ADD CONSTRAINT "cloudinary_assets_created_by_profile_id_fkey" FOREIGN KEY ("created_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_author_profile_id_fkey" FOREIGN KEY ("author_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_saved_products" ADD CONSTRAINT "customer_saved_products_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_saved_products" ADD CONSTRAINT "customer_saved_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_assigned_profile_id_fkey" FOREIGN KEY ("assigned_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_graded_by_profile_id_fkey" FOREIGN KEY ("graded_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_timeline_events" ADD CONSTRAINT "order_timeline_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_timeline_events" ADD CONSTRAINT "order_timeline_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_profile_id_fkey" FOREIGN KEY ("created_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "pickup_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_channels" ADD CONSTRAINT "product_channels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_measurements" ADD CONSTRAINT "product_measurements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "cloudinary_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "order_lines"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalogue_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "catalogue_collections"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "order_lines"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_related_hold_id_fkey" FOREIGN KEY ("related_hold_id") REFERENCES "holds"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_related_return_id_fkey" FOREIGN KEY ("related_return_id") REFERENCES "returns"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_brand_assets" ADD CONSTRAINT "store_brand_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "cloudinary_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_updated_by_profile_id_fkey" FOREIGN KEY ("updated_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

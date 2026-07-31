-- Customer-owned browsing history. This table is deliberately separate from
-- activity_events so product views do not appear in staff operational feeds.
CREATE TABLE "public"."customer_recent_products" (
  "customer_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_recent_products_pkey"
    PRIMARY KEY ("customer_id", "product_id")
);

CREATE INDEX "customer_recent_products_customer_viewed_idx"
  ON "public"."customer_recent_products"("customer_id", "viewed_at" DESC);

ALTER TABLE "public"."customer_recent_products"
  ADD CONSTRAINT "customer_recent_products_customer_id_fkey"
    FOREIGN KEY ("customer_id")
    REFERENCES "public"."customers"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

ALTER TABLE "public"."customer_recent_products"
  ADD CONSTRAINT "customer_recent_products_product_id_fkey"
    FOREIGN KEY ("product_id")
    REFERENCES "public"."products"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

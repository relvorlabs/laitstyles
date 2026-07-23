CREATE TABLE "public"."product_variant_measurements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "label" text NOT NULL,
  "value" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  CONSTRAINT "product_variant_measurements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variant_measurements_product_fkey"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "product_variant_measurements_variant_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "product_variant_measurements_variant_position_unique"
  ON "public"."product_variant_measurements"("variant_id", "position");
CREATE INDEX "product_variant_measurements_product_idx"
  ON "public"."product_variant_measurements"("product_id");

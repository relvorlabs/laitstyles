CREATE TABLE "public"."customer_cart_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_cart_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_cart_lines_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "customer_cart_lines_customer_fk"
      FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "customer_cart_lines_product_fk"
      FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "customer_cart_lines_variant_fk"
      FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "customer_cart_lines_product_unique"
  ON "public"."customer_cart_lines"("customer_id", "product_id")
  WHERE "variant_id" IS NULL;

CREATE UNIQUE INDEX "customer_cart_lines_variant_unique"
  ON "public"."customer_cart_lines"("customer_id", "product_id", "variant_id")
  WHERE "variant_id" IS NOT NULL;

CREATE INDEX "customer_cart_lines_customer_updated_idx"
  ON "public"."customer_cart_lines"("customer_id", "updated_at" DESC);

CREATE INDEX "customer_cart_lines_product_variant_idx"
  ON "public"."customer_cart_lines"("product_id", "variant_id");

CREATE OR REPLACE FUNCTION "public"."validate_customer_cart_line_variant"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants AS variant
    WHERE variant.id = NEW.variant_id
      AND variant.product_id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'Cart variant % does not belong to product %', NEW.variant_id, NEW.product_id
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER "customer_cart_lines_validate_variant"
BEFORE INSERT OR UPDATE ON "public"."customer_cart_lines"
FOR EACH ROW
EXECUTE FUNCTION "public"."validate_customer_cart_line_variant"();

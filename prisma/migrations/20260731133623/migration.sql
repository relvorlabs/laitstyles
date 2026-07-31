-- DropForeignKey
ALTER TABLE "customer_cart_lines" DROP CONSTRAINT "customer_cart_lines_customer_fk";

-- DropForeignKey
ALTER TABLE "customer_cart_lines" DROP CONSTRAINT "customer_cart_lines_product_fk";

-- DropForeignKey
ALTER TABLE "customer_cart_lines" DROP CONSTRAINT "customer_cart_lines_variant_fk";

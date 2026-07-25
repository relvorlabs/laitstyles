import { z } from "zod";
import { paginationQuerySchema } from "@/lib/http/pagination";

export const holdIdentifierSchema = z.string().trim().uuid();

export const adminHoldListSearchSchema = paginationQuerySchema.extend({
  view: z.enum(["all", "active", "expiring", "payment-risk", "expired"]).default("all"),
  search: z.string().trim().max(160).default(""),
  source: z.enum(["all", "storefront", "assisted"]).default("all"),
  stage: z.enum(["all", "product", "cart", "checkout", "payment"]).default("all"),
  sort: z
    .enum(["expiry-asc", "expiry-desc", "started-desc", "quantity-desc"])
    .default("expiry-asc"),
});

export const extendHoldSchema = z
  .object({
    minutes: z.number().int().min(1).max(24 * 60),
  })
  .strict();

export const convertHoldSchema = z
  .object({
    deliveryCity: z.string().trim().min(1, "Enter the delivery or pickup city.").max(120),
    notes: z.string().trim().max(2_000).default(""),
  })
  .strict();

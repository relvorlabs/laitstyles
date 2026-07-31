import { z } from "zod";

export const ownedCartIntentSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(99),
});

export const ownedCartWriteSchema = z.object({
  lines: z.array(ownedCartIntentSchema).max(100),
});

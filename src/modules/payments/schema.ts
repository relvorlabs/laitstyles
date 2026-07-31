import { z } from "zod";

export const paymentMethodIdentifierSchema = z.string().uuid();
export const createPaymentMethodSetupSchema = z
  .object({ idempotencyKey: z.string().uuid() })
  .strict();
export const updatePaymentMethodSchema = z.object({ isDefault: z.literal(true) }).strict();

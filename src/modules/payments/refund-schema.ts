import { z } from "zod";

export const paymentIdentifierSchema = z.string().uuid();
export const refundIdentifierSchema = z.string().uuid();

export const requestRefundBodySchema = z.object({
  paymentId: paymentIdentifierSchema,
  amountMinor: z.number().int().positive().safe(),
  currency: z.literal("NGN"),
  reason: z.string().trim().max(500).optional(),
  returnId: z.string().uuid().optional(),
  lineAllocations: z
    .array(
      z.object({
        orderLineId: z.string().uuid(),
        amountMinor: z.number().int().positive().safe(),
      }),
    )
    .max(100)
    .optional(),
});

export const refundListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  paymentId: z.string().uuid().optional(),
  returnId: z.string().uuid().optional(),
  status: z.enum(["pending", "processing", "needs_attention", "processed", "failed"]).optional(),
});

export const adminPaymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  status: z
    .enum([
      "initializing",
      "initialized",
      "pending",
      "success",
      "failed",
      "abandoned",
      "reversed",
      "review_required",
    ])
    .optional(),
  orderId: z.string().uuid().optional(),
  reference: z.string().trim().min(1).max(200).optional(),
});

export type RequestRefundBody = z.infer<typeof requestRefundBodySchema>;

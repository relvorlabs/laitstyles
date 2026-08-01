import { z } from "zod";

const checkoutLineSchema = z
  .object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    holdId: z.string().uuid().optional(),
    quantity: z.number().int().positive().max(100),
  })
  .strict();

const createCheckoutFields = {
  idempotencyKey: z.string().uuid(),
  addressId: z.string().uuid(),
  couponCode: z.string().trim().min(2).max(48).optional(),
  lines: z.array(checkoutLineSchema).min(1).max(50),
};

function rejectDuplicateLines(
  input: { lines: Array<{ productId: string; variantId?: string }> },
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  for (const [index, line] of input.lines.entries()) {
    const key = `${line.productId}:${line.variantId ?? "product"}`;
    if (seen.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["lines", index],
        message: "Combine duplicate checkout lines before continuing.",
      });
    }
    seen.add(key);
  }
}

export const createCheckoutRequestSchema = z
  .object(createCheckoutFields)
  .strict()
  .superRefine(rejectDuplicateLines);

export const createCheckoutSchema = z
  .object({ ...createCheckoutFields, callbackUrl: z.string().url().optional() })
  .strict()
  .superRefine(rejectDuplicateLines);

export const checkoutIdentifierSchema = z.string().uuid();
export const paymentIdentifierSchema = z.string().uuid();

// `cancelled` is a derived public checkout state from the aggregate order.
// It is intentionally not part of the provider payment-attempt enum.
export const checkoutStatusSchema = z.enum([
  "initializing",
  "initialized",
  "pending",
  "success",
  "failed",
  "abandoned",
  "reversed",
  "review_required",
  "cancelled",
]);

const checkoutAmountSchema = z.number().int().nonnegative().safe();

// Persisted command snapshots may contain private orchestration fields. Parse and
// strip those fields while still validating every checkout property returned to clients.
export const checkoutDraftSchema = z.object({
  checkoutId: checkoutIdentifierSchema,
  paymentId: paymentIdentifierSchema,
  orderNumber: z.string().trim().min(1),
  reference: z.string().trim().min(1),
  accessCode: z.string().trim().min(1).nullable(),
  status: checkoutStatusSchema,
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  subtotalMinor: checkoutAmountSchema,
  deliveryFeeMinor: checkoutAmountSchema,
  discountMinor: checkoutAmountSchema,
  totalMinor: checkoutAmountSchema,
});

export const paystackSettlementEventSchema = z
  .object({
    source: z.enum(["webhook", "manual_verify", "callback"]),
    providerTransactionId: z.string().min(1),
    reference: z.string().min(1),
    status: z.enum(["success", "failed", "abandoned", "reversed", "pending"]),
    amountMinor: z.number().int().nonnegative().safe(),
    currency: z.string().length(3).transform((value) => value.toUpperCase()),
    customerEmail: z.string().email().optional().nullable(),
    paidAt: z.string().optional().nullable(),
    channel: z.string().optional().nullable(),
    gatewayResponse: z.string().optional().nullable(),
    failureCode: z.string().optional().nullable(),
    failureReason: z.string().optional().nullable(),
  })
  .strict();

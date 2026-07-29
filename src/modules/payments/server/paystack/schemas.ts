import { z } from "zod";

export const paystackProviderIdSchema = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^\d+$/),
]);

export const paystackAuthorizationSchema = z.object({
  authorization_code: z.string().min(1),
  bin: z.string().optional().nullable(),
  last4: z.string().optional().nullable(),
  exp_month: z.string().optional().nullable(),
  exp_year: z.string().optional().nullable(),
  channel: z.string().min(1),
  card_type: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  reusable: z.boolean(),
  signature: z.string().optional().nullable(),
  account_name: z.string().optional().nullable(),
});

export const paystackCustomerSchema = z.object({
  id: paystackProviderIdSchema,
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  email: z.string().email(),
  customer_code: z.string().min(1),
  phone: z.string().optional().nullable(),
  metadata: z.unknown().optional().nullable(),
  risk_action: z.string().optional().nullable(),
  international_format_phone: z.string().optional().nullable(),
});

export const paystackTransactionSchema = z.object({
  id: paystackProviderIdSchema,
  domain: z.string().optional(),
  status: z.string().min(1),
  reference: z.string().min(1),
  receipt_number: z.string().optional().nullable(),
  amount: z.number().int().nonnegative(),
  message: z.string().optional().nullable(),
  gateway_response: z.string().optional().nullable(),
  paid_at: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  transaction_date: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  currency: z.string().length(3),
  ip_address: z.string().optional().nullable(),
  metadata: z.unknown().optional().nullable(),
  log: z.unknown().optional().nullable(),
  fees: z.number().int().optional().nullable(),
  fees_split: z.unknown().optional().nullable(),
  authorization: paystackAuthorizationSchema.optional().nullable(),
  customer: paystackCustomerSchema.optional().nullable(),
  plan: z.unknown().optional().nullable(),
  split: z.unknown().optional().nullable(),
  order_id: z.string().optional().nullable(),
  requested_amount: z.number().int().optional().nullable(),
  pos_transaction_data: z.unknown().optional().nullable(),
  source: z.unknown().optional().nullable(),
  fees_breakdown: z.unknown().optional().nullable(),
  connect: z.unknown().optional().nullable(),
});

export const paystackPaginationSchema = z.object({
  total: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  perPage: z.number().int().positive(),
  page: z.number().int().positive(),
  pageCount: z.number().int().nonnegative(),
});

const paystackRefundTransactionSchema = z.union([
  paystackProviderIdSchema,
  z.object({
    id: paystackProviderIdSchema,
    reference: z.string().min(1).optional().nullable(),
  }),
]);

export const paystackRefundSchema = z.object({
  id: paystackProviderIdSchema,
  transaction: paystackRefundTransactionSchema,
  integration: paystackProviderIdSchema.optional(),
  dispute: paystackProviderIdSchema.optional().nullable(),
  settlement: paystackProviderIdSchema.optional().nullable(),
  amount: z.number().int().positive().safe(),
  deducted_amount: z.number().int().nonnegative().safe().optional().nullable(),
  currency: z.literal("NGN"),
  channel: z.string().optional().nullable(),
  fully_deducted: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional().nullable(),
  refunded_by: z.string().optional().nullable(),
  refunded_at: z.string().optional().nullable(),
  expected_at: z.string().optional().nullable(),
  customer_note: z.string().optional().nullable(),
  merchant_note: z.string().optional().nullable(),
  status: z.string().min(1),
  domain: z.string().optional(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

export function paystackSuccessEnvelope<TSchema extends z.ZodType>(data: TSchema) {
  return z.object({
    status: z.literal(true),
    message: z.string().min(1),
    data,
  });
}

export const paystackInitializeResponseSchema = paystackSuccessEnvelope(
  z.object({
    authorization_url: z.string().url(),
    access_code: z.string().min(1),
    reference: z.string().min(1),
  }),
);

export const paystackTransactionResponseSchema = paystackSuccessEnvelope(
  paystackTransactionSchema,
);

export const paystackListTransactionsResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(paystackTransactionSchema),
  meta: paystackPaginationSchema,
});

export const paystackChallengeResponseSchema = paystackSuccessEnvelope(
  z.object({
    authorization_url: z.string().url(),
    access_code: z.string().min(1),
    reference: z.string().min(1),
    paused: z.literal(true),
  }),
);

export const paystackDeactivateAuthorizationResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
});

export const paystackRefundResponseSchema = paystackSuccessEnvelope(paystackRefundSchema);

export const paystackListRefundsResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(paystackRefundSchema),
  meta: paystackPaginationSchema.optional(),
});

export type PaystackRawTransaction = z.infer<typeof paystackTransactionSchema>;
export type PaystackRawRefund = z.infer<typeof paystackRefundSchema>;

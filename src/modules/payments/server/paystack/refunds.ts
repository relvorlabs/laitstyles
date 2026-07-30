import "server-only";

import { z } from "zod";
import { paystackRequest } from "@/modules/payments/server/paystack/client";
import {
  paystackListRefundsResponseSchema,
  type PaystackRawRefund,
  paystackRefundResponseSchema,
} from "@/modules/payments/server/paystack/schemas";

const transactionReferenceSchema = z.string().trim().min(1);
const refundIdSchema = z.string().regex(/^\d+$/);
const amountMinorSchema = z.number().int().positive().safe();
const noteSchema = z.string().trim().min(1);

const createRefundInputSchema = z.object({
  transaction: transactionReferenceSchema,
  amountMinor: amountMinorSchema.optional(),
  currency: z.literal("NGN").default("NGN"),
  customerNote: noteSchema.optional(),
  merchantNote: noteSchema.optional(),
});

const listRefundsInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  transaction: transactionReferenceSchema.optional(),
  currency: z.literal("NGN").optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

const knownRefundStatuses = [
  "failed",
  "needs-attention",
  "pending",
  "processed",
  "processing",
] as const;

type KnownPaystackRefundStatus = (typeof knownRefundStatuses)[number];

export type CreateRefundInput = z.input<typeof createRefundInputSchema>;
export type ListRefundsInput = z.input<typeof listRefundsInputSchema>;
export type PaystackRefundStatus =
  | "failed"
  | "needs-attention"
  | "pending"
  | "processed"
  | "processing"
  | "unknown";

export type PaystackRefund = {
  id: string;
  transactionId: string;
  transactionReference: string | null;
  amountMinor: number;
  deductedAmountMinor: number | null;
  currency: "NGN";
  status: PaystackRefundStatus;
  providerStatus: string;
  customerNote: string | null;
  merchantNote: string | null;
  refundedAt: string | null;
  expectedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PaystackRefundPagination = {
  total: number | null;
  skipped: number | null;
  perPage: number;
  page: number;
  pageCount: number | null;
};

export async function createRefund(
  input: CreateRefundInput,
  fetchImplementation?: typeof fetch,
): Promise<PaystackRefund> {
  const parsed = createRefundInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "create-refund",
    path: "/refund",
    method: "POST",
    schema: paystackRefundResponseSchema,
    fetchImplementation,
    body: {
      transaction: parsed.transaction,
      ...(parsed.amountMinor === undefined ? {} : { amount: parsed.amountMinor }),
      currency: parsed.currency,
      ...(parsed.customerNote === undefined ? {} : { customer_note: parsed.customerNote }),
      ...(parsed.merchantNote === undefined ? {} : { merchant_note: parsed.merchantNote }),
    },
  });

  return mapPaystackRefund(response.data);
}

export async function fetchRefund(
  id: string,
  fetchImplementation?: typeof fetch,
): Promise<PaystackRefund> {
  const parsedId = refundIdSchema.parse(id);
  const response = await paystackRequest({
    operation: "fetch-refund",
    path: `/refund/${parsedId}`,
    schema: paystackRefundResponseSchema,
    fetchImplementation,
  });

  return mapPaystackRefund(response.data);
}

export async function listRefunds(
  input: ListRefundsInput = {},
  fetchImplementation?: typeof fetch,
): Promise<{ refunds: PaystackRefund[]; pagination: PaystackRefundPagination }> {
  const parsed = listRefundsInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "list-refunds",
    path: "/refund",
    schema: paystackListRefundsResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      transaction: parsed.transaction,
      currency: parsed.currency,
      from: parsed.from,
      to: parsed.to,
    },
  });

  return {
    refunds: response.data.map(mapPaystackRefund),
    pagination: response.meta ?? {
      total: null,
      skipped: null,
      perPage: parsed.perPage,
      page: parsed.page,
      pageCount: null,
    },
  };
}

export function mapPaystackRefund(refund: PaystackRawRefund): PaystackRefund {
  const transaction = refund.transaction;
  const providerStatus = refund.status;
  const status = isKnownRefundStatus(providerStatus) ? providerStatus : "unknown";

  return {
    id: String(refund.id),
    transactionId: String(typeof transaction === "object" ? transaction.id : transaction),
    transactionReference:
      typeof transaction === "object" ? (transaction.reference ?? null) : null,
    amountMinor: refund.amount,
    deductedAmountMinor: refund.deducted_amount ?? null,
    currency: refund.currency,
    status,
    providerStatus,
    customerNote: refund.customer_note ?? null,
    merchantNote: refund.merchant_note ?? null,
    refundedAt: refund.refunded_at ?? null,
    expectedAt: refund.expected_at ?? null,
    createdAt: refund.createdAt ?? refund.created_at ?? null,
    updatedAt: refund.updatedAt ?? refund.updated_at ?? null,
  };
}

function isKnownRefundStatus(status: string): status is KnownPaystackRefundStatus {
  return (knownRefundStatuses as readonly string[]).includes(status);
}

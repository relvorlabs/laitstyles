import "server-only";

import { z } from "zod";
import { paystackRequest } from "@/modules/payments/server/paystack/client";
import {
  type PaystackRawTransaction,
  paystackPaginationSchema,
  paystackProviderIdSchema,
  paystackTransactionSchema,
} from "@/modules/payments/server/paystack/schemas";
import { mapPaystackTransaction } from "@/modules/payments/server/paystack/transactions";

const settlementStatusSchema = z.enum(["failed", "pending", "processing", "success"]);
const settlementIdentifierSchema = z.union([
  z.number().int().positive(),
  z.string().trim().regex(/^\d+$/),
]);
const settlementListInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  status: settlementStatusSchema.optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});
const settlementTransactionsInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

const settlementSchema = z
  .object({
    id: paystackProviderIdSchema,
    status: settlementStatusSchema,
    currency: z.string().trim().length(3),
    total_amount: z.number().int().nonnegative().safe(),
    effective_amount: z.number().int().nonnegative().safe(),
    total_fees: z.number().int().nonnegative().safe(),
    total_processed: z.number().int().nonnegative().safe(),
    deductions: z.unknown().optional().nullable(),
    settlement_date: z.string().optional().nullable(),
    settled_by: z.string().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable(),
  })
  .passthrough();

const settlementListResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(settlementSchema),
  meta: paystackPaginationSchema,
});

const settlementTransactionsResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(paystackTransactionSchema),
  meta: paystackPaginationSchema,
});

export type PaystackSettlementStatus = z.infer<typeof settlementStatusSchema>;
export type ListSettlementsInput = z.input<typeof settlementListInputSchema>;
export type ListSettlementTransactionsInput = z.input<typeof settlementTransactionsInputSchema>;
export type PaystackSettlement = ReturnType<typeof mapSettlement>;

export async function listSettlements(
  input: ListSettlementsInput = {},
  fetchImplementation?: typeof fetch,
) {
  const parsed = settlementListInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "list-settlements",
    path: "/settlement",
    schema: settlementListResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      status: parsed.status,
      from: parsed.from,
      to: parsed.to,
    },
  });

  return {
    settlements: response.data.map(mapSettlement),
    pagination: response.meta,
  };
}

export async function listSettlementTransactions(
  settlementId: string | number,
  input: ListSettlementTransactionsInput = {},
  fetchImplementation?: typeof fetch,
) {
  const id = String(settlementIdentifierSchema.parse(settlementId));
  const parsed = settlementTransactionsInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "list-settlement-transactions",
    path: `/settlement/${encodeURIComponent(id)}/transactions`,
    schema: settlementTransactionsResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      from: parsed.from,
      to: parsed.to,
    },
  });

  return {
    transactions: response.data.map((transaction: PaystackRawTransaction) =>
      mapPaystackTransaction(transaction, { includeAuthorization: false }),
    ),
    pagination: response.meta,
  };
}

function mapSettlement(settlement: z.output<typeof settlementSchema>) {
  return {
    id: String(settlement.id),
    status: settlement.status,
    currency: settlement.currency.toUpperCase(),
    totalAmountMinor: settlement.total_amount,
    effectiveAmountMinor: settlement.effective_amount,
    totalFeesMinor: settlement.total_fees,
    totalProcessedMinor: settlement.total_processed,
    settlementDate: settlement.settlement_date ?? null,
    settledBy: settlement.settled_by ?? null,
    createdAt: settlement.createdAt ?? null,
    updatedAt: settlement.updatedAt ?? null,
  };
}

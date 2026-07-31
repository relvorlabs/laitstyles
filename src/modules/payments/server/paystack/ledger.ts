import "server-only";

import { z } from "zod";
import { paystackRequest } from "@/modules/payments/server/paystack/client";
import {
  paystackPaginationSchema,
  paystackProviderIdSchema,
} from "@/modules/payments/server/paystack/schemas";

const listLedgerInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

const ledgerRowSchema = z.object({
  id: paystackProviderIdSchema,
  balance: z.number().int().safe(),
  currency: z.string().trim().length(3),
  difference: z.number().int().safe(),
  reason: z.string().optional().nullable(),
  model_responsible: z.string().min(1),
  model_row: paystackProviderIdSchema.optional().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1).optional().nullable(),
});

const ledgerResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(ledgerRowSchema),
  meta: paystackPaginationSchema,
});

export type ListBalanceLedgerInput = z.input<typeof listLedgerInputSchema>;
export type PaystackBalanceLedgerEntry = ReturnType<typeof mapLedgerEntry>;

export async function fetchBalanceLedger(
  input: ListBalanceLedgerInput = {},
  fetchImplementation?: typeof fetch,
) {
  const parsed = listLedgerInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "fetch-balance-ledger",
    path: "/balance/ledger",
    schema: ledgerResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      from: parsed.from,
      to: parsed.to,
    },
  });

  return {
    entries: response.data.map(mapLedgerEntry),
    pagination: response.meta,
  };
}

function mapLedgerEntry(row: z.output<typeof ledgerRowSchema>) {
  return {
    id: String(row.id),
    balanceMinor: row.balance,
    differenceMinor: row.difference,
    direction: row.difference < 0 ? ("debit" as const) : ("credit" as const),
    currency: row.currency.toUpperCase(),
    reason: row.reason?.trim() || null,
    sourceType: row.model_responsible,
    sourceId: row.model_row === null || row.model_row === undefined ? null : String(row.model_row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
  };
}

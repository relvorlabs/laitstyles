import "server-only";

import { z } from "zod";
import { paystackRequest } from "@/modules/payments/server/paystack/client";
import {
  paystackInitializeResponseSchema,
  paystackListTransactionsResponseSchema,
  type PaystackRawTransaction,
  paystackTransactionResponseSchema,
} from "@/modules/payments/server/paystack/schemas";

const referenceSchema = z.string().trim().min(1).regex(/^[A-Za-z0-9.=_-]+$/);
const transactionIdentifierSchema = z.string().trim().min(1).regex(/^[A-Za-z0-9.=_-]+$/);
const currencySchema = z.string().trim().length(3).toUpperCase();
const amountMinorSchema = z.number().int().positive().safe();

const initializeTransactionInputSchema = z.object({
  email: z.string().trim().email(),
  amountMinor: amountMinorSchema,
  reference: referenceSchema,
  callbackUrl: z.string().url().optional(),
  currency: currencySchema.default("NGN"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listTransactionsInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  customer: z.number().int().positive().optional(),
  status: z.enum(["abandoned", "failed", "success"]).optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  amountMinor: z.number().int().nonnegative().safe().optional(),
});

const transactionTotalsInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

const currencyAmountSchema = z.object({
  currency: z.string().trim().length(3),
  amount: z.number().int().safe(),
});

const transactionTotalsResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z
    .object({
      total_transactions: z.number().int().nonnegative(),
      total_volume: z.number().int().nonnegative().safe(),
      total_volume_by_currency: z.array(currencyAmountSchema),
      pending_transfers: z.number().int().nonnegative().safe(),
      pending_transfers_by_currency: z.array(currencyAmountSchema),
    })
    .passthrough(),
});

const timelineHistorySchema = z.object({
  type: z.string().min(1),
  message: z.string(),
  time: z.number().int().nonnegative(),
});

const transactionTimelineResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z
    .object({
      start_time: z.number().int().nonnegative(),
      time_spent: z.number().int().nonnegative(),
      attempts: z.number().int().nonnegative(),
      errors: z.number().int().nonnegative(),
      success: z.boolean(),
      mobile: z.boolean(),
      input: z.array(z.unknown()),
      history: z.array(timelineHistorySchema),
    })
    .passthrough(),
});

export type InitializeTransactionInput = z.input<typeof initializeTransactionInputSchema>;
export type ListTransactionsInput = z.input<typeof listTransactionsInputSchema>;
export type TransactionTotalsInput = z.input<typeof transactionTotalsInputSchema>;

export type PaystackAuthorization = {
  authorizationCode: string;
  bin: string | null;
  last4: string | null;
  expMonth: string | null;
  expYear: string | null;
  channel: string;
  cardType: string | null;
  bank: string | null;
  countryCode: string | null;
  brand: string | null;
  reusable: boolean;
  signature: string | null;
  accountName: string | null;
};

export type PaystackCustomer = {
  id: string;
  email: string;
  customerCode: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export type PaystackTransaction = {
  id: string;
  status: string;
  reference: string;
  amountMinor: number;
  currency: string;
  paidAt: string | null;
  createdAt: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  message: string | null;
  feesMinor: number | null;
  authorization: PaystackAuthorization | null;
  customer: PaystackCustomer | null;
};

export type PaystackInitializedTransaction = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  rawResponse: z.output<typeof paystackInitializeResponseSchema>;
};

export type TransactionProjectionOptions = {
  includeAuthorization?: boolean;
};

export async function initializeTransaction(
  input: InitializeTransactionInput,
  fetchImplementation?: typeof fetch,
): Promise<PaystackInitializedTransaction> {
  const parsed = initializeTransactionInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "initialize",
    path: "/transaction/initialize",
    method: "POST",
    schema: paystackInitializeResponseSchema,
    fetchImplementation,
    body: {
      email: parsed.email,
      amount: parsed.amountMinor,
      currency: parsed.currency,
      reference: parsed.reference,
      ...(parsed.callbackUrl === undefined ? {} : { callback_url: parsed.callbackUrl }),
      ...(parsed.metadata === undefined ? {} : { metadata: JSON.stringify(parsed.metadata) }),
    },
  });

  return {
    authorizationUrl: response.data.authorization_url,
    accessCode: response.data.access_code,
    reference: response.data.reference,
    rawResponse: response,
  };
}

export async function verifyTransaction(
  reference: string,
  fetchImplementation?: typeof fetch,
): Promise<PaystackTransaction> {
  const parsedReference = referenceSchema.parse(reference);
  const response = await paystackRequest({
    operation: "verify",
    path: `/transaction/verify/${encodeURIComponent(parsedReference)}`,
    schema: paystackTransactionResponseSchema,
    fetchImplementation,
  });
  return mapPaystackTransaction(response.data, { includeAuthorization: true });
}

export async function listTransactions(
  input: ListTransactionsInput = {},
  fetchImplementation?: typeof fetch,
) {
  const parsed = listTransactionsInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "list-transactions",
    path: "/transaction",
    schema: paystackListTransactionsResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      status: parsed.status,
      customer: parsed.customer,
      from: parsed.from,
      to: parsed.to,
      amount: parsed.amountMinor,
    },
  });
  return {
    transactions: response.data.map((transaction) =>
      mapPaystackTransaction(transaction, { includeAuthorization: false }),
    ),
    pagination: response.meta,
  };
}

export async function fetchTransaction(
  id: string,
  fetchImplementation?: typeof fetch,
): Promise<PaystackTransaction> {
  const parsedId = z.string().regex(/^\d+$/).parse(id);
  const response = await paystackRequest({
    operation: "fetch-transaction",
    path: `/transaction/${parsedId}`,
    schema: paystackTransactionResponseSchema,
    fetchImplementation,
  });
  return mapPaystackTransaction(response.data, { includeAuthorization: true });
}

export async function fetchTransactionTimeline(
  idOrReference: string,
  fetchImplementation?: typeof fetch,
) {
  const identifier = transactionIdentifierSchema.parse(idOrReference);
  const response = await paystackRequest({
    operation: "fetch-transaction-timeline",
    path: `/transaction/timeline/${encodeURIComponent(identifier)}`,
    schema: transactionTimelineResponseSchema,
    fetchImplementation,
  });

  return {
    startTime: response.data.start_time,
    timeSpentSeconds: response.data.time_spent,
    attempts: response.data.attempts,
    errors: response.data.errors,
    success: response.data.success,
    mobile: response.data.mobile,
    history: response.data.history.map((entry) => ({
      type: entry.type,
      message: entry.message,
      elapsedSeconds: entry.time,
    })),
  };
}

export async function fetchTransactionTotals(
  input: TransactionTotalsInput = {},
  fetchImplementation?: typeof fetch,
) {
  const parsed = transactionTotalsInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "fetch-transaction-totals",
    path: "/transaction/totals",
    schema: transactionTotalsResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      from: parsed.from,
      to: parsed.to,
    },
  });

  return {
    totalTransactions: response.data.total_transactions,
    totalVolumeMinor: response.data.total_volume,
    totalVolumeByCurrency: response.data.total_volume_by_currency.map(mapCurrencyAmount),
    pendingTransfersMinor: response.data.pending_transfers,
    pendingTransfersByCurrency: response.data.pending_transfers_by_currency.map(mapCurrencyAmount),
  };
}

export function mapPaystackTransaction(
  transaction: PaystackRawTransaction,
  options: TransactionProjectionOptions = {},
): PaystackTransaction {
  const authorization = transaction.authorization;
  const customer = transaction.customer;
  const includeAuthorization = options.includeAuthorization ?? true;
  return {
    id: String(transaction.id),
    status: transaction.status,
    reference: transaction.reference,
    amountMinor: transaction.amount,
    currency: transaction.currency.toUpperCase(),
    paidAt: transaction.paid_at ?? null,
    createdAt: transaction.created_at ?? transaction.transaction_date ?? null,
    channel: transaction.channel ?? null,
    gatewayResponse: transaction.gateway_response ?? null,
    message: transaction.message ?? null,
    feesMinor: transaction.fees ?? null,
    authorization:
      includeAuthorization && authorization
        ? {
            authorizationCode: authorization.authorization_code,
            bin: authorization.bin ?? null,
            last4: authorization.last4 ?? null,
            expMonth: authorization.exp_month ?? null,
            expYear: authorization.exp_year ?? null,
            channel: authorization.channel,
            cardType: authorization.card_type ?? null,
            bank: authorization.bank ?? null,
            countryCode: authorization.country_code ?? null,
            brand: authorization.brand ?? null,
            reusable: authorization.reusable,
            signature: authorization.signature ?? null,
            accountName: authorization.account_name ?? null,
          }
        : null,
    customer: customer
      ? {
          id: String(customer.id),
          email: customer.email,
          customerCode: customer.customer_code,
          firstName: customer.first_name ?? null,
          lastName: customer.last_name ?? null,
          phone: customer.phone ?? null,
        }
      : null,
  };
}

function mapCurrencyAmount(value: z.output<typeof currencyAmountSchema>) {
  return { currency: value.currency.toUpperCase(), amountMinor: value.amount };
}

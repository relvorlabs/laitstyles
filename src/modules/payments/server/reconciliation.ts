import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { type Prisma, prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type { FinanceListQuery } from "@/modules/payments/finance-schema";
import type {
  FinanceError,
  ReconciliationOutcome,
  ReconciliationRecord,
} from "@/modules/payments/server/finance-types";
import {
  listTransactions,
  PaystackConfigurationError,
  PaystackProviderError,
  type PaystackTransaction,
} from "@/modules/payments/server/paystack";
import { decimalToMinor } from "@/modules/payments/server/refund-projection";

export async function reconcileFinanceTransactions(
  actor: StaffSession,
  query: FinanceListQuery,
): Promise<
  Result<
    { items: ReconciliationRecord[]; page: number; perPage: number; providerTotal: number },
    FinanceError
  >
> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({
      code: "FORBIDDEN",
      message: "You do not have permission to reconcile finance data.",
    });
  }

  try {
    const provider = await listTransactions({
      page: query.page,
      perPage: query.perPage,
      from: query.from,
      to: query.to,
    });
    const references = provider.transactions.map((transaction) => transaction.reference);
    const providerIds = provider.transactions.map((transaction) => transaction.id);
    const window = reconciliationWindow(query, provider.transactions);
    const matchClauses: Prisma.paymentsWhereInput[] = [
      ...(references.length ? [{ reference: { in: references } }] : []),
      ...(providerIds.length ? [{ provider_transaction_id: { in: providerIds } }] : []),
      ...(window ? [{ created_at: window }] : []),
    ];
    const local = matchClauses.length
      ? await prisma.payments.findMany({
          where: { provider: "paystack", OR: matchClauses },
          orderBy: { created_at: "desc" },
          take: Math.max(query.perPage, provider.transactions.length),
        })
      : [];

    const localByReference = new Map(local.map((payment) => [payment.reference, payment]));
    const localByProviderId = new Map(
      local.flatMap((payment) =>
        payment.provider_transaction_id
          ? [[payment.provider_transaction_id, payment] as const]
          : [],
      ),
    );
    const matchedLocalIds = new Set<string>();
    const items: ReconciliationRecord[] = provider.transactions.map((transaction) => {
      const payment =
        localByProviderId.get(transaction.id) ??
        localByReference.get(transaction.reference) ??
        null;
      if (!payment || matchedLocalIds.has(payment.id)) return providerOnly(transaction);
      matchedLocalIds.add(payment.id);
      const localAmountMinor = decimalToMinor(payment.amount);
      return {
        outcome: classifyFinanceTransaction({
          providerAmountMinor: transaction.amountMinor,
          providerCurrency: transaction.currency,
          providerStatus: transaction.status,
          localAmountMinor,
          localCurrency: payment.currency,
          localStatus: payment.status,
        }),
        providerId: transaction.id,
        providerReference: transaction.reference,
        localId: payment.id,
        localReference: payment.reference,
        providerAmountMinor: transaction.amountMinor,
        localAmountMinor,
        providerCurrency: transaction.currency,
        localCurrency: payment.currency,
        providerStatus: transaction.status,
        localStatus: payment.status,
      };
    });

    for (const payment of local) {
      if (matchedLocalIds.has(payment.id)) continue;
      items.push({
        outcome: "local_only",
        providerId: payment.provider_transaction_id,
        providerReference: null,
        localId: payment.id,
        localReference: payment.reference,
        providerAmountMinor: null,
        localAmountMinor: decimalToMinor(payment.amount),
        providerCurrency: null,
        localCurrency: payment.currency,
        providerStatus: null,
        localStatus: payment.status,
      });
    }

    return ok({
      items,
      page: provider.pagination.page,
      perPage: provider.pagination.perPage,
      providerTotal: provider.pagination.total,
    });
  } catch (error: unknown) {
    if (error instanceof PaystackConfigurationError || error instanceof PaystackProviderError) {
      return err({
        code: "FINANCE_PROVIDER_UNAVAILABLE",
        message: "Paystack reconciliation data is temporarily unavailable.",
      });
    }
    throw error;
  }
}

export function classifyFinanceTransaction(input: {
  providerAmountMinor: number;
  providerCurrency: string;
  providerStatus: string;
  localAmountMinor: number;
  localCurrency: string;
  localStatus: string;
}): ReconciliationOutcome {
  if (input.providerAmountMinor !== input.localAmountMinor) return "amount_mismatch";
  if (input.providerCurrency.toUpperCase() !== input.localCurrency.toUpperCase()) {
    return "currency_mismatch";
  }
  if (!statusesAgree(input.providerStatus, input.localStatus)) return "status_mismatch";
  return "matched";
}

function providerOnly(transaction: PaystackTransaction): ReconciliationRecord {
  return {
    outcome: "provider_only",
    providerId: transaction.id,
    providerReference: transaction.reference,
    localId: null,
    localReference: null,
    providerAmountMinor: transaction.amountMinor,
    localAmountMinor: null,
    providerCurrency: transaction.currency,
    localCurrency: null,
    providerStatus: transaction.status,
    localStatus: null,
  };
}

function statusesAgree(providerStatus: string, localStatus: string): boolean {
  if (providerStatus === "success") return localStatus === "success";
  if (providerStatus === "failed") return localStatus === "failed";
  if (providerStatus === "abandoned") return localStatus === "abandoned";
  return providerStatus === localStatus;
}

function reconciliationWindow(
  query: FinanceListQuery,
  transactions: PaystackTransaction[],
): Prisma.DateTimeFilter | null {
  const explicitFrom = query.from ? parseFilterDate(query.from) : null;
  const explicitTo = query.to ? parseFilterDate(query.to) : null;
  if (explicitFrom || explicitTo) {
    return {
      ...(explicitFrom ? { gte: explicitFrom } : {}),
      ...(explicitTo ? { lte: explicitTo } : {}),
    };
  }

  const dates = transactions.flatMap((transaction) => {
    const raw = transaction.createdAt ?? transaction.paidAt;
    if (!raw) return [];
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? [] : [parsed];
  });
  if (!dates.length) return null;
  const milliseconds = dates.map((date) => date.getTime());
  return {
    gte: new Date(Math.min(...milliseconds) - 24 * 60 * 60 * 1_000),
    lte: new Date(Math.max(...milliseconds) + 24 * 60 * 60 * 1_000),
  };
}

function parseFilterDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new TypeError("Finance date filter is invalid.");
  return parsed;
}

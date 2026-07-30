import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type {
  FinanceLedgerQuery,
  FinanceListQuery,
  SettlementListQuery,
} from "@/modules/payments/finance-schema";
import {
  type FinanceError,
  type SettlementProjection,
} from "@/modules/payments/server/finance-types";
import {
  toSettlementProjection,
} from "@/modules/payments/server/finance-projection";
import {
  fetchBalance,
  fetchBalanceLedger,
  fetchTransaction,
  fetchTransactionTimeline,
  fetchTransactionTotals,
  listSettlements as listPaystackSettlements,
  listSettlementTransactions as listPaystackSettlementTransactions,
  type PaystackTransaction,
  PaystackConfigurationError,
  PaystackProviderError,
  verifyTransaction,
} from "@/modules/payments/server/paystack";
import { decimalToMinor, minorToDecimal } from "@/modules/payments/server/refund-projection";

export async function getFinanceOverview(
  actor: StaffSession,
): Promise<
  Result<
    {
      balances: Array<{ currency: string; availableAmountMinor: number }>;
      totals: Awaited<ReturnType<typeof fetchTransactionTotals>>;
      unresolvedTransfers: number;
      pendingSettlements: number;
    },
    FinanceError
  >
> {
  const denied = requireFinanceRead(actor);
  if (denied) return denied;

  try {
    const [balances, totals, unresolvedTransfers, pendingSettlements] = await Promise.all([
      fetchBalance(),
      fetchTransactionTotals(),
      prisma.payout_transfers.count({
        where: {
          OR: [
            { reconciliation_required: true },
            { status: { in: ["pending", "otp_required", "processing", "needs_reconciliation"] } },
          ],
        },
      }),
      prisma.provider_settlements.count({ where: { status: { in: ["pending", "processing"] } } }),
    ]);
    return ok({
      balances: balances.map((balance) => ({
        currency: balance.currency,
        availableAmountMinor: balance.availableMinor,
      })),
      totals,
      unresolvedTransfers,
      pendingSettlements,
    });
  } catch (error: unknown) {
    return providerFailure(error);
  }
}

export async function listFinanceLedger(
  actor: StaffSession,
  query: FinanceLedgerQuery,
): Promise<Result<Awaited<ReturnType<typeof fetchBalanceLedger>>, FinanceError>> {
  const denied = requireFinanceRead(actor);
  if (denied) return denied;

  try {
    const result = await fetchBalanceLedger(query);
    return ok({
      ...result,
      entries: query.sourceType
        ? result.entries.filter((entry) => entry.sourceType === query.sourceType)
        : result.entries,
    });
  } catch (error: unknown) {
    return providerFailure(error);
  }
}

export async function getFinanceTransaction(
  actor: StaffSession,
  idOrReference: string,
): Promise<
  Result<
    {
      provider: ReturnType<typeof toSafeTransactionProjection>;
      local: {
        paymentId: string;
        orderId: string;
        orderNumber: string;
        localStatus: string;
        localAmountMinor: number;
        localCurrency: string;
      } | null;
      timeline: Awaited<ReturnType<typeof fetchTransactionTimeline>>;
    },
    FinanceError
  >
> {
  const denied = requireFinanceRead(actor);
  if (denied) return denied;

  try {
    const provider = /^\d+$/.test(idOrReference)
      ? await fetchTransaction(idOrReference)
      : await verifyTransaction(idOrReference);
    const [local, timeline] = await Promise.all([
      prisma.payments.findFirst({
        where: {
          provider: "paystack",
          OR: [
            { provider_transaction_id: provider.id },
            { reference: provider.reference },
          ],
        },
        include: { orders: { select: { id: true, order_number: true } } },
      }),
      fetchTransactionTimeline(idOrReference),
    ]);

    return ok({
      provider: toSafeTransactionProjection(provider),
      local: local
        ? {
            paymentId: local.id,
            orderId: local.orders.id,
            orderNumber: local.orders.order_number,
            localStatus: local.status,
            localAmountMinor: decimalToMinor(local.amount),
            localCurrency: local.currency,
          }
        : null,
      timeline,
    });
  } catch (error: unknown) {
    return providerFailure(error);
  }
}

export async function listFinanceSettlements(
  actor: StaffSession,
  query: SettlementListQuery,
): Promise<
  Result<
    { items: SettlementProjection[]; page: number; perPage: number; total: number },
    FinanceError
  >
> {
  const denied = requireFinanceRead(actor);
  if (denied) return denied;

  try {
    const provider = await listPaystackSettlements(query);
    const rows = await Promise.all(provider.settlements.map(persistSettlement));
    return ok({
      items: rows.map(toSettlementProjection),
      page: provider.pagination.page,
      perPage: provider.pagination.perPage,
      total: provider.pagination.total,
    });
  } catch (error: unknown) {
    return providerFailure(error);
  }
}

export async function getFinanceSettlement(
  actor: StaffSession,
  providerSettlementId: string,
): Promise<Result<SettlementProjection, FinanceError>> {
  const denied = requireFinanceRead(actor);
  if (denied) return denied;

  let row = await prisma.provider_settlements.findUnique({
    where: {
      provider_provider_settlement_id: {
        provider: "paystack",
        provider_settlement_id: providerSettlementId,
      },
    },
  });

  if (!row) {
    const refreshed = await listFinanceSettlements(actor, { page: 1, perPage: 100 });
    if (!refreshed.ok) return refreshed;
    row = await prisma.provider_settlements.findUnique({
      where: {
        provider_provider_settlement_id: {
          provider: "paystack",
          provider_settlement_id: providerSettlementId,
        },
      },
    });
  }

  return row
    ? ok(toSettlementProjection(row))
    : err({ code: "FINANCE_RECORD_NOT_FOUND", message: "The settlement could not be found." });
}

export async function listFinanceSettlementTransactions(
  actor: StaffSession,
  providerSettlementId: string,
  query: FinanceListQuery,
): Promise<
  Result<
    {
      items: Array<ReturnType<typeof toSafeTransactionProjection> & {
        localPaymentId: string | null;
        orderId: string | null;
        orderNumber: string | null;
      }>;
      page: number;
      perPage: number;
      total: number;
    },
    FinanceError
  >
> {
  const denied = requireFinanceRead(actor);
  if (denied) return denied;

  try {
    const provider = await listPaystackSettlementTransactions(providerSettlementId, query);
    const references = provider.transactions.map((transaction) => transaction.reference);
    const providerIds = provider.transactions.map((transaction) => transaction.id);
    const localRows = await prisma.payments.findMany({
      where: {
        provider: "paystack",
        OR: [
          { reference: { in: references } },
          { provider_transaction_id: { in: providerIds } },
        ],
      },
      include: { orders: { select: { id: true, order_number: true } } },
    });
    const localByReference = new Map(localRows.map((payment) => [payment.reference, payment]));
    const localByProviderId = new Map(
      localRows.flatMap((payment) =>
        payment.provider_transaction_id ? [[payment.provider_transaction_id, payment] as const] : [],
      ),
    );

    return ok({
      items: provider.transactions.map((transaction) => {
        const local = localByProviderId.get(transaction.id) ?? localByReference.get(transaction.reference);
        return {
          ...toSafeTransactionProjection(transaction),
          localPaymentId: local?.id ?? null,
          orderId: local?.orders.id ?? null,
          orderNumber: local?.orders.order_number ?? null,
        };
      }),
      page: provider.pagination.page,
      perPage: provider.pagination.perPage,
      total: provider.pagination.total,
    });
  } catch (error: unknown) {
    return providerFailure(error);
  }
}

async function persistSettlement(
  settlement: Awaited<ReturnType<typeof listPaystackSettlements>>["settlements"][number],
) {
  const now = new Date();
  return prisma.provider_settlements.upsert({
    where: {
      provider_provider_settlement_id: {
        provider: "paystack",
        provider_settlement_id: settlement.id,
      },
    },
    create: {
      provider: "paystack",
      provider_settlement_id: settlement.id,
      status: settlement.status,
      total_amount: minorToDecimal(settlement.totalAmountMinor),
      effective_amount: minorToDecimal(settlement.effectiveAmountMinor),
      total_fees: minorToDecimal(settlement.totalFeesMinor),
      total_processed: minorToDecimal(settlement.totalProcessedMinor),
      currency: settlement.currency,
      settled_at: parseProviderDate(settlement.settlementDate),
      last_provider_sync_at: now,
      provider_snapshot: {
        status: settlement.status,
        totalAmountMinor: settlement.totalAmountMinor,
        effectiveAmountMinor: settlement.effectiveAmountMinor,
        totalFeesMinor: settlement.totalFeesMinor,
        totalProcessedMinor: settlement.totalProcessedMinor,
      },
    },
    update: {
      status: settlement.status,
      total_amount: minorToDecimal(settlement.totalAmountMinor),
      effective_amount: minorToDecimal(settlement.effectiveAmountMinor),
      total_fees: minorToDecimal(settlement.totalFeesMinor),
      total_processed: minorToDecimal(settlement.totalProcessedMinor),
      currency: settlement.currency,
      settled_at: parseProviderDate(settlement.settlementDate),
      last_provider_sync_at: now,
      provider_snapshot: {
        status: settlement.status,
        totalAmountMinor: settlement.totalAmountMinor,
        effectiveAmountMinor: settlement.effectiveAmountMinor,
        totalFeesMinor: settlement.totalFeesMinor,
        totalProcessedMinor: settlement.totalProcessedMinor,
      },
    },
  });
}

function toSafeTransactionProjection(transaction: PaystackTransaction) {
  return {
    id: transaction.id,
    status: transaction.status,
    reference: transaction.reference,
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
    paidAt: transaction.paidAt,
    createdAt: transaction.createdAt,
    channel: transaction.channel,
    gatewayResponse: transaction.gatewayResponse,
    message: transaction.message,
    feesMinor: transaction.feesMinor,
    customerEmail: transaction.customer?.email ?? null,
    authorization: transaction.authorization
      ? {
          channel: transaction.authorization.channel,
          cardType: transaction.authorization.cardType,
          bank: transaction.authorization.bank,
          last4: transaction.authorization.last4,
          reusable: transaction.authorization.reusable,
        }
      : null,
  };
}

function requireFinanceRead(actor: StaffSession): Result<never, FinanceError> | null {
  return hasCapability(actor.role, "finance:read")
    ? null
    : err({ code: "FORBIDDEN", message: "You do not have permission to view finance data." });
}

function providerFailure<T>(error: unknown): Result<T, FinanceError> {
  if (error instanceof PaystackConfigurationError || error instanceof PaystackProviderError) {
    return err({
      code: "FINANCE_PROVIDER_UNAVAILABLE",
      message: "Paystack finance data is temporarily unavailable.",
    });
  }
  throw error;
}

function parseProviderDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

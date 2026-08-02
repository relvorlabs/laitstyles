import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { reconcileFinanceBodySchema } from "@/modules/payments/finance-schema";
import {
  getFinanceSettlement,
  listFinanceSettlements,
  reconcileFinanceTransactions,
  throwFinanceApiError,
} from "@/modules/payments/server/finance/index";
import type {
  PayoutTransferProjection,
  ReconciliationRecord,
  SettlementProjection,
} from "@/modules/payments/server/finance-types";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";
import {
  listPayoutTransfers,
  reconcilePayoutTransfer,
} from "@/modules/payments/server/transfers/index";

const privateNoStore = { "Cache-Control": "private, no-store" };

type ReconcileResponseData = {
  transfers?: PayoutTransferProjection[];
  settlements?: SettlementProjection[];
  transactions?: {
    items: ReconciliationRecord[];
    page: number;
    perPage: number;
    providerTotal: number;
  };
};

export async function POST(request: Request) {
  return handleApiRequest<ReconcileResponseData>(request, async () => {
    requireFinancialMutationOrigin(request);
    requireIdempotencyKey(request);
    const actor = await requireApiStaff("finance:transfer");
    const input = reconcileFinanceBodySchema.parse(await request.json());

    if (input.scope === "transfers" && input.transferId) {
      const result = await reconcilePayoutTransfer(actor, input.transferId);
      if (!result.ok) throwFinanceApiError(result.error);
      return { data: { transfers: [result.value] }, headers: privateNoStore };
    }

    if (input.scope === "settlements" && input.settlementId) {
      const refresh = await listFinanceSettlements(actor, { page: 1, perPage: 100 });
      if (!refresh.ok) throwFinanceApiError(refresh.error);
      const detail = await getFinanceSettlement(actor, input.settlementId);
      if (!detail.ok) throwFinanceApiError(detail.error);
      return { data: { settlements: [detail.value] }, headers: privateNoStore };
    }

    const transactions = await reconcileFinanceTransactions(actor, { page: 1, perPage: 100 });
    if (!transactions.ok) throwFinanceApiError(transactions.error);
    if (input.scope === "transactions") {
      return { data: { transactions: transactions.value }, headers: privateNoStore };
    }

    const settlements = await listFinanceSettlements(actor, { page: 1, perPage: 100 });
    if (!settlements.ok) throwFinanceApiError(settlements.error);
    const unresolved = await listPayoutTransfers(actor, {
      page: 1,
      perPage: 25,
      status: "needs_reconciliation",
    });
    if (!unresolved.ok) throwFinanceApiError(unresolved.error);
    const transfers = [];
    for (const transfer of unresolved.value.items) {
      const reconciled = await reconcilePayoutTransfer(actor, transfer.id);
      if (reconciled.ok) transfers.push(reconciled.value);
    }

    return {
      data: {
        transactions: transactions.value,
        settlements: settlements.value.items,
        transfers,
      },
      headers: privateNoStore,
    };
  });
}

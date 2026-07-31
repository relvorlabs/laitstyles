import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import {
  financeListQuerySchema,
  settlementIdentifierSchema,
} from "@/modules/payments/finance-schema";
import {
  listFinanceSettlementTransactions,
  throwFinanceApiError,
} from "@/modules/payments/server/finance/index";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ settlementId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const { settlementId } = await context.params;
    const query = financeListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const result = await listFinanceSettlementTransactions(
      actor,
      settlementIdentifierSchema.parse(settlementId),
      query,
    );
    if (!result.ok) throwFinanceApiError(result.error);
    return {
      data: result.value.items,
      meta: { page: result.value.page, perPage: result.value.perPage, total: result.value.total },
      headers: privateNoStore,
    };
  });
}

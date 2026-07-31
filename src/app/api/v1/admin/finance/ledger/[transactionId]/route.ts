import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { financeTransactionIdentifierSchema } from "@/modules/payments/finance-schema";
import { getFinanceTransaction, throwFinanceApiError } from "@/modules/payments/server/finance/index";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ transactionId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const { transactionId } = await context.params;
    const result = await getFinanceTransaction(
      actor,
      financeTransactionIdentifierSchema.parse(transactionId),
    );
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { settlementIdentifierSchema } from "@/modules/payments/finance-schema";
import { getFinanceSettlement, throwFinanceApiError } from "@/modules/payments/server/finance/index";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ settlementId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const { settlementId } = await context.params;
    const result = await getFinanceSettlement(actor, settlementIdentifierSchema.parse(settlementId));
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

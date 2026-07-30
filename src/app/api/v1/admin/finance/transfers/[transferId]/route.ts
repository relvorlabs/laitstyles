import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { payoutTransferIdentifierSchema } from "@/modules/payments/finance-schema";
import { getPayoutTransfer, throwFinanceApiError } from "@/modules/payments/server/transfers/index";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ transferId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const { transferId } = await context.params;
    const result = await getPayoutTransfer(actor, payoutTransferIdentifierSchema.parse(transferId));
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

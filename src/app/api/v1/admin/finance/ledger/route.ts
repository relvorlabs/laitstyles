import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { financeLedgerQuerySchema } from "@/modules/payments/finance-schema";
import { listFinanceLedger, throwFinanceApiError } from "@/modules/payments/server/finance/index";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const query = financeLedgerQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const result = await listFinanceLedger(actor, query);
    if (!result.ok) throwFinanceApiError(result.error);
    return {
      data: result.value.entries,
      meta: result.value.pagination,
      headers: privateNoStore,
    };
  });
}

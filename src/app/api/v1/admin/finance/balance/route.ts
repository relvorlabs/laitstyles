import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { getFinanceOverview, throwFinanceApiError } from "@/modules/payments/server/finance/index";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const result = await getFinanceOverview(actor);
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

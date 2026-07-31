import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { bankListQuerySchema } from "@/modules/payments/finance-schema";
import { listPayoutBanks, throwFinanceApiError } from "@/modules/payments/server/transfers/index";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const query = bankListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const result = await listPayoutBanks(actor, query);
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value.banks, meta: result.value.cursors, headers: privateNoStore };
  });
}

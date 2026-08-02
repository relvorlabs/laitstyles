import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { settlementListQuerySchema } from "@/modules/payments/finance-schema";
import {
  listFinanceSettlements,
  throwFinanceApiError,
} from "@/modules/payments/server/finance/index";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const query = settlementListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const result = await listFinanceSettlements(actor, query);
    if (!result.ok) throwFinanceApiError(result.error);
    return {
      data: result.value.items,
      meta: { page: result.value.page, perPage: result.value.perPage, total: result.value.total },
      headers: privateNoStore,
    };
  });
}

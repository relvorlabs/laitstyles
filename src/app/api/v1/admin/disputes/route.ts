import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { disputeListQuerySchema } from "@/modules/payments/dispute-schema";
import {
  listPaymentDisputes,
  throwDisputeApiError,
} from "@/modules/payments/server/disputes";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const query = disputeListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const result = await listPaymentDisputes(actor, query);
    if (!result.ok) throwDisputeApiError(result.error);
    return {
      data: result.value.items,
      meta: {
        page: result.value.page,
        perPage: result.value.perPage,
        total: result.value.total,
      },
      headers: privateNoStore,
    };
  });
}

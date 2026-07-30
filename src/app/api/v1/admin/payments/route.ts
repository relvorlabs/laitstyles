import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { adminPaymentListQuerySchema } from "@/modules/payments/refund-schema";
import {
  listAdminPayments,
  throwAdminPaymentApiError,
} from "@/modules/payments/server/admin";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const query = adminPaymentListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const result = await listAdminPayments(actor, query);
    if (!result.ok) throwAdminPaymentApiError(result.error);
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

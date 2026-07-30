import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { paymentIdentifierSchema } from "@/modules/payments/refund-schema";
import { getAdminPaymentTimeline } from "@/modules/payments/server/admin-payments";
import { throwAdminPaymentApiError } from "@/modules/payments/server/refund-api-errors";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ paymentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const { paymentId } = await context.params;
    const result = await getAdminPaymentTimeline(actor, paymentIdentifierSchema.parse(paymentId));
    if (!result.ok) throwAdminPaymentApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

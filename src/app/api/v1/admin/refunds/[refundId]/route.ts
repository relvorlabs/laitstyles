import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { refundIdentifierSchema } from "@/modules/payments/refund-schema";
import { getRefund, throwRefundApiError } from "@/modules/payments/server/refunds/index";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ refundId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const { refundId } = await context.params;
    const result = await getRefund(actor, refundIdentifierSchema.parse(refundId));
    if (!result.ok) throwRefundApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

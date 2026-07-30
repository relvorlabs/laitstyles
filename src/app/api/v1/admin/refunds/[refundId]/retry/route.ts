import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { refundIdentifierSchema } from "@/modules/payments/refund-schema";
import { throwRefundApiError } from "@/modules/payments/server/refund-api-errors";
import { retryRefund } from "@/modules/payments/server/refunds";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ refundId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    requireIdempotencyKey(request);
    const actor = await requireApiStaff("payments:refund");
    const { refundId } = await context.params;
    const result = await retryRefund(actor, refundIdentifierSchema.parse(refundId));
    if (!result.ok) throwRefundApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

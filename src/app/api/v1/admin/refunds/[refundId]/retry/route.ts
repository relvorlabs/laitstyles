import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { refundIdentifierSchema } from "@/modules/payments/refund-schema";
import { throwRefundApiError } from "@/modules/payments/server/refund-api-errors";
import { retryRefund } from "@/modules/payments/server/refunds";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ refundId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("payments:refund");
    if (!request.headers.get("Idempotency-Key")?.trim()) {
      throw new ApiError({
        code: "IDEMPOTENCY_KEY_REQUIRED",
        message: "An Idempotency-Key header is required for refund retries.",
        status: 400,
      });
    }
    const { refundId } = await context.params;
    const result = await retryRefund(actor, refundIdentifierSchema.parse(refundId));
    if (!result.ok) throwRefundApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

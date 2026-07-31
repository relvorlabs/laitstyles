import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { refundIdentifierSchema } from "@/modules/payments/refund-schema";
import {
  retryRefundCommand,
  throwRefundApiError,
} from "@/modules/payments/server/refunds/index";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ refundId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const actor = await requireApiStaff("payments:refund");
    const { refundId } = await context.params;
    const result = await retryRefundCommand(
      actor,
      refundIdentifierSchema.parse(refundId),
      idempotencyKey,
    );
    if (!result.ok) throwRefundApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

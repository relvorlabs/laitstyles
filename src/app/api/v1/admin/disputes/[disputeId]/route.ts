import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  disputeIdentifierSchema,
  updateDisputeBodySchema,
} from "@/modules/payments/dispute-schema";
import {
  getPaymentDispute,
  reconcileOrderDisputeState,
  throwDisputeApiError,
  updatePaymentDispute,
} from "@/modules/payments/server/disputes";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ disputeId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const { disputeId } = await context.params;
    const result = await getPaymentDispute(actor, disputeIdentifierSchema.parse(disputeId));
    if (!result.ok) throwDisputeApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const actor = await requireApiStaff("payments:refund");
    const { disputeId } = await context.params;
    const input = await parseJsonBody(request, updateDisputeBodySchema);
    const result = await updatePaymentDispute(actor, disputeIdentifierSchema.parse(disputeId), {
      ...input,
      idempotencyKey,
    });
    if (!result.ok) throwDisputeApiError(result.error);
    return {
      data: await reconcileOrderDisputeState(result.value),
      headers: privateNoStore,
    };
  });
}

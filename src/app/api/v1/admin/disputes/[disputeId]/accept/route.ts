import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  disputeDecisionBodySchema,
  disputeIdentifierSchema,
} from "@/modules/payments/dispute-schema";
import { throwDisputeApiError } from "@/modules/payments/server/dispute-api-errors";
import { reconcileOrderDisputeState } from "@/modules/payments/server/dispute-order-state";
import { acceptPaymentDispute } from "@/modules/payments/server/disputes";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ disputeId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const actor = await requireApiStaff("payments:refund");
    const { disputeId } = await context.params;
    const id = disputeIdentifierSchema.parse(disputeId);
    const input = await parseJsonBody(request, disputeDecisionBodySchema);
    const result = await acceptPaymentDispute(actor, id, { ...input, idempotencyKey });
    if (!result.ok) throwDisputeApiError(result.error);
    await reconcileOrderDisputeState(result.value);
    return { data: result.value, headers: privateNoStore };
  });
}

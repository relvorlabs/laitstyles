import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import {
  finalizeTransferBodySchema,
  payoutTransferIdentifierSchema,
} from "@/modules/payments/finance-schema";
import {
  finalizePayoutTransferOtp,
  throwFinanceApiError,
} from "@/modules/payments/server/transfers/index";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ transferId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    requireIdempotencyKey(request);
    const actor = await requireApiStaff("finance:transfer");
    const { transferId } = await context.params;
    const input = finalizeTransferBodySchema.parse(await request.json());
    const result = await finalizePayoutTransferOtp(
      actor,
      payoutTransferIdentifierSchema.parse(transferId),
      input.otp,
    );
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

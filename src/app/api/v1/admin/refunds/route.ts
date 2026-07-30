import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { refundListQuerySchema, requestRefundBodySchema } from "@/modules/payments/refund-schema";
import { throwRefundApiError } from "@/modules/payments/server/refund-api-errors";
import { listRefunds, requestRefund } from "@/modules/payments/server/refunds";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const query = refundListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const result = await listRefunds(actor, query);
    if (!result.ok) throwRefundApiError(result.error);
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

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const actor = await requireApiStaff("payments:refund");
    const body = await parseJsonBody(request, requestRefundBodySchema);
    const result = await requestRefund(actor, {
      paymentId: body.paymentId,
      amountMinor: body.amountMinor,
      currency: body.currency,
      idempotencyKey,
      ...(body.reason ? { reason: body.reason } : {}),
      ...(body.returnId ? { returnId: body.returnId } : {}),
      ...(body.lineAllocations ? { lineAllocations: body.lineAllocations } : {}),
    });
    if (!result.ok) throwRefundApiError(result.error);
    return { data: result.value, status: 201, headers: privateNoStore };
  });
}

import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { refundListQuerySchema, requestRefundBodySchema } from "@/modules/payments/refund-schema";
import { throwRefundApiError } from "@/modules/payments/server/refund-api-errors";
import { listRefunds, requestRefund } from "@/modules/payments/server/refunds";

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
    const actor = await requireApiStaff("payments:refund");
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey) {
      throw new ApiError({
        code: "IDEMPOTENCY_KEY_REQUIRED",
        message: "An Idempotency-Key header is required for refund commands.",
        status: 400,
      });
    }
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

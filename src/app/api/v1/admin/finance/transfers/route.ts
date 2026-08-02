import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import {
  initiateTransferBodySchema,
  transferListQuerySchema,
} from "@/modules/payments/finance-schema";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";
import {
  initiatePayoutTransfer,
  listPayoutTransfers,
  throwFinanceApiError,
} from "@/modules/payments/server/transfers/index";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const query = transferListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const result = await listPayoutTransfers(actor, query);
    if (!result.ok) throwFinanceApiError(result.error);
    return {
      data: result.value.items,
      meta: { page: result.value.page, perPage: result.value.perPage, total: result.value.total },
      headers: privateNoStore,
    };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const actor = await requireApiStaff("finance:transfer");
    const input = initiateTransferBodySchema.parse(await request.json());
    const result = await initiatePayoutTransfer(actor, { ...input, idempotencyKey });
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, status: 201, headers: privateNoStore };
  });
}

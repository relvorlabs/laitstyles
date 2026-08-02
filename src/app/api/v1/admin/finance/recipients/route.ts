import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import {
  createRecipientBodySchema,
  recipientListQuerySchema,
} from "@/modules/payments/finance-schema";
import { requireFinancialMutationOrigin } from "@/modules/payments/server/request-security";
import {
  createPayoutRecipient,
  listPayoutRecipients,
  throwFinanceApiError,
} from "@/modules/payments/server/transfers/index";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("finance:read");
    const query = recipientListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const result = await listPayoutRecipients(actor, query);
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
    const actor = await requireApiStaff("finance:transfer");
    const input = createRecipientBodySchema.parse(await request.json());
    const result = await createPayoutRecipient(actor, input);
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, status: 201, headers: privateNoStore };
  });
}

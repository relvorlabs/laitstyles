import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { resolveBankAccountBodySchema } from "@/modules/payments/finance-schema";
import { requireFinancialMutationOrigin } from "@/modules/payments/server/request-security";
import {
  resolvePayoutAccount,
  throwFinanceApiError,
} from "@/modules/payments/server/transfers/index";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const actor = await requireApiStaff("finance:transfer");
    const input = resolveBankAccountBodySchema.parse(await request.json());
    const result = await resolvePayoutAccount(actor, input);
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

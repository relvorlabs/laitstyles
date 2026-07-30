import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import {
  payoutRecipientIdentifierSchema,
  updateRecipientBodySchema,
} from "@/modules/payments/finance-schema";
import {
  deletePayoutRecipient,
  throwFinanceApiError,
  updatePayoutRecipient,
} from "@/modules/payments/server/transfers/index";
import { requireFinancialMutationOrigin } from "@/modules/payments/server/request-security";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ recipientId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const actor = await requireApiStaff("finance:transfer");
    const { recipientId } = await context.params;
    const input = updateRecipientBodySchema.parse(await request.json());
    const result = await updatePayoutRecipient(
      actor,
      payoutRecipientIdentifierSchema.parse(recipientId),
      input,
    );
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const actor = await requireApiStaff("finance:transfer");
    const { recipientId } = await context.params;
    const result = await deletePayoutRecipient(
      actor,
      payoutRecipientIdentifierSchema.parse(recipientId),
    );
    if (!result.ok) throwFinanceApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

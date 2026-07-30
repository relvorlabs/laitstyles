import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { paymentMethodIdentifierSchema, updatePaymentMethodSchema } from "@/modules/payments/schema";
import {
  deletePaymentMethod,
  setDefaultPaymentMethod,
  throwPaymentMethodApiError,
} from "@/modules/payments/server/payment-methods/index";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ methodId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { methodId } = await context.params;
    const id = paymentMethodIdentifierSchema.parse(methodId);
    await parseJsonBody(request, updatePaymentMethodSchema);
    const result = await setDefaultPaymentMethod(identity, id);
    if (!result.ok) throwPaymentMethodApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { methodId } = await context.params;
    const result = await deletePaymentMethod(
      identity,
      paymentMethodIdentifierSchema.parse(methodId),
    );
    if (!result.ok) throwPaymentMethodApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

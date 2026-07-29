import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { paymentMethodIdentifierSchema } from "@/modules/payments/schema";
import { throwPaymentMethodApiError } from "@/modules/payments/server/api-errors";
import { verifyPaymentMethodSetup } from "@/modules/payments/server/payment-methods";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { attemptId } = await context.params;
    const id = paymentMethodIdentifierSchema.parse(attemptId);
    const result = await verifyPaymentMethodSetup(identity, id);
    if (!result.ok) throwPaymentMethodApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

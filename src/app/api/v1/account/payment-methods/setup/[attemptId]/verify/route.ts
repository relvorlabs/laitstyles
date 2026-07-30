import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { paymentMethodIdentifierSchema } from "@/modules/payments/schema";
import {
  throwPaymentMethodApiError,
  verifyPaymentMethodSetup,
} from "@/modules/payments/server/payment-methods";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { attemptId } = await context.params;
    const result = await verifyPaymentMethodSetup(
      identity,
      paymentMethodIdentifierSchema.parse(attemptId),
    );
    if (!result.ok) throwPaymentMethodApiError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}

import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { paymentIdentifierSchema } from "@/modules/checkout/schema";
import { throwCheckoutApiError } from "@/modules/checkout/server/api-errors";
import { verifyCheckoutPayment } from "@/modules/checkout/server/verify-payment";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ paymentId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { paymentId } = await context.params;
    const parsedId = paymentIdentifierSchema.parse(paymentId);
    const result = await verifyCheckoutPayment(identity, parsedId);
    if (!result.ok) throwCheckoutApiError(result.error);

    return { data: result.value, headers: privateNoStore };
  });
}

import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { checkoutIdentifierSchema } from "@/modules/checkout/schema";
import { throwCheckoutApiError } from "@/modules/checkout/server/api-errors";
import { getCheckout } from "@/modules/checkout/server/get-checkout";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ checkoutId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { checkoutId } = await context.params;
    const parsedId = checkoutIdentifierSchema.parse(checkoutId);
    const result = await getCheckout(identity, parsedId);
    if (!result.ok) throwCheckoutApiError(result.error);

    return { data: result.value, headers: privateNoStore };
  });
}

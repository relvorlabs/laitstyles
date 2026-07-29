import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { getConfiguredAuthOrigin } from "@/modules/auth/server/redirects";
import { createCheckoutRequestSchema } from "@/modules/checkout/schema";
import { throwCheckoutApiError } from "@/modules/checkout/server/api-errors";
import { createCheckout } from "@/modules/checkout/server/create-checkout";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, createCheckoutRequestSchema);
    const callbackOrigin = getConfiguredAuthOrigin() ?? new URL(request.url).origin;
    const callbackUrl = new URL("/checkout", `${callbackOrigin}/`).toString();
    const result = await createCheckout(identity, { ...input, callbackUrl });
    if (!result.ok) throwCheckoutApiError(result.error);

    return { data: result.value, status: 201, headers: privateNoStore };
  });
}

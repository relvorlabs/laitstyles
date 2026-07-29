import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { getConfiguredAuthOrigin } from "@/modules/auth/server/redirects";
import { createPaymentMethodSetupSchema } from "@/modules/payments/schema";
import { throwPaymentMethodApiError } from "@/modules/payments/server/api-errors";
import { createPaymentMethodSetup, listPaymentMethods } from "@/modules/payments/server/payment-methods";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    return { data: await listPaymentMethods(identity), headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, createPaymentMethodSetupSchema);
    const origin = getConfiguredAuthOrigin() ?? new URL(request.url).origin;
    const callbackUrl = new URL("/account/payment-methods", `${origin}/`).toString();
    const result = await createPaymentMethodSetup(identity, input, callbackUrl);
    if (!result.ok) throwPaymentMethodApiError(result.error);
    return { data: result.value, status: 201, headers: privateNoStore };
  });
}

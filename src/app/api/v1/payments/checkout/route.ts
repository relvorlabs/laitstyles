import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { getConfiguredAuthOrigin } from "@/modules/auth/server/redirects";
import { createCheckoutRequestSchema } from "@/modules/checkout/schema";
import { throwCheckoutApiError } from "@/modules/checkout/server/api-errors";
import { createCheckout } from "@/modules/checkout/server/create-checkout";
import { getCheckoutContext } from "@/modules/checkout/server/get-checkout-context";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const context = await getCheckoutContext(identity);
    return { data: context, headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, createCheckoutRequestSchema);
    const callbackUrl = getPaystackCallbackUrl(request);
    const result = await createCheckout(identity, {
      ...input,
      ...(callbackUrl ? { callbackUrl } : {}),
    });
    if (!result.ok) throwCheckoutApiError(result.error);
    return { data: result.value, status: 201, headers: privateNoStore };
  });
}

function getPaystackCallbackUrl(request: Request): string | undefined {
  const configuredOrigin = getConfiguredAuthOrigin();
  const candidate = new URL(configuredOrigin ?? request.url);

  if (candidate.protocol !== "https:" || isLocalHostname(candidate.hostname)) {
    return undefined;
  }

  return new URL("/account/orders?payment=processing", `${candidate.origin}/`).toString();
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

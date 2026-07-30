import { handleApiRequest } from "@/lib/http/server";
import { processPaystackWebhook } from "@/modules/payments/server/webhooks/paystack-handler";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const result = await processPaystackWebhook({
      rawBody: await request.text(),
      signature: request.headers.get("x-paystack-signature"),
    });
    return { data: result, headers: noStore };
  });
}

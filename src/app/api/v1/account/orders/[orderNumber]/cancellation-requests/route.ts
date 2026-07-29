import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { orderCancellationRequestSchema, orderIdentifierSchema } from "@/modules/orders/schema";
import { requestOrderCancellation } from "@/modules/orders/server/account-orders";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = { params: Promise<{ orderNumber: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { orderNumber } = await context.params;
    const identifier = orderIdentifierSchema.parse(orderNumber);
    const input = await parseJsonBody(request, orderCancellationRequestSchema);
    const result = await requestOrderCancellation(identity, identifier, input);
    return { data: result, status: 201, headers: privateNoStore };
  });
}

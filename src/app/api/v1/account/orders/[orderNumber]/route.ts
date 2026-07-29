import { ApiError } from "@/lib/errors/api-error";
import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { orderIdentifierSchema } from "@/modules/orders/schema";
import { getAccountOrder } from "@/modules/orders/server/account-orders";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = { params: Promise<{ orderNumber: string }> };

// This GET exists for interactive browser refresh and external machine
// consumers. Account Server Components continue to call getAccountOrder
// directly rather than fetching this endpoint.
export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { orderNumber } = await context.params;
    const identifier = orderIdentifierSchema.parse(orderNumber);
    const order = await getAccountOrder(identity.customerId, identifier);
    if (!order) {
      throw new ApiError({
        code: "ORDER_NOT_FOUND",
        message: "The selected order could not be found.",
        status: 404,
      });
    }
    return { data: order, headers: privateNoStore };
  });
}

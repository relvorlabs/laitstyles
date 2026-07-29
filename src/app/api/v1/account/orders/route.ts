import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { getAccountOrders } from "@/modules/orders/server/account-orders";

const privateNoStore = { "Cache-Control": "private, no-store" };

// This GET exists for interactive browser refresh and external machine
// consumers. Account Server Components continue to call getAccountOrders
// directly rather than fetching this endpoint.
export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const orders = await getAccountOrders(identity.customerId);
    return { data: orders, headers: privateNoStore };
  });
}

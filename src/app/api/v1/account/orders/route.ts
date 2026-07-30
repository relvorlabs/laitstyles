import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { getCommerceAccountOrders } from "@/modules/orders/server/account-commerce-orders";

const privateNoStore = { "Cache-Control": "private, no-store" };

// This GET exists for interactive browser refresh and external machine
// consumers. Account Server Components use the same commerce-only boundary.
export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const orders = await getCommerceAccountOrders(identity.customerId);
    return { data: orders, headers: privateNoStore };
  });
}

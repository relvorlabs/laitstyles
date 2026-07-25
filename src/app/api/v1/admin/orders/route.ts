import { requireApiStaff } from "@/lib/http/auth";
import { parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { adminOrderListSearchSchema } from "@/modules/orders/schema";
import { listAdminOrders } from "@/modules/orders/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("orders:read");
    const input = parseSearchParams(request, adminOrderListSearchSchema);
    const result = await listAdminOrders(input);
    return {
      data: result.data,
      meta: result.meta,
      headers: privateNoStore,
    };
  });
}

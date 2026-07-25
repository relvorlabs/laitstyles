import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { listPaystackReadySaleCustomers } from "@/modules/orders/server/sale-customers";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("sales:record");
    const customers = await listPaystackReadySaleCustomers();
    return { data: customers, headers: privateNoStore };
  });
}

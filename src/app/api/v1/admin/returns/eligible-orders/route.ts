import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { returnCapabilities } from "@/modules/returns/server/policy";
import { listEligibleReturnOrders } from "@/modules/returns/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(returnCapabilities.read);
    const data = await listEligibleReturnOrders();
    return { data, headers: privateNoStore };
  });
}

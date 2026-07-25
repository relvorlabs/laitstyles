import { requireApiStaff } from "@/lib/http/auth";
import { parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { adminCustomerListSearchSchema } from "@/modules/customers/schema";
import { customerCapabilities } from "@/modules/customers/server/policy";
import { listAdminCustomers } from "@/modules/customers/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(customerCapabilities.read);
    const input = parseSearchParams(request, adminCustomerListSearchSchema);
    const result = await listAdminCustomers(input);
    return { data: result.data, meta: result.meta, headers: privateNoStore };
  });
}

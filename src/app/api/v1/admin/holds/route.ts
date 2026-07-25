import { requireApiStaff } from "@/lib/http/auth";
import { parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { adminHoldListSearchSchema } from "@/modules/holds/schema";
import { holdCapabilities } from "@/modules/holds/server/policy";
import { listAdminHolds } from "@/modules/holds/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(holdCapabilities.read);
    const input = parseSearchParams(request, adminHoldListSearchSchema);
    const result = await listAdminHolds(input);
    return { data: result.data, meta: result.meta, headers: privateNoStore };
  });
}

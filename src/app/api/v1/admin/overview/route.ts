import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { overviewCapabilities } from "@/modules/overview/server/policy";
import { getOverviewData } from "@/modules/overview/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(overviewCapabilities.read);
    const data = await getOverviewData();
    return { data, headers: privateNoStore };
  });
}

import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { overviewCapabilities } from "@/modules/overview/server/policy";
import { getOverviewData } from "@/modules/overview/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  // #region debug-point A:api-route-entry
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "overview-loader-stuck", runId: "pre-fix", hypothesisId: "A", location: "src/app/api/v1/admin/overview/route.ts:GET", msg: "[DEBUG] Overview API route entered", data: { method: request.method }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  return handleApiRequest(request, async () => {
    await requireApiStaff(overviewCapabilities.read);
    // #region debug-point C:api-authorization-complete
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "overview-loader-stuck", runId: "pre-fix", hypothesisId: "C", location: "src/app/api/v1/admin/overview/route.ts:requireApiStaff", msg: "[DEBUG] Overview API authorization completed", data: { capability: overviewCapabilities.read }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const data = await getOverviewData();
    // #region debug-point A,E:overview-data-complete
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "overview-loader-stuck", runId: "pre-fix", hypothesisId: "A,E", location: "src/app/api/v1/admin/overview/route.ts:getOverviewData", msg: "[DEBUG] Overview data query completed", data: { hasData: Boolean(data) }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return { data, headers: privateNoStore };
  });
}

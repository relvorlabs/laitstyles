import { apiRequest } from "@/lib/http/client";
import type { OverviewData } from "@/modules/overview/types";

const OVERVIEW_URL = "/api/v1/admin/overview";

export async function getOverviewRequest(signal?: AbortSignal) {
  // #region debug-point A:browser-request-start
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "overview-loader-stuck", runId: "pre-fix", hypothesisId: "A", location: "src/modules/overview/client/api.ts:getOverviewRequest:start", msg: "[DEBUG] Overview browser request started", data: { url: OVERVIEW_URL, signalAborted: signal?.aborted ?? false }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  try {
    const response = await apiRequest<OverviewData>(OVERVIEW_URL, {
      cache: "no-store",
      signal,
    });
    // #region debug-point A,B:browser-request-terminal
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "overview-loader-stuck", runId: "pre-fix", hypothesisId: "A,B", location: "src/modules/overview/client/api.ts:getOverviewRequest:success", msg: "[DEBUG] Overview browser request succeeded", data: { hasData: Boolean(response.data) }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return response.data;
  } catch (error) {
    // #region debug-point A,B:browser-request-terminal
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "overview-loader-stuck", runId: "pre-fix", hypothesisId: "A,B", location: "src/modules/overview/client/api.ts:getOverviewRequest:error", msg: "[DEBUG] Overview browser request failed", data: { errorName: error instanceof Error ? error.name : null, errorMessage: error instanceof Error ? error.message : String(error), signalAborted: signal?.aborted ?? false }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw error;
  }
}

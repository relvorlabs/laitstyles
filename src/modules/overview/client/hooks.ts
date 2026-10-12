"use client";

import { queryOptions } from "@tanstack/react-query";
import { getOverviewRequest } from "@/modules/overview/client/api";
import { overviewKeys } from "@/modules/overview/client/keys";

export function adminOverviewQueryOptions() {
  return queryOptions({
    queryKey: overviewKeys.detail(),
    queryFn: ({ signal }) => {
      // #region debug-point C,D:query-function-entry
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "overview-loader-stuck", runId: "pre-fix", hypothesisId: "C,D", location: "src/modules/overview/client/hooks.ts:queryFn", msg: "[DEBUG] Overview query function entered", data: { queryKey: overviewKeys.detail(), signalAborted: signal.aborted }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      return getOverviewRequest(signal);
    },
    staleTime: 15_000,
  });
}

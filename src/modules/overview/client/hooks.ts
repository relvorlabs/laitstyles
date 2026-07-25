"use client";

import { queryOptions } from "@tanstack/react-query";
import { getOverviewRequest } from "@/modules/overview/client/api";
import { overviewKeys } from "@/modules/overview/client/keys";

export function adminOverviewQueryOptions() {
  return queryOptions({
    queryKey: overviewKeys.detail(),
    queryFn: ({ signal }) => getOverviewRequest(signal),
    staleTime: 15_000,
  });
}

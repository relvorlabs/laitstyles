import { apiRequest } from "@/lib/http/client";
import type { OverviewData } from "@/modules/overview/types";

const OVERVIEW_URL = "/api/v1/admin/overview";

export async function getOverviewRequest(signal?: AbortSignal) {
  const response = await apiRequest<OverviewData>(OVERVIEW_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

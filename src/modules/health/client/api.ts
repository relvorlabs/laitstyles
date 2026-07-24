import { apiRequest } from "@/lib/http/client";
import { type HealthMeta, type HealthStatus, healthStatusSchema } from "@/modules/health/schema";

export async function fetchHealthStatus(signal?: AbortSignal): Promise<HealthStatus> {
  const response = await apiRequest<HealthStatus, HealthMeta>("/api/v1/health", {
    cache: "no-store",
    signal,
  });

  return healthStatusSchema.parse(response.data);
}

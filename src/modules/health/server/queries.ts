import "server-only";

import type { HealthStatus } from "@/modules/health/schema";

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "laitstyles",
    timestamp: new Date().toISOString(),
  };
}

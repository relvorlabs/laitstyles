import { handleApiRequest } from "@/lib/http/server";
import type { HealthMeta } from "@/modules/health/schema";
import { getHealthStatus } from "@/modules/health/server/queries";

export async function GET() {
  return handleApiRequest(async () => ({
    data: getHealthStatus(),
    meta: { version: "v1" } satisfies HealthMeta,
    headers: { "Cache-Control": "no-store" },
  }));
}

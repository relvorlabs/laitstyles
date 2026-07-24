import { describe, expect, it } from "vitest";
import { healthStatusSchema } from "@/modules/health/schema";
import { GET } from "./route";

describe("GET /api/v1/health", () => {
  it("returns the versioned success envelope", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.meta).toEqual({ version: "v1" });
    expect(healthStatusSchema.parse(payload.data)).toMatchObject({
      status: "ok",
      service: "laitstyles",
    });
  });
});

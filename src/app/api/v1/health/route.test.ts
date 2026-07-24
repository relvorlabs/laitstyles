import { describe, expect, it } from "vitest";
import { healthStatusSchema } from "@/modules/health/schema";
import { GET } from "./route";

describe("GET /api/v1/health", () => {
  it("returns the versioned success envelope with request correlation", async () => {
    const response = await GET(
      new Request("http://localhost/api/v1/health", {
        headers: { "x-request-id": "health-contract-test" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("health-contract-test");
    expect(payload.meta).toEqual({ version: "v1" });
    expect(healthStatusSchema.parse(payload.data)).toMatchObject({
      status: "ok",
      service: "laitstyles",
    });
  });
});

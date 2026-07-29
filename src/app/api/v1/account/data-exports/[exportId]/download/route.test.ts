import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountLifecycleError } from "@/modules/account-lifecycle/types";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  streamAccountExport: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/account-lifecycle/server/exports", () => ({
  streamAccountExport: mocks.streamAccountExport,
}));

import { GET } from "./route";

const consumer = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "amara@example.com",
  displayName: "Amara",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};
const exportId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
});

describe("GET /api/v1/account/data-exports/[exportId]/download", () => {
  it("returns a safe gone response for an expired export", async () => {
    mocks.streamAccountExport.mockRejectedValue(
      new AccountLifecycleError("EXPORT_EXPIRED", "This export has expired."),
    );

    const response = await GET(
      new Request(`http://localhost/api/v1/account/data-exports/${exportId}/download`, {
        headers: { "x-request-id": "request-export" },
      }),
      { params: Promise.resolve({ exportId }) },
    );

    expect(response.status).toBe(410);
    expect(response.headers.get("x-request-id")).toBe("request-export");
    await expect(response.json()).resolves.toMatchObject({ error: { code: "EXPORT_EXPIRED" } });
  });
});

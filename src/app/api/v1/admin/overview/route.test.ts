import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  getOverviewData: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/overview/server/queries", () => ({
  getOverviewData: mocks.getOverviewData,
}));

import { GET } from "./route";

const overview = {
  reportingDate: "2026-07-25",
  asOf: "2026-07-25T12:00:00.000Z",
  salesPulse: [],
  openOrders: [],
  snapshot: {
    revenue: { total: 0, online: 0, offline: 0 },
    ordersToday: 0,
    unitsSoldToday: 0,
    activeHolds: 0,
    attention: [],
    fulfilment: [],
    lowStockProducts: [],
    lowStockCount: 0,
    unpublishedProducts: [],
    unpublishedCount: 0,
    recentActivities: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue({
    kind: "staff",
    authUserId: "11111111-1111-4111-8111-111111111111",
    role: "admin",
  });
  mocks.getOverviewData.mockResolvedValue(overview);
});

describe("GET /api/v1/admin/overview", () => {
  it("requires the existing admin access capability before querying projections", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
    );

    const response = await GET(new Request("http://localhost/api/v1/admin/overview"));

    expect(response.status).toBe(401);
    expect(mocks.getOverviewData).not.toHaveBeenCalled();
  });

  it("returns one private persisted operational projection", async () => {
    const response = await GET(new Request("http://localhost/api/v1/admin/overview"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("admin:access");
    expect(mocks.getOverviewData).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ data: overview });
  });
});

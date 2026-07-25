import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  listAdminHolds: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/holds/server/queries", () => ({
  listAdminHolds: mocks.listAdminHolds,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue({
    kind: "staff",
    authUserId: "11111111-1111-4111-8111-111111111111",
    role: "admin",
  });
  mocks.listAdminHolds.mockResolvedValue({
    data: [],
    meta: {
      page: 2,
      pageSize: 10,
      total: 0,
      pageCount: 0,
      counts: { all: 0, active: 0, expiring: 0, "payment-risk": 0, expired: 0 },
      summary: {
        totalHolds: 0,
        activeHolds: 0,
        expiringHolds: 0,
        paymentRisk: 0,
        expiredHolds: 0,
        reservedUnits: 0,
      },
    },
  });
});

describe("GET /api/v1/admin/holds", () => {
  it("requires holds:read before querying persisted records", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Authentication required.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/admin/holds"));

    expect(response.status).toBe(401);
    expect(mocks.listAdminHolds).not.toHaveBeenCalled();
  });

  it("parses all result-affecting URL values and returns pagination metadata", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/v1/admin/holds?view=expiring&search=amara&source=storefront&stage=cart&sort=quantity-desc&page=2&pageSize=10",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("holds:read");
    expect(mocks.listAdminHolds).toHaveBeenCalledWith({
      view: "expiring",
      search: "amara",
      source: "storefront",
      stage: "cart",
      sort: "quantity-desc",
      page: 2,
      pageSize: 10,
    });
    await expect(response.json()).resolves.toMatchObject({
      data: [],
      meta: { page: 2, pageSize: 10, total: 0, pageCount: 0 },
    });
  });
});

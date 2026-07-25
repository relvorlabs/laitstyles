import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  listAdminCustomers: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/customers/server/queries", () => ({
  listAdminCustomers: mocks.listAdminCustomers,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue({
    kind: "staff",
    authUserId: "11111111-1111-4111-8111-111111111111",
    role: "admin",
  });
  mocks.listAdminCustomers.mockResolvedValue({
    data: [],
    meta: {
      page: 3,
      pageSize: 10,
      total: 0,
      pageCount: 0,
      counts: {
        all: 0,
        "needs-attention": 0,
        returning: 0,
        "high-value": 0,
        new: 0,
      },
      summary: {
        totalCustomers: 0,
        relationshipValue: 0,
        needsAttention: 0,
        returningCustomers: 0,
        activeHolds: 0,
      },
    },
  });
});

describe("GET /api/v1/admin/customers", () => {
  it("requires customers:read before querying persisted profiles", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
    );

    const response = await GET(new Request("http://localhost/api/v1/admin/customers"));

    expect(response.status).toBe(401);
    expect(mocks.listAdminCustomers).not.toHaveBeenCalled();
  });

  it("parses segmentation, search, sorting and pagination before querying", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/v1/admin/customers?view=high-value&search=lagos&type=stylist&sort=recent-desc&page=3&pageSize=10",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("customers:read");
    expect(mocks.listAdminCustomers).toHaveBeenCalledWith({
      view: "high-value",
      search: "lagos",
      type: "stylist",
      sort: "recent-desc",
      page: 3,
      pageSize: 10,
    });
    await expect(response.json()).resolves.toMatchObject({
      data: [],
      meta: { page: 3, pageSize: 10, total: 0, pageCount: 0 },
    });
  });
});

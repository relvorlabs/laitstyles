import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  listAdminReturns: vi.fn(),
  createReturn: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/returns/server/queries", () => ({
  listAdminReturns: mocks.listAdminReturns,
}));
vi.mock("@/modules/returns/server/commands", () => ({ createReturn: mocks.createReturn }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue({
    kind: "staff",
    authUserId: "11111111-1111-4111-8111-111111111111",
    role: "admin",
  });
  mocks.listAdminReturns.mockResolvedValue({
    data: [],
    meta: {
      page: 2,
      pageSize: 10,
      total: 0,
      pageCount: 0,
      counts: {
        all: 0,
        open: 0,
        "awaiting-item": 0,
        inspection: 0,
        refund: 0,
        resolved: 0,
      },
      summary: {
        totalReturns: 0,
        openReturns: 0,
        awaitingItem: 0,
        inspecting: 0,
        refundValue: 0,
      },
    },
  });
});

describe("GET /api/v1/admin/returns", () => {
  it("requires returns:read before querying persisted records", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
        status: 401,
      }),
    );

    const response = await GET(new Request("http://localhost/api/v1/admin/returns"));

    expect(response.status).toBe(401);
    expect(mocks.listAdminReturns).not.toHaveBeenCalled();
  });

  it("parses every result-affecting URL value and returns pagination metadata", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/v1/admin/returns?view=inspection&search=amara&status=received&sort=value-desc&page=2&pageSize=10",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("returns:read");
    expect(mocks.listAdminReturns).toHaveBeenCalledWith({
      view: "inspection",
      search: "amara",
      status: "received",
      sort: "value-desc",
      page: 2,
      pageSize: 10,
    });
    await expect(response.json()).resolves.toMatchObject({
      data: [],
      meta: { page: 2, pageSize: 10, total: 0, pageCount: 0 },
    });
  });
});

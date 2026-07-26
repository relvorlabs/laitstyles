import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  findInventoryProductPage: vi.fn(),
  getAdminProductsByIds: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/inventory/server/product-page", () => ({
  findInventoryProductPage: mocks.findInventoryProductPage,
}));
vi.mock("@/modules/products/server/queries", () => ({
  getAdminProductsByIds: mocks.getAdminProductsByIds,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue({
    kind: "staff",
    authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
    email: "admin@example.com",
    displayName: "Admin",
    role: "admin",
  });
});

describe("/api/v1/admin/inventory", () => {
  it("returns the standard authorization error envelope", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({ code: "AUTH_REQUIRED", message: "Authentication required.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/admin/inventory"));

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED", message: "Authentication required." },
    });
    expect(mocks.findInventoryProductPage).not.toHaveBeenCalled();
  });

  it("validates every inventory query value before reading the database", async () => {
    const page = {
      productIds: ["product-2", "product-1"],
      pagination: { page: 2, pageSize: 25, total: 27, pageCount: 2 },
      summary: {
        totalProducts: 40,
        liveProducts: 20,
        availableUnits: 100,
        reservedUnits: 5,
        soldUnits: 80,
        lowStockProducts: 4,
        outOfStockProducts: 3,
        intakeProducts: 2,
      },
      viewCounts: {
        all: 40,
        live: 20,
        drafts: 4,
        intake: 2,
        "low-stock": 4,
        "out-of-stock": 3,
        held: 5,
        sold: 12,
        unpublished: 9,
        "needs-attention": 13,
      },
    };
    mocks.findInventoryProductPage.mockResolvedValueOnce(page);
    mocks.getAdminProductsByIds.mockResolvedValueOnce([{ id: "product-2" }, { id: "product-1" }]);

    const response = await GET(
      new Request(
        "http://localhost/api/v1/admin/inventory?view=needs-attention&q=blue%20denim&mode=variant&stock=low-stock&category=Jeans&collection=Weekend&channel=physical-store&sort=stock-asc&page=2&pageSize=25",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:read");
    expect(mocks.findInventoryProductPage).toHaveBeenCalledWith({
      view: "needs-attention",
      q: "blue denim",
      mode: "variant",
      stock: "low-stock",
      category: "Jeans",
      collection: "Weekend",
      channel: "physical-store",
      sort: "stock-asc",
      page: 2,
      pageSize: 25,
    });
    expect(mocks.getAdminProductsByIds).toHaveBeenCalledWith(page.productIds);
    await expect(response.json()).resolves.toEqual({
      data: [{ id: "product-2" }, { id: "product-1" }],
      meta: {
        ...page.pagination,
        summary: page.summary,
        viewCounts: page.viewCounts,
      },
    });
  });

  it("rejects an unsupported page size before any domain query", async () => {
    const response = await GET(new Request("http://localhost/api/v1/admin/inventory?pageSize=500"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_QUERY", fieldErrors: { pageSize: expect.any(String) } },
    });
    expect(mocks.findInventoryProductPage).not.toHaveBeenCalled();
  });
});

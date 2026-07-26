import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  listAdminProducts: vi.fn(),
  saveProduct: vi.fn(),
  invalidateProductCatalogue: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/products/server/queries", () => ({
  listAdminProducts: mocks.listAdminProducts,
}));
vi.mock("@/modules/products/server/commands", () => ({ saveProduct: mocks.saveProduct }));
vi.mock("@/modules/products/server/cache", () => ({
  invalidateProductCatalogue: mocks.invalidateProductCatalogue,
}));

import { GET, POST } from "./route";

const staff = {
  kind: "staff" as const,
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue(staff);
});

describe("/api/v1/admin/products", () => {
  it("returns the standard authorization error envelope", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({ code: "AUTH_REQUIRED", message: "Authentication required.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/admin/products"));

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED", message: "Authentication required." },
    });
    expect(mocks.listAdminProducts).not.toHaveBeenCalled();
  });

  it("parses pagination and returns the paginated success envelope", async () => {
    mocks.listAdminProducts.mockResolvedValueOnce({
      data: [{ id: "product-1" }],
      meta: { page: 2, pageSize: 25, total: 26, pageCount: 2 },
    });

    const response = await GET(
      new Request("http://localhost/api/v1/admin/products?page=2&pageSize=25"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:read");
    expect(mocks.listAdminProducts).toHaveBeenCalledWith({ page: 2, pageSize: 25 });
    await expect(response.json()).resolves.toEqual({
      data: [{ id: "product-1" }],
      meta: { page: 2, pageSize: 25, total: 26, pageCount: 2 },
    });
  });

  it("rejects a create request that includes an existing product id", async () => {
    const values = createEmptyProductEditorValues("stocked");
    values.productId = "019f65c1-74fe-7bd3-8400-000000000001";

    const response = await POST(
      new Request("http://localhost/api/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values, intent: "draft" }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "PRODUCT_ID_NOT_ALLOWED",
        fieldErrors: { productId: expect.any(String) },
      },
    });
    expect(mocks.saveProduct).not.toHaveBeenCalled();
  });

  it("creates through the domain command and invalidates both product slugs", async () => {
    const values = createEmptyProductEditorValues("stocked");
    mocks.saveProduct.mockResolvedValueOnce({
      ok: true,
      value: {
        product: { id: "product-1", slug: "new-product", name: "New product" },
        previousSlug: null,
        intent: "draft",
        message: "Saved.",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values, intent: "draft" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:create");
    expect(mocks.saveProduct).toHaveBeenCalledWith(staff, values, "draft");
    expect(mocks.invalidateProductCatalogue).toHaveBeenCalledWith([null, "new-product"]);
    await expect(response.json()).resolves.toMatchObject({
      data: { product: { id: "product-1", slug: "new-product" }, intent: "draft" },
    });
  });
});

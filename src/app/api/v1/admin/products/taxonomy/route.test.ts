import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  listProductTaxonomy: vi.fn(),
  createProductTaxonomy: vi.fn(),
  invalidateProductCatalogue: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/products/server/queries", () => ({
  listProductTaxonomy: mocks.listProductTaxonomy,
}));
vi.mock("@/modules/products/server/commands", () => ({
  createProductTaxonomy: mocks.createProductTaxonomy,
}));
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

describe("/api/v1/admin/products/taxonomy", () => {
  it("enforces taxonomy read capability and returns the private standard envelope", async () => {
    mocks.listProductTaxonomy.mockResolvedValueOnce([{ id: "category:one", name: "Jeans" }]);

    const response = await GET(new Request("http://localhost/api/v1/admin/products/taxonomy"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:read");
    await expect(response.json()).resolves.toEqual({
      data: [{ id: "category:one", name: "Jeans" }],
    });
  });

  it("returns the standard authorization error envelope", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({ code: "AUTH_REQUIRED", message: "Authentication required.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/admin/products/taxonomy"));

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED", message: "Authentication required." },
    });
    expect(mocks.listProductTaxonomy).not.toHaveBeenCalled();
  });

  it("validates create input before invoking the domain command", async () => {
    const response = await POST(jsonRequest("http://localhost/api/v1/admin/products/taxonomy", {}));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(mocks.createProductTaxonomy).not.toHaveBeenCalled();
  });

  it("creates through the domain command and invalidates storefront catalogue tags", async () => {
    mocks.createProductTaxonomy.mockResolvedValueOnce({
      ok: true,
      value: {
        item: { id: "category:one", kind: "category", name: "Jeans" },
        message: "Created.",
        affectedProductSlugs: [],
      },
    });

    const response = await POST(
      jsonRequest("http://localhost/api/v1/admin/products/taxonomy", {
        kind: "category",
        name: "Jeans",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:update");
    expect(mocks.createProductTaxonomy).toHaveBeenCalledWith(staff, {
      kind: "category",
      name: "Jeans",
    });
    expect(mocks.invalidateProductCatalogue).toHaveBeenCalledWith([]);
    await expect(response.json()).resolves.toEqual({
      data: {
        item: { id: "category:one", kind: "category", name: "Jeans" },
        message: "Created.",
      },
    });
  });
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

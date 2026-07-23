import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStaffAccess: vi.fn(),
  listInventoryProducts: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({ getStaffAccess: mocks.getStaffAccess }));
vi.mock("@/server/commerce/inventory/inventory-read", () => ({
  listInventoryProducts: mocks.listInventoryProducts,
}));

import { GET } from "./route";

describe("GET /api/admin/inventory/products", () => {
  it("returns 401 for an anonymous caller", async () => {
    mocks.getStaffAccess.mockResolvedValueOnce({ ok: false, reason: "signed-out" });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.listInventoryProducts).not.toHaveBeenCalled();
  });

  it("returns 403 when inventory read access is denied", async () => {
    mocks.getStaffAccess.mockResolvedValueOnce({ ok: false, reason: "missing-capability" });
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("returns private no-store data for an authorized staff caller", async () => {
    mocks.getStaffAccess.mockResolvedValueOnce({ ok: true, role: "admin" });
    mocks.listInventoryProducts.mockResolvedValueOnce([{ id: "product-1" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual([{ id: "product-1" }]);
  });
});

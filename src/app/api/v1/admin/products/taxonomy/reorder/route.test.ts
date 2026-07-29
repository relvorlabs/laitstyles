import { beforeEach, describe, expect, it, vi } from "vitest";

const CATEGORY_ID = "category:019f65c1-74fe-7bd3-8400-000000000011";
const SECOND_CATEGORY_ID = "category:019f65c1-74fe-7bd3-8400-000000000012";
const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  reorderProductTaxonomy: vi.fn(),
  invalidateProductCatalogue: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/products/server/taxonomy-commands", () => ({
  reorderProductTaxonomy: mocks.reorderProductTaxonomy,
}));
vi.mock("@/modules/products/server/cache", () => ({
  invalidateProductCatalogue: mocks.invalidateProductCatalogue,
}));

import { POST } from "./route";

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

describe("POST /api/v1/admin/products/taxonomy/reorder", () => {
  it("validates duplicate and mixed-kind public ids before invoking the domain command", async () => {
    const response = await POST(
      jsonRequest({ kind: "category", orderedIds: [CATEGORY_ID, CATEGORY_ID] }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(mocks.reorderProductTaxonomy).not.toHaveBeenCalled();
  });

  it("requires update capability, reorders, and invalidates the storefront catalogue", async () => {
    const input = { kind: "category" as const, orderedIds: [SECOND_CATEGORY_ID, CATEGORY_ID] };
    mocks.reorderProductTaxonomy.mockResolvedValueOnce({
      ok: true,
      value: { message: "Order updated.", affectedProductSlugs: [] },
    });

    const response = await POST(jsonRequest(input));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:update");
    expect(mocks.reorderProductTaxonomy).toHaveBeenCalledWith(staff, input);
    expect(mocks.invalidateProductCatalogue).toHaveBeenCalledWith([]);
    await expect(response.json()).resolves.toEqual({ data: { message: "Order updated." } });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/admin/products/taxonomy/reorder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

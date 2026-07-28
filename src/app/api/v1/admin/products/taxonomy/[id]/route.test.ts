import { beforeEach, describe, expect, it, vi } from "vitest";

const TAXONOMY_ID = "category:019f65c1-74fe-7bd3-8400-000000000011";
const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  updateProductTaxonomy: vi.fn(),
  renameProductTaxonomy: vi.fn(),
  deleteProductTaxonomy: vi.fn(),
  invalidateProductCatalogue: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/products/server/commands", () => ({
  deleteProductTaxonomy: mocks.deleteProductTaxonomy,
  renameProductTaxonomy: mocks.renameProductTaxonomy,
}));
vi.mock("@/modules/products/server/taxonomy-commands", () => ({
  updateProductTaxonomy: mocks.updateProductTaxonomy,
}));
vi.mock("@/modules/products/server/cache", () => ({
  invalidateProductCatalogue: mocks.invalidateProductCatalogue,
}));

import { DELETE, PATCH } from "./route";

const staff = {
  kind: "staff" as const,
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin" as const,
};
const context = { params: Promise.resolve({ id: TAXONOMY_ID }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue(staff);
});

describe("/api/v1/admin/products/taxonomy/:id", () => {
  it("validates richer PATCH input before invoking the domain command", async () => {
    const response = await PATCH(jsonRequest({ kind: "category", name: "Jeans" }), context);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(mocks.updateProductTaxonomy).not.toHaveBeenCalled();
  });

  it("updates through the domain command and invalidates every affected product slug", async () => {
    const input = {
      kind: "category" as const,
      name: "Denim",
      imageUrl: "https://res.cloudinary.com/store/image/upload/category.jpg",
      position: 2,
    };
    mocks.updateProductTaxonomy.mockResolvedValueOnce({
      ok: true,
      value: {
        item: { id: TAXONOMY_ID, ...input },
        message: "Updated.",
        affectedProductSlugs: ["indigo-jeans", "wide-leg-jeans"],
      },
    });

    const response = await PATCH(jsonRequest(input), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:update");
    expect(mocks.updateProductTaxonomy).toHaveBeenCalledWith(staff, TAXONOMY_ID, input);
    expect(mocks.invalidateProductCatalogue).toHaveBeenCalledWith([
      "indigo-jeans",
      "wide-leg-jeans",
    ]);
    await expect(response.json()).resolves.toEqual({
      data: { item: { id: TAXONOMY_ID, ...input }, message: "Updated." },
    });
  });

  it("preserves the existing name-only rename transport", async () => {
    mocks.renameProductTaxonomy.mockResolvedValueOnce({
      ok: true,
      value: {
        item: { id: TAXONOMY_ID, name: "Denim" },
        message: "Renamed.",
        affectedProductSlugs: ["indigo-jeans"],
      },
    });

    const response = await PATCH(jsonRequest({ name: "Denim" }), context);

    expect(response.status).toBe(200);
    expect(mocks.renameProductTaxonomy).toHaveBeenCalledWith(staff, TAXONOMY_ID, "Denim");
    expect(mocks.invalidateProductCatalogue).toHaveBeenCalledWith(["indigo-jeans"]);
  });

  it("rejects an invalid public taxonomy id before invoking a command", async () => {
    const response = await PATCH(jsonRequest({ name: "Denim" }), {
      params: Promise.resolve({ id: "category:not-a-uuid" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.updateProductTaxonomy).not.toHaveBeenCalled();
    expect(mocks.renameProductTaxonomy).not.toHaveBeenCalled();
  });

  it("deletes through the domain command and invalidates storefront catalogue tags", async () => {
    mocks.deleteProductTaxonomy.mockResolvedValueOnce({
      ok: true,
      value: { deletedId: TAXONOMY_ID, message: "Deleted.", affectedProductSlugs: [] },
    });

    const response = await DELETE(
      new Request(`http://localhost/api/v1/admin/products/taxonomy/${TAXONOMY_ID}`, {
        method: "DELETE",
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:update");
    expect(mocks.deleteProductTaxonomy).toHaveBeenCalledWith(staff, TAXONOMY_ID);
    expect(mocks.invalidateProductCatalogue).toHaveBeenCalledWith([]);
  });
});

function jsonRequest(body: unknown) {
  return new Request(`http://localhost/api/v1/admin/products/taxonomy/${TAXONOMY_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

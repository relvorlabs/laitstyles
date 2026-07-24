import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  getCurrentSession: vi.fn(),
  saveInventoryProduct: vi.fn(),
  archiveInventoryProduct: vi.fn(),
  createInventoryTaxonomy: vi.fn(),
  renameInventoryTaxonomy: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/server/auth/session", () => ({
  getCurrentSession: mocks.getCurrentSession,
}));
vi.mock("@/server/commerce/inventory/inventory-service", () => ({
  saveInventoryProduct: mocks.saveInventoryProduct,
  archiveInventoryProduct: mocks.archiveInventoryProduct,
  restoreInventoryProduct: vi.fn(),
  deleteInventoryProduct: vi.fn(),
  createInventoryTaxonomy: mocks.createInventoryTaxonomy,
  renameInventoryTaxonomy: mocks.renameInventoryTaxonomy,
  deleteInventoryTaxonomy: vi.fn(),
}));

import {
  archiveProductAction,
  createCatalogueTaxonomyAction,
  renameCatalogueTaxonomyAction,
  saveProductAction,
} from "./inventory-actions";

const productId = "123e4567-e89b-42d3-a456-426614174000";
const taxonomyId = "category:123e4567-e89b-42d3-a456-426614174000";
const staff = {
  kind: "staff" as const,
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  role: "admin" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentSession.mockResolvedValue(staff);
});

describe("inventory actions", () => {
  it("denies a non-staff caller without invoking the domain service", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({ kind: "anonymous" });
    const result = await saveProductAction(createEmptyProductEditorValues("stocked"), "draft");
    expect(result.ok).toBe(false);
    expect(mocks.saveInventoryProduct).not.toHaveBeenCalled();
  });

  it("does not disguise session infrastructure failures as permission errors", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({
      kind: "unavailable",
      error: "Database offline",
    });

    await expect(archiveProductAction(productId)).rejects.toThrow("Database offline");
    expect(mocks.archiveInventoryProduct).not.toHaveBeenCalled();
  });

  it("rejects malformed product inputs before the domain service", async () => {
    await expect(archiveProductAction("product-1")).resolves.toEqual({
      ok: false,
      error: {
        code: "product-not-found",
        productId: "product-1",
        message: "The selected product could not be found.",
      },
    });
    expect(mocks.archiveInventoryProduct).not.toHaveBeenCalled();

    await expect(
      saveProductAction({ inventoryMode: "stocked" }, "delete"),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "validation-failed",
        message: "Review the highlighted product fields and try again.",
      },
    });
    expect(mocks.saveInventoryProduct).not.toHaveBeenCalled();
  });

  it("invalidates both old and new product cache tags after save", async () => {
    mocks.saveInventoryProduct.mockResolvedValueOnce({
      ok: true,
      value: {
        product: { id: productId, slug: "new-slug" },
        previousSlug: "old-slug",
        intent: "draft",
        message: "Saved.",
      },
    });
    const result = await saveProductAction(createEmptyProductEditorValues("stocked"), "draft");
    expect(result.ok).toBe(true);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("catalogue", "max");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("product-old-slug", "max");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("product-new-slug", "max");
  });

  it("invalidates the product tag after a lifecycle mutation", async () => {
    mocks.archiveInventoryProduct.mockResolvedValueOnce({
      ok: true,
      value: {
        productId,
        slug: "test-product",
        deleted: false,
        message: "Archived.",
      },
    });
    const result = await archiveProductAction(productId);
    expect(result.ok).toBe(true);
    expect(mocks.archiveInventoryProduct).toHaveBeenCalledWith(staff, productId);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("product-test-product", "max");
  });

  it("normalizes taxonomy input and invalidates catalogue data", async () => {
    mocks.createInventoryTaxonomy.mockResolvedValueOnce({
      ok: true,
      value: {
        item: { id: taxonomyId, kind: "category", name: "Tops", slug: "tops" },
        message: "Created.",
        affectedProductSlugs: [],
      },
    });
    const result = await createCatalogueTaxonomyAction({ kind: "category", name: "  Tops  " });
    expect(result.ok).toBe(true);
    expect(mocks.createInventoryTaxonomy).toHaveBeenCalledWith(staff, {
      kind: "category",
      name: "Tops",
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("catalogue", "max");
  });

  it("returns typed taxonomy failures for malformed identifiers", async () => {
    await expect(
      renameCatalogueTaxonomyAction("category:not-a-uuid", "Archive"),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "taxonomy-not-found",
        taxonomyId: "category:not-a-uuid",
        message: "The selected catalogue group could not be found.",
      },
    });
    expect(mocks.renameInventoryTaxonomy).not.toHaveBeenCalled();
  });
});

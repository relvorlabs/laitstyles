import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  getCurrentSession: vi.fn(),
  saveInventoryProduct: vi.fn(),
  archiveInventoryProduct: vi.fn(),
  createInventoryTaxonomy: vi.fn(),
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
  renameInventoryTaxonomy: vi.fn(),
  deleteInventoryTaxonomy: vi.fn(),
}));

import {
  archiveProductAction,
  createCatalogueTaxonomyAction,
  saveProductAction,
} from "./inventory-actions";

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

  it("invalidates both old and new product cache tags after save", async () => {
    mocks.saveInventoryProduct.mockResolvedValueOnce({
      ok: true,
      value: {
        product: { id: "product-1", slug: "new-slug" },
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
        productId: "product-1",
        slug: "test-product",
        deleted: false,
        message: "Archived.",
      },
    });
    const result = await archiveProductAction("product-1");
    expect(result.ok).toBe(true);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("product-test-product", "max");
  });

  it("invalidates catalogue data after taxonomy mutation", async () => {
    mocks.createInventoryTaxonomy.mockResolvedValueOnce({
      ok: true,
      value: {
        item: { id: "category:1", kind: "category", name: "Tops", slug: "tops" },
        message: "Created.",
        affectedProductSlugs: [],
      },
    });
    const result = await createCatalogueTaxonomyAction({ kind: "category", name: "Tops" });
    expect(result.ok).toBe(true);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("catalogue", "max");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffSession } from "@/modules/auth/server/session";

const CATEGORY_ID = "019f65c1-74fe-7bd3-8400-000000000011";
const COLLECTION_ID = "019f65c1-74fe-7bd3-8400-000000000012";
const OTHER_COLLECTION_ID = "019f65c1-74fe-7bd3-8400-000000000013";
const PRODUCT_ONE_ID = "019f65c1-74fe-7bd3-8400-000000000021";
const PRODUCT_TWO_ID = "019f65c1-74fe-7bd3-8400-000000000022";

const harness = vi.hoisted(() => {
  const tx = {
    catalogue_categories: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    catalogue_collections: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    products: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    audit_events: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    tx,
    prisma,
    Prisma: {
      TransactionIsolationLevel: { Serializable: "Serializable" },
      PrismaClientKnownRequestError,
    },
    canManageProduct: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ Prisma: harness.Prisma, prisma: harness.prisma }));
vi.mock("@/modules/products/server/rules", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/products/server/rules")>()),
  canManageProduct: harness.canManageProduct,
}));

import {
  createProductTaxonomy,
  deleteProductTaxonomy,
  reorderProductTaxonomy,
  updateProductTaxonomy,
} from "@/modules/products/server/taxonomy-commands";

const admin: StaffSession = {
  kind: "staff",
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",
};

const viewer: StaffSession = { ...admin, role: "viewer" };
const now = new Date("2026-01-01T00:00:00.000Z");

function categoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CATEGORY_ID,
    name: "Jeans",
    slug: "jeans",
    image_url: null,
    position: 0,
    created_at: now,
    updated_at: now,
    _count: { products: 0 },
    ...overrides,
  };
}

function collectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: COLLECTION_ID,
    name: "New season",
    slug: "new-season",
    position: 0,
    created_at: now,
    updated_at: now,
    _count: { products: 0 },
    products: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  harness.canManageProduct.mockReturnValue(true);
  harness.tx.catalogue_categories.create.mockResolvedValue(categoryRow());
  harness.tx.catalogue_categories.update.mockResolvedValue(categoryRow());
  harness.tx.catalogue_collections.update.mockResolvedValue(collectionRow());
  harness.tx.audit_events.create.mockResolvedValue({});
  harness.tx.products.count.mockResolvedValue(0);
  harness.tx.products.findMany.mockResolvedValue([]);
  harness.tx.products.updateMany.mockResolvedValue({ count: 0 });
  harness.tx.catalogue_categories.findMany.mockResolvedValue([]);
  harness.tx.catalogue_collections.findMany.mockResolvedValue([]);
  harness.tx.catalogue_collections.findUnique.mockResolvedValue({ id: COLLECTION_ID });
  harness.tx.catalogue_categories.delete.mockResolvedValue({});
  harness.tx.catalogue_collections.delete.mockResolvedValue({});
});

describe("product taxonomy commands", () => {
  it("creates a category and returns an encoded public taxonomy id", async () => {
    const result = await createProductTaxonomy(admin, { kind: "category", name: " Jeans " });

    expect(result).toMatchObject({
      ok: true,
      value: {
        item: {
          id: `category:${CATEGORY_ID}`,
          kind: "category",
          name: "Jeans",
          slug: "jeans",
        },
        affectedProductSlugs: [],
      },
    });
    expect(harness.tx.audit_events.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "inventory:category:create",
        target_table: "catalogue_categories",
      }),
    });
  });

  it("maps a database uniqueness conflict to duplicate-name", async () => {
    harness.tx.catalogue_categories.create.mockRejectedValueOnce(
      new harness.Prisma.PrismaClientKnownRequestError("duplicate", "P2002"),
    );

    const result = await createProductTaxonomy(admin, { kind: "category", name: "Jeans" });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "duplicate-name",
        message: "Category “Jeans” already exists.",
      },
    });
  });

  it("updates a Category name, image and position in one serializable transaction", async () => {
    harness.tx.products.findMany.mockResolvedValueOnce([{ slug: "indigo-jeans" }]);
    harness.tx.catalogue_categories.update.mockResolvedValueOnce(
      categoryRow({
        name: "Denim",
        slug: "denim",
        image_url: "https://res.cloudinary.com/store/image/upload/category.jpg",
        position: 2,
        _count: { products: 1 },
      }),
    );

    const result = await updateProductTaxonomy(admin, `category:${CATEGORY_ID}`, {
      kind: "category",
      name: " Denim ",
      imageUrl: "https://res.cloudinary.com/store/image/upload/category.jpg",
      position: 2,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        item: {
          kind: "category",
          name: "Denim",
          slug: "denim",
          imageUrl: "https://res.cloudinary.com/store/image/upload/category.jpg",
          position: 2,
          productCount: 1,
        },
        affectedProductSlugs: ["indigo-jeans"],
      },
    });
    expect(harness.tx.catalogue_categories.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CATEGORY_ID },
        data: {
          name: "Denim",
          slug: "denim",
          image_url: "https://res.cloudinary.com/store/image/upload/category.jpg",
          position: 2,
        },
      }),
    );
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
    expect(harness.tx.audit_events.create).toHaveBeenCalledTimes(1);
  });

  it("sets Collection membership to the exact submitted product set and collects affected slugs", async () => {
    harness.tx.products.findMany
      .mockResolvedValueOnce([
        { id: PRODUCT_ONE_ID, slug: "removed-product", collection_id: COLLECTION_ID },
      ])
      .mockResolvedValueOnce([
        { id: PRODUCT_TWO_ID, slug: "moved-product", collection_id: OTHER_COLLECTION_ID },
      ]);
    harness.tx.catalogue_collections.update.mockResolvedValueOnce(
      collectionRow({
        _count: { products: 1 },
        products: [{ product_media: [] }],
      }),
    );

    const result = await updateProductTaxonomy(admin, `collection:${COLLECTION_ID}`, {
      kind: "collection",
      name: "New season",
      position: 1,
      productIds: [PRODUCT_TWO_ID],
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        affectedProductSlugs: ["removed-product", "moved-product"],
        item: { kind: "collection", productCount: 1 },
      },
    });
    expect(harness.tx.products.updateMany).toHaveBeenNthCalledWith(1, {
      where: { collection_id: COLLECTION_ID, id: { notIn: [PRODUCT_TWO_ID] } },
      data: { collection_id: null },
    });
    expect(harness.tx.products.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: [PRODUCT_TWO_ID] } },
      data: { collection_id: COLLECTION_ID },
    });
    expect(harness.tx.audit_events.create).toHaveBeenCalledTimes(1);
  });

  it("rejects Collection membership when any submitted product does not exist", async () => {
    harness.tx.products.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await updateProductTaxonomy(admin, `collection:${COLLECTION_ID}`, {
      kind: "collection",
      name: "New season",
      position: 1,
      productIds: [PRODUCT_ONE_ID],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "taxonomy-not-found" } });
    expect(harness.tx.products.updateMany).not.toHaveBeenCalled();
    expect(harness.tx.audit_events.create).not.toHaveBeenCalled();
  });

  it("rejects a missing Collection before assigning any submitted products", async () => {
    harness.tx.catalogue_collections.findUnique.mockResolvedValueOnce(null);
    harness.tx.products.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: PRODUCT_ONE_ID, slug: "selected-product", collection_id: OTHER_COLLECTION_ID },
      ]);

    const result = await updateProductTaxonomy(admin, `collection:${COLLECTION_ID}`, {
      kind: "collection",
      name: "Missing collection",
      position: 1,
      productIds: [PRODUCT_ONE_ID],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "taxonomy-not-found" } });
    expect(harness.tx.products.updateMany).not.toHaveBeenCalled();
    expect(harness.tx.audit_events.create).not.toHaveBeenCalled();
  });

  it("maps an update uniqueness conflict to duplicate-name", async () => {
    harness.tx.catalogue_categories.update.mockRejectedValueOnce(
      new harness.Prisma.PrismaClientKnownRequestError("duplicate", "P2002"),
    );

    const result = await updateProductTaxonomy(admin, `category:${CATEGORY_ID}`, {
      kind: "category",
      name: "Jeans",
      imageUrl: null,
      position: 0,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "duplicate-name" } });
  });

  it("returns not-found for a missing taxonomy update", async () => {
    harness.tx.catalogue_categories.update.mockRejectedValueOnce(
      new harness.Prisma.PrismaClientKnownRequestError("missing", "P2025"),
    );

    const result = await updateProductTaxonomy(admin, `category:${CATEGORY_ID}`, {
      kind: "category",
      name: "Jeans",
      imageUrl: null,
      position: 0,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "taxonomy-not-found" } });
  });

  it("does not open an update transaction without permission", async () => {
    harness.canManageProduct.mockReturnValueOnce(false);
    const result = await updateProductTaxonomy(viewer, `category:${CATEGORY_ID}`, {
      kind: "category",
      name: "Jeans",
      imageUrl: null,
      position: 0,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "taxonomy-not-found" } });
    expect(harness.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reorders a complete Category set atomically and audits once", async () => {
    const secondCategoryId = "019f65c1-74fe-7bd3-8400-000000000014";
    harness.tx.catalogue_categories.findMany.mockResolvedValueOnce([
      { id: CATEGORY_ID },
      { id: secondCategoryId },
    ]);

    const result = await reorderProductTaxonomy(admin, {
      kind: "category",
      orderedIds: [`category:${secondCategoryId}`, `category:${CATEGORY_ID}`],
    });

    expect(result).toMatchObject({ ok: true, value: { affectedProductSlugs: [] } });
    expect(harness.tx.catalogue_categories.update).toHaveBeenNthCalledWith(1, {
      where: { id: secondCategoryId },
      data: { position: 0 },
    });
    expect(harness.tx.catalogue_categories.update).toHaveBeenNthCalledWith(2, {
      where: { id: CATEGORY_ID },
      data: { position: 1 },
    });
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
    expect(harness.tx.audit_events.create).toHaveBeenCalledTimes(1);
  });

  it("reorders a complete Collection set through the Collection branch", async () => {
    harness.tx.catalogue_collections.findMany.mockResolvedValueOnce([
      { id: COLLECTION_ID },
      { id: OTHER_COLLECTION_ID },
    ]);

    const result = await reorderProductTaxonomy(admin, {
      kind: "collection",
      orderedIds: [`collection:${OTHER_COLLECTION_ID}`, `collection:${COLLECTION_ID}`],
    });

    expect(result).toMatchObject({ ok: true, value: { affectedProductSlugs: [] } });
    expect(harness.tx.catalogue_collections.update).toHaveBeenNthCalledWith(1, {
      where: { id: OTHER_COLLECTION_ID },
      data: { position: 0 },
    });
    expect(harness.tx.catalogue_collections.update).toHaveBeenNthCalledWith(2, {
      where: { id: COLLECTION_ID },
      data: { position: 1 },
    });
    expect(harness.tx.catalogue_categories.update).not.toHaveBeenCalled();
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
    expect(harness.tx.audit_events.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "inventory:collection:reorder",
        target_table: "catalogue_collections",
      }),
    });
  });

  it.each([
    {
      label: "a duplicate",
      orderedIds: [`category:${CATEGORY_ID}`, `category:${CATEGORY_ID}`],
    },
    {
      label: "a mixed kind",
      orderedIds: [`category:${CATEGORY_ID}`, `collection:${COLLECTION_ID}`],
    },
  ])("rejects reorder input containing $label", async ({ orderedIds }) => {
    const result = await reorderProductTaxonomy(admin, { kind: "category", orderedIds });

    expect(result).toMatchObject({ ok: false, error: { code: "taxonomy-not-found" } });
    expect(harness.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a reorder whose submitted set differs from the current set", async () => {
    harness.tx.catalogue_categories.findMany.mockResolvedValueOnce([
      { id: CATEGORY_ID },
      { id: "019f65c1-74fe-7bd3-8400-000000000014" },
    ]);

    const result = await reorderProductTaxonomy(admin, {
      kind: "category",
      orderedIds: [`category:${CATEGORY_ID}`],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "taxonomy-not-found" } });
    expect(harness.tx.catalogue_categories.update).not.toHaveBeenCalled();
    expect(harness.tx.audit_events.create).not.toHaveBeenCalled();
  });

  it("does not open a reorder transaction without permission", async () => {
    harness.canManageProduct.mockReturnValueOnce(false);
    const result = await reorderProductTaxonomy(viewer, {
      kind: "category",
      orderedIds: [`category:${CATEGORY_ID}`],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "taxonomy-not-found" } });
    expect(harness.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks deletion while products still reference the taxonomy", async () => {
    harness.tx.products.count.mockResolvedValueOnce(2);

    const result = await deleteProductTaxonomy(admin, `category:${CATEGORY_ID}`);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "taxonomy-in-use", taxonomyId: expect.any(String) },
    });
    expect(harness.tx.catalogue_categories.delete).not.toHaveBeenCalled();
  });
});

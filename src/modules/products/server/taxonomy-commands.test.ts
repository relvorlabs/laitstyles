import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffSession } from "@/server/auth/session";

const harness = vi.hoisted(() => {
  const tx = {
    catalogue_categories: { create: vi.fn(), delete: vi.fn(), update: vi.fn() },
    catalogue_collections: { create: vi.fn(), delete: vi.fn(), update: vi.fn() },
    products: { count: vi.fn(), findMany: vi.fn() },
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
  return { tx, prisma, Prisma: { PrismaClientKnownRequestError } };
});

vi.mock("@/lib/prisma", () => ({ Prisma: harness.Prisma, prisma: harness.prisma }));

import {
  createProductTaxonomy,
  deleteProductTaxonomy,
} from "@/modules/products/server/taxonomy-commands";

const admin: StaffSession = {
  kind: "staff",
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",
};

beforeEach(() => {
  vi.clearAllMocks();
  harness.tx.catalogue_categories.create.mockResolvedValue({
    id: "019f65c1-74fe-7bd3-8400-000000000011",
    name: "Jeans",
    slug: "jeans",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
  });
  harness.tx.audit_events.create.mockResolvedValue({});
  harness.tx.products.count.mockResolvedValue(0);
  harness.tx.products.findMany.mockResolvedValue([]);
  harness.tx.catalogue_categories.delete.mockResolvedValue({});
});

describe("product taxonomy commands", () => {
  it("creates a category and returns an encoded public taxonomy id", async () => {
    const result = await createProductTaxonomy(admin, { kind: "category", name: " Jeans " });

    expect(result).toMatchObject({
      ok: true,
      value: {
        item: {
          id: "category:019f65c1-74fe-7bd3-8400-000000000011",
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

  it("blocks deletion while products still reference the taxonomy", async () => {
    harness.tx.products.count.mockResolvedValueOnce(2);

    const result = await deleteProductTaxonomy(
      admin,
      "category:019f65c1-74fe-7bd3-8400-000000000011",
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "taxonomy-in-use", taxonomyId: expect.any(String) },
    });
    expect(harness.tx.catalogue_categories.delete).not.toHaveBeenCalled();
  });
});

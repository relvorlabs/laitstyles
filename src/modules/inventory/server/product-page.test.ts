import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prisma")>("@/lib/prisma");
  return {
    Prisma: actual.Prisma,
    prisma: {
      $queryRaw: harness.queryRaw,
      $transaction: harness.transaction,
    },
  };
});

import { findInventoryProductPage } from "@/modules/inventory/server/product-page";

beforeEach(() => {
  vi.clearAllMocks();
  harness.queryRaw
    .mockReturnValueOnce(Promise.resolve([{ id: "product-2" }, { id: "product-1" }]))
    .mockReturnValueOnce(Promise.resolve([{ total: 12n }]))
    .mockReturnValueOnce(
      Promise.resolve([
        {
          totalProducts: 20n,
          liveProducts: 8n,
          availableUnits: 44n,
          reservedUnits: 5n,
          soldUnits: 31n,
          lowStockProducts: 3n,
          outOfStockProducts: 2n,
          intakeProducts: 4n,
          allView: 20n,
          draftsView: 3n,
          heldView: 2n,
          soldView: 5n,
          unpublishedView: 9n,
          needsAttentionView: 11n,
        },
      ]),
    );
  harness.transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
});

describe("findInventoryProductPage", () => {
  it("returns requested product ids, pagination, summary and saved-view counts", async () => {
    const result = await findInventoryProductPage({
      view: "low-stock",
      q: "denim blue",
      mode: "variant",
      stock: "low-stock",
      category: "Jeans",
      collection: "Weekend",
      channel: "storefront",
      sort: "stock-asc",
      page: 2,
      pageSize: 10,
    });

    expect(result).toEqual({
      productIds: ["product-2", "product-1"],
      pagination: { page: 2, pageSize: 10, total: 12, pageCount: 2 },
      summary: {
        totalProducts: 20,
        liveProducts: 8,
        availableUnits: 44,
        reservedUnits: 5,
        soldUnits: 31,
        lowStockProducts: 3,
        outOfStockProducts: 2,
        intakeProducts: 4,
      },
      viewCounts: {
        all: 20,
        live: 8,
        drafts: 3,
        intake: 4,
        "low-stock": 3,
        "out-of-stock": 2,
        held: 2,
        sold: 5,
        unpublished: 9,
        "needs-attention": 11,
      },
    });
    expect(harness.transaction).toHaveBeenCalledTimes(1);
    expect(harness.queryRaw).toHaveBeenCalledTimes(3);
  });

  it("keeps the requested page metadata when the page has no rows", async () => {
    harness.queryRaw.mockReset();
    harness.queryRaw
      .mockReturnValueOnce(Promise.resolve([]))
      .mockReturnValueOnce(Promise.resolve([{ total: 0n }]))
      .mockReturnValueOnce(Promise.resolve([]));

    const result = await findInventoryProductPage({
      view: "all",
      q: "",
      mode: "all",
      stock: "all",
      category: "all",
      collection: "all",
      channel: "all",
      sort: "updated-desc",
      page: 4,
      pageSize: 25,
    });

    expect(result.productIds).toEqual([]);
    expect(result.pagination).toEqual({ page: 4, pageSize: 25, total: 0, pageCount: 0 });
    expect(result.summary.totalProducts).toBe(0);
  });
});

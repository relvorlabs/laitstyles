import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type { StaffSession } from "@/modules/auth/server/session";
import { writeProductStockAndVariants } from "@/modules/inventory/server/stock-write";

const PRODUCT_ID = "019f65c1-74fe-7bd3-8400-000000000001";
const VARIANT_ID = "019f65c1-74fe-7bd3-8400-000000000011";

const actor: StaffSession = {
  kind: "staff",
  authUserId: "019f65c1-74fe-7bd3-8400-000000000099",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin",
};

const tx = {
  holds: { count: vi.fn() },
  order_lines: { count: vi.fn() },
  stock_movements: { count: vi.fn(), create: vi.fn() },
  stock_levels: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  product_variants: {
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  cloudinary_assets: { upsert: vi.fn() },
  product_media: { create: vi.fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.holds.count.mockResolvedValue(0);
  tx.order_lines.count.mockResolvedValue(0);
  tx.stock_movements.count.mockResolvedValue(0);
  tx.stock_movements.create.mockResolvedValue({});
  tx.stock_levels.update.mockResolvedValue({});
  tx.stock_levels.create.mockResolvedValue({});
  tx.stock_levels.delete.mockResolvedValue({});
  tx.stock_levels.deleteMany.mockResolvedValue({ count: 0 });
  tx.product_variants.deleteMany.mockResolvedValue({ count: 0 });
});

describe("writeProductStockAndVariants", () => {
  it("preserves reserved and committed balances separately during a stock update", async () => {
    const values = createEmptyProductEditorValues("stocked");
    if (values.inventoryMode !== "stocked") throw new Error("fixture mismatch");
    values.stocked.quantity = 9;

    await writeProductStockAndVariants(tx as never, actor, PRODUCT_ID, values, {
      inventory_mode: "stocked",
      product_variants: [],
      stock_levels: [
        {
          id: "stock-existing",
          variant_id: null,
          total_received: 8,
          available: 3,
          reserved: 1,
          committed: 2,
          sold: 1,
          returned: 0,
          damaged: 1,
        },
      ],
    } as never);

    expect(tx.stock_levels.update).toHaveBeenCalledWith({
      where: { id: "stock-existing" },
      data: {
        total_received: 9,
        available: 4,
        reserved: 1,
        committed: 2,
        sold: 1,
        returned: 0,
        damaged: 1,
      },
    });
    expect(tx.stock_movements.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        product_id: PRODUCT_ID,
        variant_id: null,
        kind: "adjusted",
        quantity: 1,
      }),
    });
  });

  it("blocks removal of a variant that has stock history", async () => {
    tx.stock_movements.count.mockResolvedValueOnce(1);
    const values = createEmptyProductEditorValues("variant");
    if (values.inventoryMode !== "variant") throw new Error("fixture mismatch");
    values.variant.variants = [];

    await expect(
      writeProductStockAndVariants(tx as never, actor, PRODUCT_ID, values, {
        inventory_mode: "variant",
        stock_levels: [],
        product_variants: [
          {
            id: VARIANT_ID,
            stock_levels: [
              {
                id: "stock-v1",
                variant_id: VARIANT_ID,
                total_received: 3,
                available: 3,
                reserved: 0,
                committed: 0,
                sold: 0,
                returned: 0,
                damaged: 0,
              },
            ],
          },
        ],
      } as never),
    ).rejects.toThrow("history");
    expect(tx.product_variants.deleteMany).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import { applyProductEditorAction } from "@/lib/control-room/product-editor-actions";
import {
  changeProductEditorMode,
  createProductEditorValues,
} from "@/lib/control-room/product-editor-defaults";
import { validateProductForPublish } from "@/lib/control-room/product-editor-schema";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

const now = "2026-07-09T15:00:00+01:00";

function idFactory() {
  let index = 0;
  return (prefix: string) => `${prefix}-guard-${++index}`;
}

function productById(id: string) {
  const product = activeControlRoomSeed.products.find((item) => item.id === id);
  if (!product) throw new Error(`Missing fixture ${id}`);
  return product;
}

describe("committed stock edit guard", () => {
  it("rejects lowering stocked received quantity below reserved and sold units", () => {
    const product = productById("botanical-jeans");
    const values = createProductEditorValues(product);
    if (values.inventoryMode !== "stocked") {
      throw new Error("Botanical Jeans must be a stocked product");
    }
    values.stocked.quantity = 20;

    const result = applyProductEditorAction(
      activeControlRoomSeed,
      values,
      "draft",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation-failed");
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: "stocked.quantity",
          step: "stock",
        }),
      );
    }
  });

  it("allows removing only uncommitted available units", () => {
    const product = productById("botanical-jeans");
    const values = createProductEditorValues(product);
    if (values.inventoryMode !== "stocked") {
      throw new Error("Botanical Jeans must be a stocked product");
    }
    values.stocked.quantity = 21;

    const result = applyProductEditorAction(
      activeControlRoomSeed,
      values,
      "draft",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.value.action.product.inventoryMode !== "stocked") {
      return;
    }
    expect(result.value.action.product.stock).toEqual({
      totalReceived: 21,
      available: 0,
      reserved: 3,
      sold: 18,
      returned: 0,
      damaged: 0,
    });
  });

  it("rejects changing the inventory model after units are committed", () => {
    const product = productById("botanical-jeans");
    const values = changeProductEditorMode(createProductEditorValues(product), "unique");

    const result = applyProductEditorAction(
      activeControlRoomSeed,
      values,
      "draft",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: "inventoryMode",
          step: "type",
        }),
      );
    }
  });

  it("rejects removing a variant that already has committed units", () => {
    const product = productById("ribbed-studio-tank");
    const values = createProductEditorValues(product);
    if (product.inventoryMode !== "variant" || values.inventoryMode !== "variant") {
      throw new Error("Ribbed Studio Tank must be a variant product");
    }

    const committedVariant = product.variants.find(
      (variant) =>
        variant.stock.reserved +
          variant.stock.sold +
          variant.stock.returned +
          variant.stock.damaged >
        0,
    );
    if (!committedVariant) throw new Error("Missing committed variant fixture");
    values.variant.variants = values.variant.variants.filter(
      (variant) => variant.id !== committedVariant.id,
    );

    const result = applyProductEditorAction(
      activeControlRoomSeed,
      values,
      "draft",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: "variant.variants",
          step: "stock",
        }),
      );
    }
  });
});

describe("unique-piece publication requirements", () => {
  it("requires at least one complete measurement before publishing", () => {
    const product = productById("nature-utility-vest");
    const values = createProductEditorValues(product);
    if (values.inventoryMode !== "unique") {
      throw new Error("Nature Utility Vest must be unique");
    }
    values.unique.measurements = [];

    expect(validateProductForPublish(values)).toContainEqual(
      expect.objectContaining({
        path: "unique.measurements",
        step: "stock",
      }),
    );
  });
});

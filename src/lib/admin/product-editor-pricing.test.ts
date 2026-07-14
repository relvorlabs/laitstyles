import { describe, expect, it } from "vitest";
import { convertEditorValuesToProduct } from "@/lib/control-room/product-editor-conversion";
import { createEmptyProductEditorValues } from "@/lib/control-room/product-editor-defaults";

const now = "2026-07-10T13:00:00+01:00";
const idFactory = (prefix: string) => `${prefix}-pricing-test`;

describe("Product pricing conversion", () => {
  it("preserves an unknown unit cost instead of converting it to zero", () => {
    const values = createEmptyProductEditorValues("stocked");
    values.cost = null;

    const product = convertEditorValuesToProduct(values, {
      intent: "draft",
      now,
      idFactory,
    });

    expect(product.cost).toBeNull();
  });

  it("preserves a genuine zero unit cost", () => {
    const values = createEmptyProductEditorValues("stocked");
    values.cost = 0;

    const product = convertEditorValuesToProduct(values, {
      intent: "draft",
      now,
      idFactory,
    });

    expect(product.cost).toBe(0);
  });
});

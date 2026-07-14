import { describe, expect, it } from "vitest";
import { validateInventoryProduct } from "@/lib/control-room/inventory-product-validation";
import { applyProductEditorAction } from "@/lib/control-room/product-editor-actions";
import { createEmptyProductEditorValues } from "@/lib/control-room/product-editor-defaults";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

const now = "2026-07-09T14:00:00+01:00";

function idFactory(prefix: string) {
  return `${prefix}-draft-validation`;
}

describe("draft media validation", () => {
  it("allows a draft product to exist before its first image preview", () => {
    const result = applyProductEditorAction(
      activeControlRoomSeed,
      createEmptyProductEditorValues("unique"),
      "draft",
      now,
      idFactory,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateInventoryProduct(result.value.action.product).ok).toBe(true);
  });

  it("still requires a cover before the product becomes active", () => {
    const result = applyProductEditorAction(
      activeControlRoomSeed,
      createEmptyProductEditorValues("unique"),
      "draft",
      now,
      idFactory,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const activeProduct = {
      ...result.value.action.product,
      lifecycle: "active" as const,
    };
    const validation = validateInventoryProduct(activeProduct);

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error.map((issue) => issue.code)).toContain("missing-cover");
    }
  });
});

import { describe, expect, it } from "vitest";
import { createControlRoomStore } from "@/features/control-room/state/control-room-store";
import { createEmptyProductEditorValues } from "@/lib/control-room/product-editor-defaults";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

const now = "2026-07-10T13:00:00+01:00";

describe("Product lifecycle actions", () => {
  it("archives a connected product without erasing operational history", () => {
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    const beforeOrderCount = store.getSnapshot().orders.length;

    const result = store.archiveProduct("botanical-jeans");

    expect(result.ok).toBe(true);
    const product = store.getSnapshot().products.find((entry) => entry.id === "botanical-jeans");
    expect(product).toEqual(
      expect.objectContaining({
        lifecycle: "archived",
        publication: "unpublished",
        channels: [],
      }),
    );
    expect(store.getSnapshot().orders).toHaveLength(beforeOrderCount);
  });

  it("restores an archived product as active but unpublished", () => {
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    store.archiveProduct("botanical-jeans");

    const result = store.restoreProduct("botanical-jeans");

    expect(result.ok).toBe(true);
    expect(store.getSnapshot().products.find((entry) => entry.id === "botanical-jeans")).toEqual(
      expect.objectContaining({
        lifecycle: "active",
        publication: "unpublished",
      }),
    );
  });

  it("blocks permanent deletion when a product has connected history", () => {
    const store = createControlRoomStore(activeControlRoomSeed, () => now);

    const result = store.deleteProduct("botanical-jeans");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Connected product should not be deleted");
    expect(result.error.code).toBe("product-in-use");
    expect(store.getSnapshot().products.some((entry) => entry.id === "botanical-jeans")).toBe(true);
  });

  it("permanently deletes an unused draft product", () => {
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    const values = createEmptyProductEditorValues("stocked");
    if (values.inventoryMode !== "stocked") throw new Error("Expected stocked values");
    values.name = "Unused draft record";
    values.category = "Shirts";
    values.brand = "Unlabelled";
    values.description =
      "An unused draft product created only to verify safe permanent deletion behavior.";
    values.internalReference = "LS-STK-UNL-SHI-UNUS";

    const saved = store.saveProduct(values, "draft");
    if (!saved.ok) throw new Error(saved.error.message);
    const productId = saved.value.product.id;

    const deleted = store.deleteProduct(productId);

    expect(deleted.ok).toBe(true);
    expect(store.getSnapshot().products.some((entry) => entry.id === productId)).toBe(false);
  });
});

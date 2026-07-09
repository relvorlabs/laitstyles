import { describe, expect, it, vi } from "vitest";
import { createControlRoomStore } from "@/features/control-room/state/control-room-store";
import { createEmptyProductEditorValues } from "@/lib/control-room/product-editor-defaults";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

describe("Control Room store subscriptions", () => {
  it("notifies Inventory subscribers and exposes a saved draft immediately", () => {
    const store = createControlRoomStore(
      activeControlRoomSeed,
      () => "2026-07-09T16:00:00+01:00",
    );
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const initialCount = store.getSnapshot().products.length;
    const values = createEmptyProductEditorValues("stocked");

    if (values.inventoryMode !== "stocked") {
      throw new Error("Expected stocked editor values");
    }

    values.name = "Phase Three Store Draft";
    values.internalReference = "LS-P3-STORE";
    values.category = "Shirts";
    values.brand = "Laitstyle Studio";
    values.description =
      "A store-level draft used to prove that subscribed Inventory views receive catalogue commits.";

    const result = store.saveProduct(values, "draft");

    expect(result.ok).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().products).toHaveLength(initialCount + 1);
    expect(store.getSnapshot().products[0]).toEqual(
      expect.objectContaining({
        name: "Phase Three Store Draft",
        lifecycle: "draft",
        publication: "unpublished",
      }),
    );

    unsubscribe();
  });

  it("stops notifying a removed subscriber", () => {
    const store = createControlRoomStore(activeControlRoomSeed);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.resetPrototypeState();

    expect(listener).not.toHaveBeenCalled();
  });
});

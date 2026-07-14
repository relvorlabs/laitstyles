import { describe, expect, it, vi } from "vitest";
import { createAdminStore } from "@/features/admin/state/admin-store";
import { activeAdminSeed } from "@/lib/admin/admin-seed";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor-defaults";

describe("Admin store subscriptions", () => {
  it("notifies Inventory subscribers and exposes a saved draft immediately", () => {
    const store = createAdminStore(activeAdminSeed, () => "2026-07-09T16:00:00+01:00");
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

  it("notifies every workspace after a connected offline sale", () => {
    const store = createAdminStore(activeAdminSeed, () => "2026-07-09T18:00:00+01:00");
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    const beforeProduct = before.products.find((product) => product.id === "botanical-jeans");
    if (!beforeProduct || beforeProduct.inventoryMode !== "stocked") {
      throw new Error("Missing Botanical Jeans fixture");
    }

    const result = store.recordOfflineSale({
      lines: [
        {
          productId: "botanical-jeans",
          quantity: 1,
          unitPrice: 28000,
        },
      ],
      channel: "physical-store",
      customer: { kind: "existing", customerId: "customer-amara" },
      paymentMethod: "pos",
      paymentStatus: "paid",
      notes: "Shared-store regression sale.",
    });

    expect(result.ok).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    const after = store.getSnapshot();
    expect(after.orders).toHaveLength(before.orders.length + 1);
    expect(after.orders[0]).toEqual(
      expect.objectContaining({
        source: "offline-sale",
        fulfilmentStatus: "delivered",
        total: 28000,
      }),
    );
    const afterProduct = after.products.find((product) => product.id === "botanical-jeans");
    if (!afterProduct || afterProduct.inventoryMode !== "stocked") {
      throw new Error("Missing updated Botanical Jeans fixture");
    }
    expect(afterProduct.stock.available).toBe(beforeProduct.stock.available - 1);
    expect(afterProduct.stock.sold).toBe(beforeProduct.stock.sold + 1);
  });

  it("stops notifying a removed subscriber", () => {
    const store = createAdminStore(activeAdminSeed);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.resetPrototypeState();

    expect(listener).not.toHaveBeenCalled();
  });
});

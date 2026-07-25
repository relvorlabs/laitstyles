import { beforeEach, describe, expect, it } from "vitest";
import { savedItemsStore } from "@/stores/saved-items.store";

describe("saved-items store", () => {
  beforeEach(() => savedItemsStore.getState().reset());

  it("hydrates unique product IDs only", () => {
    savedItemsStore.getState().hydrate(["product-1", "product-1", "product-2"]);

    expect(savedItemsStore.getState()).toMatchObject({
      hydrated: true,
      ids: ["product-1", "product-2"],
    });
  });

  it("toggles, saves, removes and clears IDs deterministically", () => {
    expect(savedItemsStore.getState().toggle("product-1")).toBe(true);
    expect(savedItemsStore.getState().toggle("product-1")).toBe(false);

    savedItemsStore.getState().save("product-2");
    savedItemsStore.getState().save("product-2");
    expect(savedItemsStore.getState().ids).toEqual(["product-2"]);

    savedItemsStore.getState().remove("product-2");
    expect(savedItemsStore.getState().ids).toEqual([]);

    savedItemsStore.getState().hydrate(["product-3"]);
    savedItemsStore.getState().clear();
    expect(savedItemsStore.getState().ids).toEqual([]);
  });
});

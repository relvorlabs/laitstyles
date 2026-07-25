import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storefrontUiStore } from "@/stores/storefront-ui.store";

describe("storefront UI intent store", () => {
  beforeEach(() => storefrontUiStore.getState().reset());
  afterEach(() => vi.useRealTimers());

  it("hydrates only IDs, timestamps and UI preferences", () => {
    storefrontUiStore.getState().hydrate({
      recentIds: ["product-1", "product-1", "product-2"],
      utilityDismissed: true,
      holds: [{ productId: "product-3", expiresAt: 10_000 }],
    });

    expect(storefrontUiStore.getState()).toMatchObject({
      hydrated: true,
      recentIds: ["product-1", "product-2"],
      utilityDismissed: true,
      holds: [{ productId: "product-3", expiresAt: 10_000 }],
    });
  });

  it("owns shared overlay identity without local form or viewer state", () => {
    storefrontUiStore.getState().open("savedDrawer");
    expect(storefrontUiStore.getState().openId).toBe("savedDrawer");
    storefrontUiStore.getState().close();
    expect(storefrontUiStore.getState().openId).toBeNull();
    expect(storefrontUiStore.getState()).not.toHaveProperty("imageIndex");
    expect(storefrontUiStore.getState()).not.toHaveProperty("zoom");
    expect(storefrontUiStore.getState()).not.toHaveProperty("newsletterStatus");
  });

  it("treats holds as expiring browser intent rather than authoritative inventory", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
    const now = Date.now();

    storefrontUiStore.getState().hold("product-1", now + 60_000);
    storefrontUiStore.getState().hold("product-2", now - 1);
    expect(storefrontUiStore.getState().holds).toHaveLength(2);

    storefrontUiStore.getState().removeExpired(now);
    expect(storefrontUiStore.getState().holds).toEqual([
      { productId: "product-1", expiresAt: now + 60_000 },
    ]);

    storefrontUiStore.getState().release("product-1");
    expect(storefrontUiStore.getState().holds).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  LEGACY_STOREFRONT_STORAGE_KEYS,
  persistStorefrontClientState,
  STOREFRONT_CLIENT_STATE_STORAGE_KEY,
  STOREFRONT_CLIENT_STATE_VERSION,
  type StorefrontStateStorage,
} from "@/modules/storefront-shell/client/storefront-client-state";

class MemoryStorage implements StorefrontStateStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("storefront client-state persistence failures", () => {
  it("does not clean legacy keys when the canonical write fails", () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    const legacyKey = LEGACY_STOREFRONT_STORAGE_KEYS.cart[2];
    local.setItem(legacyKey, JSON.stringify([{ id: "legacy", qty: 1 }]));

    const blockedSession: StorefrontStateStorage = {
      getItem: (key) => session.getItem(key),
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: (key) => session.removeItem(key),
    };

    expect(() =>
      persistStorefrontClientState(blockedSession, local, {
        version: STOREFRONT_CLIENT_STATE_VERSION,
        cart: [{ productId: "p1", variantId: null, quantity: 1 }],
        saved: [],
        holds: [],
      }),
    ).not.toThrow();
    expect(session.getItem(STOREFRONT_CLIENT_STATE_STORAGE_KEY)).toBeNull();
    expect(local.getItem(legacyKey)).not.toBeNull();
  });

  it("keeps the canonical snapshot when legacy cleanup is blocked", () => {
    const session = new MemoryStorage();
    const local: StorefrontStateStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new Error("blocked cleanup");
      },
    };

    expect(() =>
      persistStorefrontClientState(session, local, {
        version: STOREFRONT_CLIENT_STATE_VERSION,
        cart: [],
        saved: ["p1"],
        holds: [],
      }),
    ).not.toThrow();
    expect(session.getItem(STOREFRONT_CLIENT_STATE_STORAGE_KEY)).not.toBeNull();
  });
});

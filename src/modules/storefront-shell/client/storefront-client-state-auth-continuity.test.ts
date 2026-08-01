import { describe, expect, it } from "vitest";
import {
  loadStorefrontClientState,
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

const NOW = 1_800_000_000_000;
const snapshot = {
  version: STOREFRONT_CLIENT_STATE_VERSION,
  cart: [{ productId: "piece-a", variantId: null, quantity: 1 }],
  saved: ["piece-b"],
  holds: [{ productId: "piece-c", expiresAt: NOW + 60_000 }],
};

describe("storefront auth continuity", () => {
  it("writes the minimal canonical snapshot to session and local storage", () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();

    persistStorefrontClientState(session, local, snapshot, NOW);

    expect(JSON.parse(session.getItem(STOREFRONT_CLIENT_STATE_STORAGE_KEY) ?? "null")).toEqual(
      snapshot,
    );
    expect(JSON.parse(local.getItem(STOREFRONT_CLIENT_STATE_STORAGE_KEY) ?? "null")).toEqual(
      snapshot,
    );
  });

  it("restores the guest bag in a new tab opened by an auth email callback", () => {
    const originalSession = new MemoryStorage();
    const newTabSession = new MemoryStorage();
    const sharedLocal = new MemoryStorage();
    persistStorefrontClientState(originalSession, sharedLocal, snapshot, NOW);

    expect(loadStorefrontClientState(newTabSession, sharedLocal, NOW)).toEqual({
      migrated: true,
      snapshot,
    });
  });

  it("prefers the current tab snapshot over an older cross-tab fallback", () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    local.setItem(STOREFRONT_CLIENT_STATE_STORAGE_KEY, JSON.stringify(snapshot));
    session.setItem(
      STOREFRONT_CLIENT_STATE_STORAGE_KEY,
      JSON.stringify({
        ...snapshot,
        cart: [{ productId: "current-tab", variantId: null, quantity: 2 }],
      }),
    );

    expect(loadStorefrontClientState(session, local, NOW).snapshot.cart).toEqual([
      { productId: "current-tab", variantId: null, quantity: 2 },
    ]);
  });
});

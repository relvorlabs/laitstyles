import { describe, expect, it } from "vitest";
import {
  emptyStorefrontClientState,
  LEGACY_STOREFRONT_STORAGE_KEYS,
  loadStorefrontClientState,
  migrateLegacyStorefrontClientState,
  normalizeStorefrontClientState,
  persistStorefrontClientState,
  STOREFRONT_CLIENT_STATE_STORAGE_KEY,
  STOREFRONT_CLIENT_STATE_VERSION,
  type StorefrontStateStorage,
} from "./storefront-client-state";

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

describe("storefront client state", () => {
  it("normalizes minimal records, deduplicates values and prunes expired holds", () => {
    expect(
      normalizeStorefrontClientState(
        {
          version: STOREFRONT_CLIENT_STATE_VERSION,
          cart: [
            { productId: "p1", variantId: null, quantity: 1 },
            { productId: "p1", variantId: null, quantity: 2 },
            { productId: "p2", variantId: "v2", quantity: 0 },
          ],
          saved: ["p1", "p1", "", { productId: "p2" }],
          holds: [
            { productId: "p1", expiresAt: NOW + 60_000 },
            { productId: "p1", expiresAt: NOW + 120_000 },
            { productId: "p2", expiresAt: NOW - 1 },
          ],
        },
        NOW,
      ),
    ).toEqual({
      version: STOREFRONT_CLIENT_STATE_VERSION,
      cart: [{ productId: "p1", variantId: null, quantity: 3 }],
      saved: ["p1", "p2"],
      holds: [{ productId: "p1", expiresAt: NOW + 120_000 }],
    });
  });

  it("migrates cart, saved products and both legacy hold formats", () => {
    expect(
      migrateLegacyStorefrontClientState(
        {
          cart: [
            { id: "p1", qty: 1 },
            { productId: "p2", variantId: "v2", quantity: 2 },
          ],
          saved: ["p1", { id: "p2" }],
          holds: {
            p1: {
              expiresAt: NOW + 90_000,
              piece: { id: "p1", name: "Piece one" },
            },
          },
          heldItems: [
            {
              product: { id: "p2", name: "Piece two" },
              secondsLeft: 45,
            },
          ],
        },
        NOW,
      ),
    ).toEqual({
      version: STOREFRONT_CLIENT_STATE_VERSION,
      cart: [
        { productId: "p1", variantId: null, quantity: 1 },
        { productId: "p2", variantId: "v2", quantity: 2 },
      ],
      saved: ["p1", "p2"],
      holds: [
        { productId: "p2", expiresAt: NOW + 45_000 },
        { productId: "p1", expiresAt: NOW + 90_000 },
      ],
    });
  });

  it("prefers the v3 snapshot instead of resurrecting legacy state", () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    session.setItem(
      STOREFRONT_CLIENT_STATE_STORAGE_KEY,
      JSON.stringify({
        version: STOREFRONT_CLIENT_STATE_VERSION,
        cart: [{ productId: "current", variantId: null, quantity: 1 }],
        saved: [],
        holds: [],
      }),
    );
    local.setItem(LEGACY_STOREFRONT_STORAGE_KEYS.cart[2], JSON.stringify([{ id: "legacy", qty: 4 }]));

    expect(loadStorefrontClientState(session, local, NOW)).toEqual({
      migrated: false,
      snapshot: {
        version: STOREFRONT_CLIENT_STATE_VERSION,
        cart: [{ productId: "current", variantId: null, quantity: 1 }],
        saved: [],
        holds: [],
      },
    });
  });

  it("persists one minimal snapshot and removes every compatibility key", () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    for (const key of Object.values(LEGACY_STOREFRONT_STORAGE_KEYS).flat()) {
      session.setItem(key, "legacy");
      local.setItem(key, "legacy");
    }

    const persisted = persistStorefrontClientState(
      session,
      local,
      {
        version: STOREFRONT_CLIENT_STATE_VERSION,
        cart: [{ productId: "p1", variantId: null, quantity: 1 }],
        saved: ["p1"],
        holds: [{ productId: "p1", expiresAt: NOW + 60_000 }],
      },
      NOW,
    );

    expect(JSON.parse(session.getItem(STOREFRONT_CLIENT_STATE_STORAGE_KEY) ?? "null")).toEqual(
      persisted,
    );
    for (const key of Object.values(LEGACY_STOREFRONT_STORAGE_KEYS).flat()) {
      expect(session.getItem(key)).toBeNull();
      expect(local.getItem(key)).toBeNull();
    }
  });

  it("returns an empty snapshot for malformed input", () => {
    expect(normalizeStorefrontClientState("bad", NOW)).toEqual(emptyStorefrontClientState());
  });
});

export const STOREFRONT_CLIENT_STATE_VERSION = 3 as const;
export const STOREFRONT_CLIENT_STATE_STORAGE_KEY = "laitstyles-storefront:v3:client-state";

export const LEGACY_STOREFRONT_STORAGE_KEYS = {
  cart: ["laitstyles-storefront:v2:cart", "laitstyles-storefront:v1:cart", "laitstyles-cart"],
  saved: ["laitstyles-storefront:v1:saved", "laitstyles-saved"],
  holds: ["laitstyles-storefront:v1:holds", "laitstyle-held-items-v1"],
} as const;

export type StorefrontCartIntent = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

export type StorefrontHoldIntent = {
  productId: string;
  expiresAt: number;
};

export type StorefrontClientStateSnapshot = {
  version: typeof STOREFRONT_CLIENT_STATE_VERSION;
  cart: StorefrontCartIntent[];
  saved: string[];
  holds: StorefrontHoldIntent[];
};

type LegacyStateSources = {
  current?: unknown;
  cart?: unknown;
  saved?: unknown;
  holds?: unknown;
  heldItems?: unknown;
};

export interface StorefrontStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

function finiteTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseStoredValue(storage: StorefrontStateStorage, key: string): unknown {
  const serialized = storage.getItem(key);
  if (!serialized) return undefined;
  try {
    return JSON.parse(serialized);
  } catch {
    return undefined;
  }
}

function firstStoredValue(
  sessionStorage: StorefrontStateStorage,
  localStorage: StorefrontStateStorage,
  keys: readonly string[],
): unknown {
  for (const key of keys) {
    const sessionValue = parseStoredValue(sessionStorage, key);
    if (sessionValue !== undefined) return sessionValue;
    const localValue = parseStoredValue(localStorage, key);
    if (localValue !== undefined) return localValue;
  }
  return undefined;
}

function normalizeCart(values: unknown[]): StorefrontCartIntent[] {
  const byLine = new Map<string, StorefrontCartIntent>();

  for (const candidate of values) {
    if (!isRecord(candidate)) continue;
    const productId = nonEmptyString(candidate.productId) ?? nonEmptyString(candidate.id);
    const quantity = positiveInteger(candidate.quantity) ?? positiveInteger(candidate.qty);
    if (!productId || !quantity) continue;

    const variantId =
      candidate.variantId === null
        ? null
        : nonEmptyString(candidate.variantId) ?? nonEmptyString(candidate.variant);
    const lineKey = `${productId}::${variantId ?? ""}`;
    const existing = byLine.get(lineKey);
    byLine.set(lineKey, {
      productId,
      variantId,
      quantity: (existing?.quantity ?? 0) + quantity,
    });
  }

  return [...byLine.values()];
}

function normalizeSaved(values: unknown[]): string[] {
  const productIds = new Set<string>();
  for (const candidate of values) {
    const productId =
      nonEmptyString(candidate) ??
      (isRecord(candidate)
        ? nonEmptyString(candidate.productId) ?? nonEmptyString(candidate.id)
        : null);
    if (productId) productIds.add(productId);
  }
  return [...productIds];
}

function normalizeHoldCandidate(candidate: unknown, now: number): StorefrontHoldIntent | null {
  if (!isRecord(candidate)) return null;

  const piece = isRecord(candidate.piece) ? candidate.piece : null;
  const product = isRecord(candidate.product) ? candidate.product : null;
  const productId =
    nonEmptyString(candidate.productId) ??
    nonEmptyString(candidate.id) ??
    nonEmptyString(piece?.id) ??
    nonEmptyString(product?.id);
  if (!productId) return null;

  const directExpiry = finiteTimestamp(candidate.expiresAt);
  const secondsLeft = positiveInteger(candidate.secondsLeft);
  const expiresAt = directExpiry ?? (secondsLeft ? now + secondsLeft * 1000 : null);
  return expiresAt && expiresAt > now ? { productId, expiresAt } : null;
}

function normalizeHolds(value: unknown, now: number): StorefrontHoldIntent[] {
  const byProduct = new Map<string, StorefrontHoldIntent>();
  const candidates = Array.isArray(value)
    ? value
    : isRecord(value)
      ? Object.entries(value).map(([productId, entry]) =>
          isRecord(entry) ? { productId, ...entry } : entry,
        )
      : [];

  for (const candidate of candidates) {
    const hold = normalizeHoldCandidate(candidate, now);
    if (!hold) continue;
    const existing = byProduct.get(hold.productId);
    if (!existing || hold.expiresAt > existing.expiresAt) byProduct.set(hold.productId, hold);
  }

  return [...byProduct.values()];
}

export function emptyStorefrontClientState(): StorefrontClientStateSnapshot {
  return {
    version: STOREFRONT_CLIENT_STATE_VERSION,
    cart: [],
    saved: [],
    holds: [],
  };
}

export function normalizeStorefrontClientState(
  value: unknown,
  now: number = Date.now(),
): StorefrontClientStateSnapshot {
  if (!isRecord(value)) return emptyStorefrontClientState();
  return {
    version: STOREFRONT_CLIENT_STATE_VERSION,
    cart: normalizeCart(Array.isArray(value.cart) ? value.cart : []),
    saved: normalizeSaved(Array.isArray(value.saved) ? value.saved : []),
    holds: normalizeHolds(value.holds, now),
  };
}

export function migrateLegacyStorefrontClientState(
  sources: LegacyStateSources,
  now: number = Date.now(),
): StorefrontClientStateSnapshot {
  if (isRecord(sources.current) && sources.current.version === STOREFRONT_CLIENT_STATE_VERSION) {
    return normalizeStorefrontClientState(sources.current, now);
  }

  return {
    version: STOREFRONT_CLIENT_STATE_VERSION,
    cart: normalizeCart(Array.isArray(sources.cart) ? sources.cart : []),
    saved: normalizeSaved(Array.isArray(sources.saved) ? sources.saved : []),
    holds: normalizeHolds(
      [
        ...(Array.isArray(sources.heldItems) ? sources.heldItems : []),
        ...(Array.isArray(sources.holds) ? sources.holds : []),
        ...(isRecord(sources.holds) ? Object.entries(sources.holds).map(([productId, entry]) => ({ productId, ...(isRecord(entry) ? entry : {}) })) : []),
      ],
      now,
    ),
  };
}

export function loadStorefrontClientState(
  sessionStorage: StorefrontStateStorage,
  localStorage: StorefrontStateStorage,
  now: number = Date.now(),
): { snapshot: StorefrontClientStateSnapshot; migrated: boolean } {
  const current = parseStoredValue(sessionStorage, STOREFRONT_CLIENT_STATE_STORAGE_KEY);
  if (current !== undefined) {
    return { snapshot: normalizeStorefrontClientState(current, now), migrated: false };
  }

  const cart = firstStoredValue(
    sessionStorage,
    localStorage,
    LEGACY_STOREFRONT_STORAGE_KEYS.cart,
  );
  const saved = firstStoredValue(
    sessionStorage,
    localStorage,
    LEGACY_STOREFRONT_STORAGE_KEYS.saved,
  );
  const experienceHolds = firstStoredValue(sessionStorage, localStorage, [
    LEGACY_STOREFRONT_STORAGE_KEYS.holds[0],
  ]);
  const shopHolds = firstStoredValue(sessionStorage, localStorage, [
    LEGACY_STOREFRONT_STORAGE_KEYS.holds[1],
  ]);

  const migrated =
    cart !== undefined || saved !== undefined || experienceHolds !== undefined || shopHolds !== undefined;
  return {
    snapshot: migrateLegacyStorefrontClientState(
      { cart, saved, holds: experienceHolds, heldItems: shopHolds },
      now,
    ),
    migrated,
  };
}

export function persistStorefrontClientState(
  sessionStorage: StorefrontStateStorage,
  localStorage: StorefrontStateStorage,
  value: StorefrontClientStateSnapshot,
  now: number = Date.now(),
): StorefrontClientStateSnapshot {
  const snapshot = normalizeStorefrontClientState(value, now);
  sessionStorage.setItem(STOREFRONT_CLIENT_STATE_STORAGE_KEY, JSON.stringify(snapshot));

  for (const key of Object.values(LEGACY_STOREFRONT_STORAGE_KEYS).flat()) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }

  return snapshot;
}

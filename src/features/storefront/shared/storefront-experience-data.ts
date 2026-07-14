export type StorefrontAccountItemState = "available" | "lastone" | "resYou" | "resOthers" | "sold";

export type StorefrontAccountItem = {
  id: string;
  name: string;
  cat: string;
  size: string;
  color: string;
  cond: string;
  priceNum: number;
  origNum: number;
  st: StorefrontAccountItemState;
  img: string;
  removed?: boolean;
  secondsLeft?: number;
  mins?: number;
};

export const storefrontImage = (id: string) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

export const storefrontAccountSeedItems: StorefrontAccountItem[] = [
  [
    "Botanical Print Jacket",
    "Jackets",
    "S",
    "Ivory",
    "Excellent",
    34000,
    42000,
    "lastone",
    "1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf",
  ],
  [
    "Sage Field Vest",
    "Jackets",
    "M",
    "Sage",
    "Excellent",
    28000,
    35000,
    "available",
    "1T0XygfKzp92Id6ch09aTFcUyG8PbIG66",
  ],
  [
    "Eco Shell Jacket",
    "Jackets",
    "M",
    "Grey",
    "Excellent",
    31000,
    39000,
    "resYou",
    "1_2N674OlXJWHLw2a0Yh99LPNMlzQ95o_",
  ],
  [
    "Ivory Zip Jacket",
    "Jackets",
    "M",
    "Cream",
    "Good",
    29000,
    37000,
    "resOthers",
    "1PDPeY2i810fzrtHsOUIcbh569FWkkNep",
  ],
  [
    "Bloom Belted Coat",
    "Coats",
    "L",
    "Rust",
    "Excellent",
    45000,
    58000,
    "sold",
    "1k3j8wbjDh_WYYrHykQo8HPGoLDuLYtpv",
  ],
  [
    "Daisy Field Dress",
    "Dresses",
    "S",
    "Ivory",
    "Excellent",
    26000,
    33000,
    "available",
    "1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh",
  ],
  [
    "Chunky Cable Sweater",
    "Knitwear",
    "M",
    "Rust",
    "Good",
    23000,
    29000,
    "lastone",
    "127OwSWR8AB6eyu9zzWjc_k7KW3cYa-Uw",
  ],
  [
    "Linen Camp Shirt",
    "Shirts",
    "M",
    "Cream",
    "Excellent",
    13500,
    18000,
    "available",
    "1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80",
  ],
].map((row, index) => ({
  id: `w${index}`,
  name: row[0] as string,
  cat: row[1] as string,
  size: row[2] as string,
  color: row[3] as string,
  cond: row[4] as string,
  priceNum: row[5] as number,
  origNum: row[6] as number,
  st: row[7] as StorefrontAccountItemState,
  img: storefrontImage(row[8] as string),
  secondsLeft: row[7] === "resYou" ? 742 - index * 7 : undefined,
  mins: row[7] === "resOthers" ? 4 + (index % 4) : undefined,
}));

// ── Storefront holds ─────────────────────────────────────────────────────────
// A storefront product placed on a 15-minute hold is represented as a `resYou`
// item in the same list the account seed lives in, so it reuses the existing
// countdown interval, `holdCount` / `soonestHoldSeconds`, the global hold banner
// and the account Reservations tab. Storefront-originated holds are distinguished
// from the account seed by id: the seed uses the `w{n}` namespace, holds use the
// real product id (e.g. `p3`). Helpers here are pure so they can be unit-tested.

export const HOLD_SECONDS = 15 * 60;

export const SEED_HOLD_IDS: ReadonlySet<string> = new Set(
  storefrontAccountSeedItems.map((item) => item.id),
);

// Minimal, home-lab-agnostic shape the provider accepts to place a hold.
export type HoldablePiece = {
  id: string;
  name: string;
  cat: string;
  size: string;
  color: string;
  cond: string;
  priceNum: number;
  origNum: number;
  img: string;
};

export type PersistedHold = { expiresAt: number; piece: HoldablePiece };
export type HoldsRecord = Record<string, PersistedHold>;

export const HOLDS_STORAGE_KEY = "laitstyles-storefront:v1:holds";

function pieceToHeldItem(piece: HoldablePiece, secondsLeft: number): StorefrontAccountItem {
  return {
    id: piece.id,
    name: piece.name,
    cat: piece.cat,
    size: piece.size,
    color: piece.color,
    cond: piece.cond,
    priceNum: piece.priceNum,
    origNum: piece.origNum,
    st: "resYou",
    img: piece.img,
    removed: false,
    secondsLeft,
  };
}

// Upsert a `resYou` hold for `piece`. Re-holding an existing piece resets its timer.
export function applyHold(
  items: StorefrontAccountItem[],
  piece: HoldablePiece,
  seconds: number = HOLD_SECONDS,
): StorefrontAccountItem[] {
  const held = pieceToHeldItem(piece, seconds);
  return items.some((item) => item.id === piece.id)
    ? items.map((item) => (item.id === piece.id ? held : item))
    : [...items, held];
}

// Release a hold. Seed items reset to `available`; storefront-originated items are
// removed entirely so the list does not grow without bound.
export function applyRelease(items: StorefrontAccountItem[], id: string): StorefrontAccountItem[] {
  if (SEED_HOLD_IDS.has(id)) {
    return items.map((item) =>
      item.id === id ? { ...item, st: "available", secondsLeft: undefined } : item,
    );
  }
  return items.filter((item) => item.id !== id);
}

// One-second decrement for every active hold. On expiry, seed items fall back to
// `available`; storefront-originated items are dropped.
export function tickHolds(items: StorefrontAccountItem[]): StorefrontAccountItem[] {
  const next: StorefrontAccountItem[] = [];
  for (const item of items) {
    if (item.st !== "resYou") {
      next.push(item);
      continue;
    }
    const remaining = (item.secondsLeft || 0) - 1;
    if (remaining > 0) {
      next.push({ ...item, secondsLeft: remaining });
    } else if (SEED_HOLD_IDS.has(item.id)) {
      next.push({ ...item, st: "available", secondsLeft: undefined });
    }
    // else: storefront-originated hold expired → dropped.
  }
  return next;
}

// ── Persistence (sessionStorage) ─────────────────────────────────────────────

export function readPersistedHolds(): HoldsRecord {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(HOLDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HoldsRecord;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writePersistedHolds(record: HoldsRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HOLDS_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore quota / serialization failures — holds are best-effort.
  }
}

// Drop entries that have already expired at `now` (epoch ms).
export function pruneExpiredHolds(record: HoldsRecord, now: number): HoldsRecord {
  const next: HoldsRecord = {};
  for (const [id, entry] of Object.entries(record)) {
    if (entry.expiresAt > now) next[id] = entry;
  }
  return next;
}

// Rehydrate unexpired persisted holds into `resYou` items with an accurate
// remaining countdown derived from the absolute expiry.
export function holdsToItems(record: HoldsRecord, now: number): StorefrontAccountItem[] {
  const items: StorefrontAccountItem[] = [];
  for (const entry of Object.values(record)) {
    const remaining = Math.ceil((entry.expiresAt - now) / 1000);
    if (remaining > 0) items.push(pieceToHeldItem(entry.piece, remaining));
  }
  return items;
}

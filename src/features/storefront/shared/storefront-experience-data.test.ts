import { describe, expect, it } from "vitest";
import {
  applyHold,
  applyRelease,
  HOLD_SECONDS,
  type HoldablePiece,
  type HoldsRecord,
  holdsToItems,
  pruneExpiredHolds,
  type StorefrontAccountItem,
  storefrontAccountSeedItems,
  tickHolds,
} from "./storefront-experience-data";

const piece: HoldablePiece = {
  id: "p3",
  name: "Archive Field Coat",
  cat: "Men",
  size: "L",
  color: "",
  cond: "A+",
  priceNum: 42000,
  origNum: 42000,
  img: "https://example.test/p3.jpg",
};

const heldStorefront = (id: string, secondsLeft: number): StorefrontAccountItem => ({
  id,
  name: id,
  cat: "Men",
  size: "L",
  color: "",
  cond: "A",
  priceNum: 1000,
  origNum: 1000,
  st: "resYou",
  img: "x",
  secondsLeft,
});

describe("applyHold", () => {
  it("appends a resYou item for a new piece with the full timer", () => {
    const next = applyHold([], piece);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "p3", st: "resYou", secondsLeft: HOLD_SECONDS });
  });

  it("resets the timer when re-holding an existing piece (idempotent)", () => {
    const once = applyHold([], piece, 120);
    const twice = applyHold(once, piece);
    expect(twice).toHaveLength(1);
    expect(twice[0].secondsLeft).toBe(HOLD_SECONDS);
  });
});

describe("applyRelease", () => {
  it("removes a storefront-originated hold entirely", () => {
    const held = applyHold([], piece);
    expect(applyRelease(held, "p3")).toHaveLength(0);
  });

  it("resets a seed hold to available instead of removing it", () => {
    const seed = storefrontAccountSeedItems.map((i) => ({ ...i }));
    const seededHold = seed.find((i) => i.st === "resYou");
    expect(seededHold).toBeDefined();
    const released = applyRelease(seed, seededHold?.id ?? "");
    expect(released).toHaveLength(seed.length);
    const after = released.find((i) => i.id === seededHold?.id);
    expect(after).toMatchObject({ st: "available", secondsLeft: undefined });
  });
});

describe("tickHolds", () => {
  it("decrements active holds by one second", () => {
    const [only] = tickHolds([heldStorefront("p3", 10)]);
    expect(only.secondsLeft).toBe(9);
  });

  it("drops storefront holds that reach zero", () => {
    expect(tickHolds([heldStorefront("p3", 1)])).toHaveLength(0);
  });

  it("returns seed holds to available at zero rather than dropping them", () => {
    const seedId = storefrontAccountSeedItems[0].id;
    const next = tickHolds([{ ...heldStorefront(seedId, 1) }]);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ st: "available", secondsLeft: undefined });
  });

  it("leaves non-resYou items untouched", () => {
    const item: StorefrontAccountItem = { ...heldStorefront("p9", 5), st: "available" };
    expect(tickHolds([item])).toEqual([item]);
  });
});

describe("holdsToItems / pruneExpiredHolds", () => {
  const now = 1_000_000_000;
  const record: HoldsRecord = {
    p3: { expiresAt: now + 30_000, piece }, // 30s left
    p4: { expiresAt: now - 5_000, piece: { ...piece, id: "p4" } }, // expired
  };

  it("rehydrates only unexpired holds with an accurate remaining countdown", () => {
    const items = holdsToItems(record, now);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "p3", st: "resYou", secondsLeft: 30 });
  });

  it("prunes expired entries", () => {
    const pruned = pruneExpiredHolds(record, now);
    expect(Object.keys(pruned)).toEqual(["p3"]);
  });
});

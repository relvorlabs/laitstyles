import { describe, expect, it, vi } from "vitest";
import { createControlRoomStore } from "@/features/control-room/state/control-room-store";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

describe("Store settings action", () => {
  it("hydrates deterministic settings into the shared store", () => {
    const store = createControlRoomStore(activeControlRoomSeed);

    expect(store.getSnapshot().settings).toEqual(
      expect.objectContaining({
        identity: expect.objectContaining({ storeName: "Laitstyle" }),
        selling: expect.objectContaining({ currency: "NGN" }),
      }),
    );
  });

  it("saves settings, updates connected store identity and notifies subscribers", () => {
    const now = "2026-07-10T11:00:00+01:00";
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    const listener = vi.fn();
    store.subscribe(listener);
    const current = store.getSnapshot().settings;
    if (!current) throw new Error("Missing normalized store settings");

    const result = store.saveStoreSettings({
      ...structuredClone(current),
      identity: {
        ...current.identity,
        storeName: "Laitstyle Archive",
      },
      selling: {
        ...current.selling,
        holdDurationMinutes: 20,
      },
    });

    expect(result.ok).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual(
      expect.objectContaining({
        storeName: "Laitstyle Archive",
        asOf: now,
        settings: expect.objectContaining({
          updatedAt: now,
          selling: expect.objectContaining({ holdDurationMinutes: 20 }),
        }),
      }),
    );
    expect(store.getSnapshot().activities[0]).toEqual(
      expect.objectContaining({
        kind: "settings",
        title: "Store settings updated",
      }),
    );
  });

  it("rejects invalid settings without changing subscribers or state", () => {
    const store = createControlRoomStore(activeControlRoomSeed);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    const current = before.settings;
    if (!current) throw new Error("Missing normalized store settings");

    const result = store.saveStoreSettings({
      ...structuredClone(current),
      payments: {
        ...current.payments,
        acceptedMethods: [],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual(
      expect.objectContaining({
        code: "invalid-settings",
        issues: expect.arrayContaining([
          expect.objectContaining({ section: "payments" }),
        ]),
      }),
    );
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);
  });
});

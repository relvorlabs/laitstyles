import { describe, expect, it } from "vitest";
import { createControlRoomStore } from "@/features/control-room/state/control-room-store";
import { applyAddCustomerNote } from "@/lib/control-room/customer-actions";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

describe("Customer note actions", () => {
  it("adds a session note and customer activity through the shared store", () => {
    const now = "2026-07-09T11:40:00+01:00";
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    const result = store.addCustomerNote({
      customerId: "customer-amara",
      body: "  Prefers the longer inseam when both cuts are available.  ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const customer = store.getSnapshot().customers.find((entry) => entry.id === "customer-amara");
    expect(customer?.notes?.[0]).toMatchObject({
      body: "Prefers the longer inseam when both cuts are available.",
      createdAt: now,
      author: "Store owner",
    });
    expect(store.getSnapshot().activities[0]).toMatchObject({
      kind: "customer",
      customerId: "customer-amara",
    });
  });

  it("returns a field error for an empty note", () => {
    const result = applyAddCustomerNote(
      activeControlRoomSeed,
      { customerId: "customer-amara", body: "   " },
      activeControlRoomSeed.asOf,
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "empty-note",
        customerId: "customer-amara",
        field: "body",
        message: "Enter a useful internal note before saving.",
      },
    });
  });

  it("rejects notes beyond the prototype boundary", () => {
    const result = applyAddCustomerNote(
      activeControlRoomSeed,
      { customerId: "customer-amara", body: "a".repeat(601) },
      activeControlRoomSeed.asOf,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("note-too-long");
    expect(result.error.field).toBe("body");
  });
});

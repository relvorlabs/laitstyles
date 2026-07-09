import { describe, expect, it } from "vitest";
import {
  defaultHoldQuery,
  getHoldSavedViewCounts,
  getHoldWorkspaceSummary,
  queryHolds,
  toHoldWorkspaceItem,
} from "@/features/control-room/holds/hold-selectors";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

describe("Holds workspace selectors", () => {
  it("sorts holds by release time by default", () => {
    expect(
      queryHolds(activeControlRoomSeed, defaultHoldQuery).map(
        (hold) => hold.id,
      ),
    ).toEqual(["hold-botanical", "hold-tank", "hold-sage"]);
  });

  it("derives expiring and payment-risk views from the session clock", () => {
    expect(
      queryHolds(activeControlRoomSeed, {
        ...defaultHoldQuery,
        view: "expiring",
      }).map((hold) => hold.id),
    ).toEqual(["hold-botanical"]);

    expect(
      queryHolds(activeControlRoomSeed, {
        ...defaultHoldQuery,
        view: "payment-risk",
      }).map((hold) => hold.id),
    ).toEqual(["hold-sage"]);
  });

  it("searches customer and product context and filters assisted sources", () => {
    expect(
      queryHolds(activeControlRoomSeed, {
        ...defaultHoldQuery,
        search: "roqeebah sage",
      }).map((hold) => hold.id),
    ).toEqual(["hold-sage"]);

    expect(
      queryHolds(activeControlRoomSeed, {
        ...defaultHoldQuery,
        source: "assisted",
      }).map((hold) => hold.id),
    ).toEqual(["hold-tank", "hold-sage"]);
  });

  it("reports connected summary and saved-view counts", () => {
    const counts = getHoldSavedViewCounts(activeControlRoomSeed);
    const summary = getHoldWorkspaceSummary(activeControlRoomSeed);

    expect(counts).toEqual({
      all: 3,
      active: 3,
      expiring: 1,
      "payment-risk": 1,
      expired: 0,
    });
    expect(summary).toEqual({
      totalHolds: 3,
      activeHolds: 3,
      expiringHolds: 1,
      paymentRisk: 1,
      expiredHolds: 0,
      reservedUnits: 4,
    });
  });

  it("preserves exact variant context for variant holds", () => {
    const hold = activeControlRoomSeed.holds.find(
      (entry) => entry.id === "hold-tank",
    );
    if (!hold) throw new Error("Missing hold fixture");

    expect(toHoldWorkspaceItem(activeControlRoomSeed, hold)).toMatchObject({
      productName: "Ribbed Studio Tank",
      variantLabel: "Cream / S",
      productReference: "LS-RST-CRM-S",
      risk: "stable",
    });
  });
});

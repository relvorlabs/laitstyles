import { describe, expect, it } from "vitest";
import {
  defaultHoldQuery,
  getHoldSavedViewCounts,
  getHoldWorkspaceSummary,
  queryHolds,
  toHoldWorkspaceItem,
} from "@/features/admin/holds/hold-selectors";
import { activeAdminSeed } from "@/lib/admin/shared/admin-seed";
import type { AdminState } from "@/lib/admin/shared/types";

const holdsState: AdminState = {
  ...activeAdminSeed,
  holds: activeAdminSeed.holds.map((hold) => {
    if (hold.id === "hold-tank") {
      return { ...hold, source: "whatsapp" as const };
    }
    if (hold.id === "hold-tote") {
      return {
        ...hold,
        customerLabel: "Roqeebah Bello",
        source: "admin" as const,
        paymentProgress: "failed" as const,
      };
    }
    return hold;
  }),
};

describe("Holds workspace selectors", () => {
  it("sorts holds by release time by default", () => {
    expect(queryHolds(holdsState, defaultHoldQuery).map((hold) => hold.id)).toEqual([
      "hold-botanical",
      "hold-tank",
      "hold-tote",
    ]);
  });

  it("derives expiring and payment-risk views from the session clock", () => {
    expect(
      queryHolds(holdsState, {
        ...defaultHoldQuery,
        view: "expiring",
      }).map((hold) => hold.id),
    ).toEqual(["hold-botanical"]);

    expect(
      queryHolds(holdsState, {
        ...defaultHoldQuery,
        view: "payment-risk",
      }).map((hold) => hold.id),
    ).toEqual(["hold-tote"]);
  });

  it("searches customer and product context and filters assisted sources", () => {
    expect(
      queryHolds(holdsState, {
        ...defaultHoldQuery,
        search: "roqeebah canvas",
      }).map((hold) => hold.id),
    ).toEqual(["hold-tote"]);

    expect(
      queryHolds(holdsState, {
        ...defaultHoldQuery,
        source: "assisted",
      }).map((hold) => hold.id),
    ).toEqual(["hold-tank", "hold-tote"]);
  });

  it("reports connected summary and saved-view counts", () => {
    const counts = getHoldSavedViewCounts(holdsState);
    const summary = getHoldWorkspaceSummary(holdsState);

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
    const hold = holdsState.holds.find((entry) => entry.id === "hold-tank");
    if (!hold) throw new Error("Missing hold fixture");

    expect(toHoldWorkspaceItem(holdsState, hold)).toMatchObject({
      productName: "Ribbed Studio Tank",
      variantLabel: "Cream / S",
      productReference: "LS-RST-CRM-S",
      risk: "stable",
    });
  });
});

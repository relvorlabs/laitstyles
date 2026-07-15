import { describe, expect, it } from "vitest";
import {
  defaultReturnQuery,
  getEligibleReturnOrders,
  getEligibleReturnQuantity,
  getReturnSavedViewCounts,
  getReturnWorkspaceSummary,
  queryReturns,
} from "@/features/admin/returns/return-selectors";
import { applyCreateReturn, applyReturnTransition } from "@/lib/admin/return-actions";
import { activeAdminSeed } from "@/lib/admin/seed";

const now = "2026-07-09T17:45:00+01:00";

function idFactory() {
  let index = 0;
  return (prefix: string) => `${prefix}-returns-${++index}`;
}

function stateWithReturn() {
  const result = applyCreateReturn(
    activeAdminSeed,
    {
      orderId: "LS-20472",
      reason: "Fit did not work",
      note: "Customer returned the jeans in good condition.",
      lines: [{ orderLineId: "line-20472-1", quantity: 1 }],
    },
    now,
    idFactory(),
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value.state;
}

describe("Returns workspace selectors", () => {
  it("offers only delivered order lines with remaining eligible quantity", () => {
    const orders = getEligibleReturnOrders(activeAdminSeed);
    expect(orders.map((order) => order.id)).toEqual(["LS-20472"]);
    expect(getEligibleReturnQuantity(activeAdminSeed, orders[0]!, "line-20472-1")).toBe(1);
  });

  it("queries and summarizes connected return records", () => {
    const state = stateWithReturn();
    const records = queryReturns(state, defaultReturnQuery);
    const counts = getReturnSavedViewCounts(state);
    const summary = getReturnWorkspaceSummary(state);

    expect(records).toHaveLength(1);
    expect(records[0]?.orderId).toBe("LS-20472");
    expect(counts).toMatchObject({ all: 1, open: 1, "awaiting-item": 1 });
    expect(summary).toEqual({
      totalReturns: 1,
      openReturns: 1,
      awaitingItem: 1,
      inspecting: 0,
      refundValue: 27500,
    });
  });

  it("moves records into inspection and resolved views", () => {
    const opened = stateWithReturn();
    const returnId = opened.returns?.[0]?.id;
    if (!returnId) throw new Error("Missing return fixture");

    const approved = applyReturnTransition(opened, returnId, "approved", now, idFactory());
    if (!approved.ok) throw new Error(approved.error.message);
    const received = applyReturnTransition(
      approved.value.state,
      returnId,
      "received",
      now,
      idFactory(),
    );
    if (!received.ok) throw new Error(received.error.message);

    expect(
      queryReturns(received.value.state, {
        ...defaultReturnQuery,
        view: "inspection",
      }),
    ).toHaveLength(1);

    const inspecting = applyReturnTransition(
      received.value.state,
      returnId,
      "inspecting",
      now,
      idFactory(),
    );
    if (!inspecting.ok) throw new Error(inspecting.error.message);
    const restocked = applyReturnTransition(
      inspecting.value.state,
      returnId,
      "restocked",
      now,
      idFactory(),
    );
    if (!restocked.ok) throw new Error(restocked.error.message);

    expect(
      queryReturns(restocked.value.state, {
        ...defaultReturnQuery,
        view: "resolved",
      }),
    ).toHaveLength(1);
  });
});

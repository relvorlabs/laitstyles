import { describe, expect, it } from "vitest";
import { mapDatabaseOrderStatus } from "@/modules/orders/server/mappers";

type StatusRow = Parameters<typeof mapDatabaseOrderStatus>[0];

describe("mapDatabaseOrderStatus", () => {
  it("restores out-for-delivery from the latest persisted timeline event", () => {
    const row = {
      payment_status: "paid",
      fulfilment_status: "dispatched",
      fulfilment_method: "delivery",
      order_timeline_events: [
        { status: "dispatched" },
        { status: "out-for-delivery" },
      ],
    } as unknown as StatusRow;

    expect(mapDatabaseOrderStatus(row)).toBe("out-for-delivery");
  });

  it("keeps terminal database states authoritative over stale timeline events", () => {
    const row = {
      payment_status: "paid",
      fulfilment_status: "delivered",
      fulfilment_method: "delivery",
      order_timeline_events: [{ status: "out-for-delivery" }],
    } as unknown as StatusRow;

    expect(mapDatabaseOrderStatus(row)).toBe("delivered");
  });
});

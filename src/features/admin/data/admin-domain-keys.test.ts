import { describe, expect, it } from "vitest";
import { overviewKeys } from "@/features/admin/overview/data/overview-keys";
import { customerKeys } from "@/features/control-room/customers/data/customer-keys";
import { holdKeys } from "@/features/control-room/holds/data/hold-keys";
import { orderKeys } from "@/features/control-room/orders/data/order-keys";
import { returnKeys } from "@/features/control-room/returns/data/return-keys";
import { settingsKeys } from "@/features/control-room/settings/data/settings-keys";

describe("Admin domain query keys", () => {
  it("scopes list and detail keys under a stable domain root", () => {
    expect(orderKeys.list()).toEqual(["orders", "list"]);
    expect(holdKeys.list()).toEqual(["holds", "list"]);
    expect(returnKeys.list()).toEqual(["returns", "list"]);
    expect(customerKeys.list()).toEqual(["customers", "list"]);
    expect(settingsKeys.detail()).toEqual(["settings", "detail"]);
    expect(overviewKeys.summary()).toEqual(["overview", "summary"]);
  });

  it("uses trimmed business IDs for detail keys", () => {
    expect(orderKeys.detail(" ORD-1001 ")).toEqual(["orders", "detail", "ORD-1001"]);
    expect(holdKeys.detail(" HLD-22 ")).toEqual(["holds", "detail", "HLD-22"]);
    expect(returnKeys.detail(" RET-9 ")).toEqual(["returns", "detail", "RET-9"]);
    expect(customerKeys.detail(" cus-7 ")).toEqual(["customers", "detail", "cus-7"]);
  });

  it("keeps domain roots distinct so invalidation cannot collide", () => {
    const roots = [
      orderKeys.all[0],
      holdKeys.all[0],
      returnKeys.all[0],
      customerKeys.all[0],
      settingsKeys.all[0],
      overviewKeys.all[0],
    ];

    expect(new Set(roots).size).toBe(roots.length);
  });
});

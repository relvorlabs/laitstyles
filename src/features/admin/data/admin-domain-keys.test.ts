import { describe, expect, it } from "vitest";
import { customerKeys } from "@/modules/customers/client/keys";
import { holdKeys } from "@/modules/holds/client/keys";
import { orderKeys } from "@/modules/orders/client/keys";
import { overviewKeys } from "@/modules/overview/client/keys";
import { returnKeys } from "@/modules/returns/client/keys";
import { settingsKeys } from "@/modules/settings/client/keys";

describe("Admin domain query keys", () => {
  it("scopes list and detail keys under a stable domain root", () => {
    expect(orderKeys.lists()).toEqual(["admin", "orders", "list"]);
    expect(holdKeys.lists()).toEqual(["holds", "list"]);
    expect(returnKeys.lists()).toEqual(["admin", "returns", "list"]);
    expect(customerKeys.lists()).toEqual(["admin", "customers", "list"]);
    expect(settingsKeys.detail()).toEqual(["admin", "settings", "detail"]);
    expect(overviewKeys.detail()).toEqual(["admin", "overview", "detail"]);
  });

  it("uses the owning module's detail-key normalization contract", () => {
    expect(orderKeys.detail(" ORD-1001 ")).toEqual(["admin", "orders", "detail", "ORD-1001"]);
    expect(holdKeys.detail("HLD-22")).toEqual(["holds", "detail", "HLD-22"]);
    expect(returnKeys.detail("RET-9")).toEqual(["admin", "returns", "detail", "RET-9"]);
    expect(customerKeys.detail("cus-7")).toEqual(["admin", "customers", "detail", "cus-7"]);
  });

  it("keeps domain roots distinct so invalidation cannot collide", () => {
    const roots = [
      orderKeys.all.join(":"),
      holdKeys.all.join(":"),
      returnKeys.all.join(":"),
      customerKeys.all.join(":"),
      settingsKeys.all.join(":"),
      overviewKeys.all.join(":"),
    ];

    expect(new Set(roots).size).toBe(roots.length);
  });
});

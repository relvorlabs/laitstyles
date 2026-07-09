import { describe, expect, it } from "vitest";
import { defaultHoldQuery } from "@/features/control-room/holds/hold-selectors";
import { buildHoldsHref } from "@/features/control-room/holds/holds-url";

describe("Holds URL state", () => {
  it("omits default values", () => {
    expect(
      buildHoldsHref("/admin/holds", {
        query: defaultHoldQuery,
        holdId: null,
      }),
    ).toBe("/admin/holds");
  });

  it("serializes views, filters and the open hold", () => {
    expect(
      buildHoldsHref("/admin/holds", {
        query: {
          view: "payment-risk",
          search: "Roqeebah sage",
          source: "assisted",
          stage: "payment",
          sort: "expiry-desc",
        },
        holdId: "hold-sage",
      }),
    ).toBe(
      "/admin/holds?view=payment-risk&q=Roqeebah+sage&source=assisted&stage=payment&sort=expiry-desc&hold=hold-sage",
    );
  });
});

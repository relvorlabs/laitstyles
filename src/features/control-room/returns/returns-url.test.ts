import { describe, expect, it } from "vitest";
import { buildReturnsHref } from "@/features/control-room/returns/returns-url";
import { defaultReturnQuery } from "@/features/control-room/returns/return-selectors";

describe("Returns URL state", () => {
  it("keeps the default workspace URL clean", () => {
    expect(
      buildReturnsHref("/admin/returns", {
        query: defaultReturnQuery,
        returnId: null,
      }),
    ).toBe("/admin/returns");
  });

  it("serializes filters, search and an open return", () => {
    expect(
      buildReturnsHref("/admin/returns", {
        query: {
          view: "inspection",
          search: "botanical jeans",
          status: "received",
          sort: "value-desc",
        },
        returnId: "return-42",
      }),
    ).toBe(
      "/admin/returns?view=inspection&q=botanical+jeans&status=received&sort=value-desc&return=return-42",
    );
  });
});

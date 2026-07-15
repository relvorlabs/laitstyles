import { describe, expect, it } from "vitest";
import { defaultReturnQuery } from "@/features/admin/returns/return-selectors";
import { buildReturnsHref } from "@/features/admin/returns/returns-url";

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

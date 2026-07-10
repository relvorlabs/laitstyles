import { describe, expect, it } from "vitest";
import { defaultCustomerQuery } from "@/features/control-room/customers/customer-selectors";
import { buildCustomersHref } from "@/features/control-room/customers/customers-url";

describe("Customers workspace URL state", () => {
  it("keeps the default workspace URL clean", () => {
    expect(
      buildCustomersHref("/admin/customers", {
        query: defaultCustomerQuery,
        customerId: null,
      }),
    ).toBe("/admin/customers");
  });

  it("serializes filters and the open customer", () => {
    expect(
      buildCustomersHref("/admin/customers", {
        query: {
          search: "Amara jeans",
          view: "returning",
          type: "individual",
          sort: "recent-desc",
        },
        customerId: "customer-amara",
      }),
    ).toBe(
      "/admin/customers?view=returning&q=Amara+jeans&type=individual&sort=recent-desc&customer=customer-amara",
    );
  });
});
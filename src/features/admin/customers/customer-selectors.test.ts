import { describe, expect, it } from "vitest";
import {
  defaultCustomerQuery,
  getCustomerSavedViewCounts,
  getCustomerWorkspaceSummary,
  queryCustomers,
} from "@/features/admin/customers/customer-selectors";
import { createAdminStore } from "@/features/admin/state/admin-store";
import { activeAdminSeed } from "@/lib/admin/seed";

function getState() {
  return createAdminStore(activeAdminSeed).getSnapshot();
}

describe("Customers workspace selectors", () => {
  it("sorts customers by connected spend by default", () => {
    const customers = queryCustomers(getState(), defaultCustomerQuery);

    expect(customers.map((profile) => profile.customer.id)).toEqual([
      "customer-amara",
      "customer-nneka",
      "customer-tomi",
      "customer-musa",
    ]);
  });

  it("searches customer, address and product context", () => {
    const state = getState();

    expect(
      queryCustomers(state, {
        ...defaultCustomerQuery,
        search: "Amara botanical",
      }).map((profile) => profile.customer.id),
    ).toEqual(["customer-amara"]);

    expect(
      queryCustomers(state, {
        ...defaultCustomerQuery,
        search: "Independence ribbed",
      }).map((profile) => profile.customer.id),
    ).toEqual(["customer-nneka"]);
  });

  it("filters operational views and customer types", () => {
    const state = getState();

    expect(
      queryCustomers(state, {
        ...defaultCustomerQuery,
        view: "needs-attention",
      }).map((profile) => profile.customer.id),
    ).toEqual(["customer-amara", "customer-nneka"]);

    expect(
      queryCustomers(state, {
        ...defaultCustomerQuery,
        type: "stylist",
      }).map((profile) => profile.customer.id),
    ).toEqual(["customer-tomi"]);
  });

  it("reports connected view counts and workspace summary", () => {
    const state = getState();
    const profiles = queryCustomers(state, defaultCustomerQuery);
    const counts = getCustomerSavedViewCounts(profiles);
    const summary = getCustomerWorkspaceSummary(state);

    expect(counts).toEqual({
      all: 4,
      "needs-attention": 2,
      returning: 2,
      "high-value": 1,
      new: 2,
    });
    expect(summary).toEqual({
      totalCustomers: 4,
      relationshipValue: 156500,
      needsAttention: 2,
      returningCustomers: 2,
      activeHolds: 2,
    });
  });
});

import type {
  CustomerRelationshipProfile,
  ControlRoomState,
} from "@/lib/control-room/types";
import { getCustomerRelationshipProfiles } from "@/lib/control-room/customer-selectors";
import type {
  CustomerQuery,
  CustomerSavedView,
  CustomerSavedViewDefinition,
  CustomerSortKey,
  CustomerWorkspaceSummary,
} from "@/features/control-room/customers/customer-types";

export const customerSavedViews: CustomerSavedViewDefinition[] = [
  {
    value: "all",
    label: "All customers",
    description: "Every connected customer relationship.",
  },
  {
    value: "needs-attention",
    label: "Needs attention",
    description: "Payment, delivery, return or hold follow-up.",
    segment: "needs-attention",
  },
  {
    value: "returning",
    label: "Returning",
    description: "Customers with at least 2 connected orders.",
    segment: "returning",
  },
  {
    value: "high-value",
    label: "High value",
    description: "At least ₦50,000 in net paid spend.",
    segment: "high-value",
  },
  {
    value: "new",
    label: "New",
    description: "Fewer than 2 connected orders.",
    segment: "new",
  },
];

export const customerSortOptions: Array<{
  value: CustomerSortKey;
  label: string;
}> = [
  { value: "spend-desc", label: "Highest spend" },
  { value: "recent-desc", label: "Most recent purchase" },
  { value: "orders-desc", label: "Most orders" },
  { value: "name-asc", label: "Name A–Z" },
];

export const defaultCustomerQuery: CustomerQuery = {
  search: "",
  view: "all",
  type: "all",
  sort: "spend-desc",
};

export function queryCustomers(
  state: ControlRoomState,
  query: CustomerQuery,
): CustomerRelationshipProfile[] {
  const productNames = new Map(
    state.products.map((product) => [product.id, product.name]),
  );
  const searchTerms = query.search
    .trim()
    .toLocaleLowerCase("en-NG")
    .split(/\s+/)
    .filter(Boolean);

  return getCustomerRelationshipProfiles(state)
    .filter((profile) => matchesView(profile, query.view))
    .filter(
      (profile) =>
        query.type === "all" ||
        (profile.customer.type ?? "individual") === query.type,
    )
    .filter((profile) => {
      if (!searchTerms.length) return true;
      const haystack = buildSearchText(profile, productNames);
      return searchTerms.every((term) => haystack.includes(term));
    })
    .toSorted((left, right) => compareProfiles(left, right, query.sort));
}

export function getCustomerSavedViewCounts(
  profiles: CustomerRelationshipProfile[],
): Record<CustomerSavedView, number> {
  return {
    all: profiles.length,
    "needs-attention": profiles.filter((profile) =>
      profile.segments.includes("needs-attention"),
    ).length,
    returning: profiles.filter((profile) =>
      profile.segments.includes("returning"),
    ).length,
    "high-value": profiles.filter((profile) =>
      profile.segments.includes("high-value"),
    ).length,
    new: profiles.filter((profile) => profile.segments.includes("new")).length,
  };
}

export function getCustomerWorkspaceSummary(
  state: ControlRoomState,
): CustomerWorkspaceSummary {
  const profiles = getCustomerRelationshipProfiles(state);
  return {
    totalCustomers: profiles.length,
    relationshipValue: profiles.reduce(
      (total, profile) => total + profile.metrics.lifetimeSpend,
      0,
    ),
    needsAttention: profiles.filter((profile) => profile.attention.length > 0)
      .length,
    returningCustomers: profiles.filter((profile) =>
      profile.segments.includes("returning"),
    ).length,
    activeHolds: profiles.reduce(
      (total, profile) => total + profile.metrics.activeHoldCount,
      0,
    ),
  };
}

function matchesView(
  profile: CustomerRelationshipProfile,
  view: CustomerSavedView,
) {
  return view === "all" || profile.segments.includes(view);
}

function buildSearchText(
  profile: CustomerRelationshipProfile,
  productNames: Map<string, string>,
) {
  const customer = profile.customer;
  const addresses = (customer.addresses ?? []).flatMap((address) => [
    address.label,
    address.line1,
    address.line2,
    address.city,
    address.state,
  ]);
  const products = profile.products.map(
    (relationship) => productNames.get(relationship.productId) ?? "",
  );

  return [
    customer.name,
    customer.email,
    customer.phone,
    customer.city,
    customer.type ?? "individual",
    ...addresses,
    ...products,
  ]
    .join(" ")
    .toLocaleLowerCase("en-NG");
}

function compareProfiles(
  left: CustomerRelationshipProfile,
  right: CustomerRelationshipProfile,
  sort: CustomerSortKey,
) {
  if (sort === "name-asc") {
    return left.customer.name.localeCompare(right.customer.name, "en-NG");
  }
  if (sort === "orders-desc") {
    return (
      right.metrics.orderCount - left.metrics.orderCount ||
      right.metrics.lifetimeSpend - left.metrics.lifetimeSpend
    );
  }
  if (sort === "recent-desc") {
    return (
      toTimestamp(right.metrics.lastPurchaseAt ?? right.customer.createdAt) -
      toTimestamp(left.metrics.lastPurchaseAt ?? left.customer.createdAt)
    );
  }
  return (
    right.metrics.lifetimeSpend - left.metrics.lifetimeSpend ||
    right.metrics.orderCount - left.metrics.orderCount
  );
}

function toTimestamp(value: string | null | undefined) {
  return value ? Date.parse(value) : 0;
}
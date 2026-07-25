import type {
  CustomerQuery,
  CustomerSavedViewDefinition,
  CustomerSortKey,
} from "@/features/admin/customers/customer-types";

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
  },
  {
    value: "returning",
    label: "Returning",
    description: "Customers with at least 2 connected orders.",
  },
  {
    value: "high-value",
    label: "High value",
    description: "At least ₦50,000 in net paid spend.",
  },
  {
    value: "new",
    label: "New",
    description: "Fewer than 2 connected orders.",
  },
];

export const customerSortOptions: Array<{ value: CustomerSortKey; label: string }> = [
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
  page: 1,
  pageSize: 25,
};

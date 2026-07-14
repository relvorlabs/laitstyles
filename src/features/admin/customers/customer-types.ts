import type {
  CustomerAttentionReason,
  CustomerSegment,
  CustomerType,
} from "@/lib/control-room/customer-types";

export type CustomerSavedView = "all" | "needs-attention" | "returning" | "high-value" | "new";

export type CustomerTypeFilter = "all" | CustomerType;

export type CustomerSortKey = "spend-desc" | "recent-desc" | "orders-desc" | "name-asc";

export type CustomerQuery = {
  search: string;
  view: CustomerSavedView;
  type: CustomerTypeFilter;
  sort: CustomerSortKey;
};

export type CustomerWorkspaceSummary = {
  totalCustomers: number;
  relationshipValue: number;
  needsAttention: number;
  returningCustomers: number;
  activeHolds: number;
};

export type CustomerActionFeedback = {
  tone: "success" | "error";
  title: string;
  message: string;
};

export type CustomerDetailTab = "overview" | "timeline" | "products" | "delivery";

export type CustomerSavedViewDefinition = {
  value: CustomerSavedView;
  label: string;
  description: string;
  segment?: CustomerSegment;
  attention?: CustomerAttentionReason;
};

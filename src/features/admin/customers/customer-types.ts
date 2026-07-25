import type { CustomerListInput } from "@/modules/customers/types";

export type {
  CustomerAttentionReason,
  CustomerSavedView,
  CustomerSegment,
  CustomerSortKey,
  CustomerType,
  CustomerWorkspaceSummary,
} from "@/modules/customers/types";

export type CustomerQuery = CustomerListInput;
export type CustomerTypeFilter = CustomerListInput["type"];

export type CustomerActionFeedback = {
  tone: "success" | "error";
  title: string;
  message: string;
};

export type CustomerDetailTab = "overview" | "timeline" | "products" | "delivery";

export type CustomerSavedViewDefinition = {
  value: CustomerListInput["view"];
  label: string;
  description: string;
};

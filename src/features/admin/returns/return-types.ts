import type { ReturnStatus } from "@/lib/admin/types";

export type ReturnSavedView =
  | "all"
  | "open"
  | "awaiting-item"
  | "inspection"
  | "refund"
  | "resolved";

export type ReturnSortKey = "updated-desc" | "requested-desc" | "value-desc";

export type ReturnQuery = {
  view: ReturnSavedView;
  search: string;
  status: ReturnStatus | "all";
  sort: ReturnSortKey;
};

export type ReturnWorkspaceItem = {
  returnId: string;
  orderId: string;
  customerName: string;
  productNames: string[];
  quantity: number;
  status: ReturnStatus;
  refundAmount: number;
  requestedAt: string;
  updatedAt: string;
};

export type ReturnWorkspaceSummary = {
  totalReturns: number;
  openReturns: number;
  awaitingItem: number;
  inspecting: number;
  refundValue: number;
};

export type ReturnActionFeedback = {
  tone: "success" | "error";
  title: string;
  message: string;
};

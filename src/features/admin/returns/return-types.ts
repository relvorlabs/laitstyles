import type { ReturnListInput, ReturnStatus } from "@/modules/returns/types";

export type {
  ReturnSavedView,
  ReturnSavedViewCounts,
  ReturnSortKey,
  ReturnStatus,
  ReturnWorkspaceSummary,
} from "@/modules/returns/types";

export type ReturnQuery = ReturnListInput;

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

export type ReturnActionFeedback = {
  tone: "success" | "error";
  title: string;
  message: string;
};

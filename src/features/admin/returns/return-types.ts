import type {
  ReturnListInput,
  ReturnSavedView,
  ReturnSortKey,
  ReturnStatus,
} from "@/modules/returns/types";

export type { ReturnSavedView, ReturnSortKey, ReturnStatus } from "@/modules/returns/types";

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

export type ReturnQueryValues = {
  views: readonly ReturnSavedView[];
  sorts: readonly ReturnSortKey[];
};

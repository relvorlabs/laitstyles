import type {
  ReturnQuery,
  ReturnSavedView,
  ReturnWorkspaceItem,
} from "@/features/admin/returns/return-types";
import type { ControlRoomReturn, ReturnStatus } from "@/modules/returns/types";

export const defaultReturnQuery: ReturnQuery = {
  view: "all",
  search: "",
  status: "all",
  sort: "updated-desc",
  page: 1,
  pageSize: 25,
};

export const returnSavedViews: Array<{ value: ReturnSavedView; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "awaiting-item", label: "Awaiting item" },
  { value: "inspection", label: "Inspection" },
  { value: "refund", label: "Refund" },
  { value: "resolved", label: "Resolved" },
];

export const returnStatuses: ReturnStatus[] = [
  "requested",
  "approved",
  "received",
  "inspecting",
  "refunded",
  "restocked",
  "damaged",
  "rejected",
  "closed",
];

export const returnSortOptions: Array<{ value: ReturnQuery["sort"]; label: string }> = [
  { value: "updated-desc", label: "Recently updated" },
  { value: "requested-desc", label: "Newest request" },
  { value: "value-desc", label: "Highest value" },
];

const returnTransitionMap = {
  requested: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["inspecting"],
  inspecting: ["refunded", "restocked", "damaged"],
  refunded: ["restocked", "damaged", "closed"],
  restocked: ["closed"],
  damaged: ["closed"],
  rejected: ["closed"],
  closed: [],
} as const satisfies Record<ReturnStatus, readonly ReturnStatus[]>;

export function getPermittedReturnTransitions(status: ReturnStatus) {
  return returnTransitionMap[status] as readonly ReturnStatus[];
}

export function toReturnWorkspaceItem(record: ControlRoomReturn): ReturnWorkspaceItem {
  return {
    returnId: record.id,
    orderId: record.orderId,
    customerName: record.customerName,
    productNames: record.lines.map((line) =>
      line.variantLabel ? `${line.productName} · ${line.variantLabel}` : line.productName,
    ),
    quantity: record.lines.reduce((total, line) => total + line.quantity, 0),
    status: record.status,
    refundAmount: record.refundAmount,
    requestedAt: record.requestedAt,
    updatedAt: record.updatedAt,
  };
}

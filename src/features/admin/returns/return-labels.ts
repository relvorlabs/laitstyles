import type { ReturnStatus } from "@/modules/returns/types";

export const returnStatusLabels: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  received: "Received",
  inspecting: "Inspecting",
  refunded: "Refund recorded",
  restocked: "Restocked",
  damaged: "Damaged",
  rejected: "Rejected",
  closed: "Closed",
};

export function getReturnStatusTone(status: ReturnStatus) {
  if (status === "rejected" || status === "damaged") return "destructive" as const;
  if (status === "restocked" || status === "closed") return "secondary" as const;
  return "outline" as const;
}

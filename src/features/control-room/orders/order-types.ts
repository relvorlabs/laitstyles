import type { PaymentStatus, SalesChannel } from "@/lib/control-room/types";

export type OrderSavedView =
  | "all"
  | "needs-attention"
  | "pending-payment"
  | "fulfilment"
  | "delivered"
  | "closed";

export type OrderChannelFilter = "all" | "online" | "offline";
export type OrderPaymentFilter = PaymentStatus | "all";
export type OrderSortKey = "placed-desc" | "placed-asc" | "total-desc" | "total-asc";

export type OrderQuery = {
  view: OrderSavedView;
  search: string;
  channel: OrderChannelFilter;
  payment: OrderPaymentFilter;
  sort: OrderSortKey;
};

export type OrderWorkspaceItem = {
  orderId: string;
  customerName: string;
  customerCity: string;
  productNames: string[];
  unitCount: number;
  netRevenue: number;
  channel: SalesChannel;
  needsAttention: boolean;
};

export type OrderWorkspaceSummary = {
  totalOrders: number;
  needsAttention: number;
  pendingPayment: number;
  inFulfilment: number;
  delivered: number;
  netRevenue: number;
};

import type {
  OrderChannelFilter,
  OrderListInput,
  OrderPaymentFilter,
  OrderSavedView,
  OrderSortKey,
  OrderWorkspaceSummary,
  SalesChannel,
} from "@/modules/orders/types";

export type {
  OrderChannelFilter,
  OrderPaymentFilter,
  OrderSavedView,
  OrderSortKey,
  OrderWorkspaceSummary,
};

export type OrderQuery = OrderListInput;

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

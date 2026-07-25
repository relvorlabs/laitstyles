import type {
  AdminActivity,
  AttentionItem,
  ContinueTask,
  FulfilmentLaneItem,
  SalesPulsePoint,
} from "@/lib/admin/shared/types";
import type { ControlRoomOrder } from "@/modules/orders/types";

export type OverviewInventoryItem = {
  id: string;
  name: string;
  image: string;
  imageAlt: string;
  inventoryMode: "unique" | "stocked" | "variant";
  variantCount: number;
  lifecycle: string;
  publication: string;
  lowStockThreshold: number;
  available: number;
  reserved: number;
};

export type OverviewOpenOrder = {
  order: ControlRoomOrder;
  customerName: string;
  productName: string;
  productImage: string | null;
  productImageAlt: string;
};

export type OverviewSnapshot = {
  revenue: { total: number; online: number; offline: number };
  ordersToday: number;
  unitsSoldToday: number;
  activeHolds: number;
  attention: AttentionItem[];
  fulfilment: FulfilmentLaneItem[];
  lowStockProducts: OverviewInventoryItem[];
  lowStockCount: number;
  unpublishedProducts: OverviewInventoryItem[];
  unpublishedCount: number;
  recentActivities: AdminActivity[];
  continueTask?: ContinueTask;
};

export type OverviewData = {
  reportingDate: string;
  asOf: string;
  snapshot: OverviewSnapshot;
  salesPulse: SalesPulsePoint[];
  openOrders: OverviewOpenOrder[];
};

import type { HoldSource, HoldStage, HoldStatus } from "@/lib/control-room/types";

export type HoldSavedView = "all" | "active" | "expiring" | "payment-risk" | "expired";

export type HoldSourceFilter = "all" | "storefront" | "assisted";
export type HoldStageFilter = HoldStage | "all";
export type HoldSortKey = "expiry-asc" | "expiry-desc" | "started-desc" | "quantity-desc";

export type HoldQuery = {
  view: HoldSavedView;
  search: string;
  source: HoldSourceFilter;
  stage: HoldStageFilter;
  sort: HoldSortKey;
};

export type HoldWorkspaceRisk =
  | "stable"
  | "expiring"
  | "payment-risk"
  | "expired"
  | "released"
  | "converted";

export type HoldWorkspaceItem = {
  holdId: string;
  productName: string;
  variantLabel: string | null;
  productReference: string;
  imageUrl: string;
  imageAlt: string;
  customerName: string;
  risk: HoldWorkspaceRisk;
  status: HoldStatus;
  source: HoldSource;
  secondsRemaining: number;
  expiresAt: string;
};

export type HoldWorkspaceSummary = {
  totalHolds: number;
  activeHolds: number;
  expiringHolds: number;
  paymentRisk: number;
  expiredHolds: number;
  reservedUnits: number;
};

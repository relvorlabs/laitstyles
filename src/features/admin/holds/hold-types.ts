export type {
  HoldListInput as HoldQuery,
  HoldRisk as HoldWorkspaceRisk,
  HoldSavedView,
  HoldSortKey,
  HoldSourceFilter,
  HoldStageFilter,
  HoldWorkspaceSummary,
} from "@/modules/holds/types";

export type HoldWorkspaceItem = {
  holdId: string;
  productName: string;
  variantLabel: string | null;
  productReference: string;
  imageUrl: string;
  imageAlt: string;
  customerName: string;
  risk: import("@/modules/holds/types").HoldRisk;
  status: import("@/modules/holds/types").HoldStatus;
  source: import("@/modules/holds/types").HoldSource;
  secondsRemaining: number;
  expiresAt: string;
};

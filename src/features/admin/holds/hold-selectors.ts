import type {
  HoldQuery,
  HoldSavedView,
  HoldWorkspaceItem,
} from "@/features/admin/holds/hold-types";
import type { ControlRoomHold } from "@/modules/holds/types";

export const defaultHoldQuery: HoldQuery = {
  view: "all",
  search: "",
  source: "all",
  stage: "all",
  sort: "expiry-asc",
  page: 1,
  pageSize: 25,
};

export const holdSavedViews: Array<{
  value: HoldSavedView;
  label: string;
  description: string;
}> = [
  { value: "all", label: "All", description: "Every persisted hold." },
  {
    value: "active",
    label: "Active",
    description: "Current reservations with time remaining.",
  },
  {
    value: "expiring",
    label: "Expiring",
    description: "Active holds releasing within five minutes.",
  },
  {
    value: "payment-risk",
    label: "Payment risk",
    description: "Active holds with failed payment progress.",
  },
  {
    value: "expired",
    label: "Expired",
    description: "Reservations whose time has elapsed.",
  },
];

export const holdSortOptions: Array<{
  value: HoldQuery["sort"];
  label: string;
}> = [
  { value: "expiry-asc", label: "Releasing soonest" },
  { value: "expiry-desc", label: "Releasing latest" },
  { value: "started-desc", label: "Newest hold" },
  { value: "quantity-desc", label: "Highest quantity" },
];

export function toHoldWorkspaceItem(hold: ControlRoomHold): HoldWorkspaceItem {
  return {
    holdId: hold.id,
    productName: hold.product.name,
    variantLabel: hold.product.variantLabel,
    productReference: hold.product.reference,
    imageUrl: hold.product.imageUrl,
    imageAlt: hold.product.imageAlt,
    customerName: hold.customerLabel,
    risk: hold.risk,
    status: hold.status,
    source: hold.source,
    secondsRemaining: hold.secondsRemaining,
    expiresAt: hold.expiresAt,
  };
}

export function formatHoldCountdown(seconds: number) {
  if (seconds <= 0) return "Expired";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

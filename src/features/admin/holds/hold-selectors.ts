import type {
  HoldQuery,
  HoldSavedView,
  HoldWorkspaceItem,
  HoldWorkspaceRisk,
  HoldWorkspaceSummary,
} from "@/features/admin/holds/hold-types";
import { getProductCover, getProductReference } from "@/lib/admin/inventory/inventory-selectors";
import { getHoldRisk, isHoldActive } from "@/lib/admin/orders/sales-selectors";
import type { AdminState, ControlRoomHold } from "@/lib/admin/shared/types";

export const defaultHoldQuery: HoldQuery = {
  view: "all",
  search: "",
  source: "all",
  stage: "all",
  sort: "expiry-asc",
};

export const holdSavedViews: Array<{
  value: HoldSavedView;
  label: string;
  description: string;
}> = [
  { value: "all", label: "All", description: "Every hold in this session." },
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

export function queryHolds(state: AdminState, query: HoldQuery): ControlRoomHold[] {
  const normalizedSearch = normalize(query.search);

  return state.holds
    .filter((hold) => matchesSavedView(state, hold, query.view))
    .filter((hold) => {
      if (query.source === "all") return true;
      return query.source === "storefront"
        ? hold.source === "storefront"
        : hold.source !== "storefront";
    })
    .filter((hold) => query.stage === "all" || hold.stage === query.stage)
    .filter((hold) => matchesSearch(state, hold, normalizedSearch))
    .toSorted((left, right) => compareHolds(left, right, query.sort));
}

export function getHoldSavedViewCounts(state: AdminState): Record<HoldSavedView, number> {
  return Object.fromEntries(
    holdSavedViews.map((view) => [
      view.value,
      state.holds.filter((hold) => matchesSavedView(state, hold, view.value)).length,
    ]),
  ) as Record<HoldSavedView, number>;
}

export function getHoldWorkspaceSummary(state: AdminState): HoldWorkspaceSummary {
  const items = state.holds.map((hold) => toHoldWorkspaceItem(state, hold));

  return {
    totalHolds: items.length,
    activeHolds: state.holds.filter((hold) => isHoldActive(hold, state.asOf)).length,
    expiringHolds: items.filter((item) => item.risk === "expiring").length,
    paymentRisk: items.filter((item) => item.risk === "payment-risk").length,
    expiredHolds: items.filter((item) => item.risk === "expired").length,
    reservedUnits: state.holds
      .filter((hold) => isHoldActive(hold, state.asOf))
      .reduce((total, hold) => total + hold.quantity, 0),
  };
}

export function toHoldWorkspaceItem(state: AdminState, hold: ControlRoomHold): HoldWorkspaceItem {
  const product = state.products.find((entry) => entry.id === hold.productId);
  if (!product) {
    return {
      holdId: hold.id,
      productName: "Missing product",
      variantLabel: null,
      productReference: "Unavailable",
      imageUrl: "/placeholder.svg",
      imageAlt: "Missing product",
      customerName: hold.customerLabel,
      risk: getOperationalRisk(state, hold),
      status: hold.status ?? "active",
      source: hold.source,
      secondsRemaining: getSecondsRemaining(state.asOf, hold.expiresAt),
      expiresAt: hold.expiresAt,
    };
  }

  const cover = getProductCover(product);
  const variant =
    product.inventoryMode === "variant"
      ? product.variants.find((entry) => entry.id === hold.variantId)
      : undefined;

  return {
    holdId: hold.id,
    productName: product.name,
    variantLabel: variant?.label ?? null,
    productReference: variant?.sku ?? getProductReference(product),
    imageUrl: variant?.imageUrl ?? cover.url,
    imageAlt: cover.alt || product.name,
    customerName: hold.customerLabel,
    risk: getOperationalRisk(state, hold),
    status: hold.status ?? "active",
    source: hold.source,
    secondsRemaining: getSecondsRemaining(state.asOf, hold.expiresAt),
    expiresAt: hold.expiresAt,
  };
}

export function matchesSavedView(state: AdminState, hold: ControlRoomHold, view: HoldSavedView) {
  const status = hold.status ?? "active";
  const risk = getOperationalRisk(state, hold);

  switch (view) {
    case "all":
      return true;
    case "active":
      return status === "active" && risk !== "expired";
    case "expiring":
      return risk === "expiring";
    case "payment-risk":
      return risk === "payment-risk";
    case "expired":
      return risk === "expired";
  }
}

export function formatHoldCountdown(seconds: number) {
  if (seconds <= 0) return "Expired";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getOperationalRisk(state: AdminState, hold: ControlRoomHold): HoldWorkspaceRisk {
  const status = hold.status ?? "active";
  if (status === "released") return "released";
  if (status === "converted") return "converted";
  if (status === "expired") return "expired";
  return getHoldRisk(hold, state.asOf);
}

function getSecondsRemaining(asOf: string, expiresAt: string) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - new Date(asOf).getTime()) / 1000));
}

function matchesSearch(state: AdminState, hold: ControlRoomHold, normalizedSearch: string) {
  if (!normalizedSearch) return true;
  const item = toHoldWorkspaceItem(state, hold);
  const searchable = normalize(
    [
      hold.id,
      hold.customerLabel,
      item.productName,
      item.variantLabel ?? "",
      item.productReference,
      hold.source,
      hold.stage,
      hold.paymentProgress ?? "",
    ].join(" "),
  );

  return normalizedSearch.split(/\s+/).every((token) => searchable.includes(token));
}

function compareHolds(left: ControlRoomHold, right: ControlRoomHold, sort: HoldQuery["sort"]) {
  switch (sort) {
    case "expiry-asc":
      return new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime();
    case "expiry-desc":
      return new Date(right.expiresAt).getTime() - new Date(left.expiresAt).getTime();
    case "started-desc":
      return new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime();
    case "quantity-desc":
      return right.quantity - left.quantity || left.id.localeCompare(right.id);
  }
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-NG");
}

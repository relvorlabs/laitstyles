import type {
  ReturnQuery,
  ReturnSavedView,
  ReturnWorkspaceItem,
  ReturnWorkspaceSummary,
} from "@/features/admin/returns/return-types";
import { getReturnedQuantityForOrderLine } from "@/lib/admin/sales-selectors";
import type {
  AdminState,
  ControlRoomOrder,
  ControlRoomReturn,
  ReturnStatus,
} from "@/lib/admin/types";

export const defaultReturnQuery: ReturnQuery = {
  view: "all",
  search: "",
  status: "all",
  sort: "updated-desc",
};

export const returnSavedViews: Array<{
  value: ReturnSavedView;
  label: string;
}> = [
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

const resolvedStatuses = new Set<ReturnStatus>(["restocked", "damaged", "rejected", "closed"]);

export function queryReturns(state: AdminState, query: ReturnQuery) {
  const normalized = normalize(query.search);

  return (state.returns ?? [])
    .filter((record) => matchesView(record, query.view))
    .filter((record) => query.status === "all" || record.status === query.status)
    .filter((record) => matchesSearch(state, record, normalized))
    .toSorted((left, right) => compareReturns(left, right, query.sort));
}

export function getReturnSavedViewCounts(state: AdminState) {
  return Object.fromEntries(
    returnSavedViews.map((view) => [
      view.value,
      (state.returns ?? []).filter((record) => matchesView(record, view.value)).length,
    ]),
  ) as Record<ReturnSavedView, number>;
}

export function getReturnWorkspaceSummary(state: AdminState): ReturnWorkspaceSummary {
  const records = state.returns ?? [];
  return {
    totalReturns: records.length,
    openReturns: records.filter((record) => !resolvedStatuses.has(record.status)).length,
    awaitingItem: records.filter(
      (record) => record.status === "requested" || record.status === "approved",
    ).length,
    inspecting: records.filter(
      (record) => record.status === "received" || record.status === "inspecting",
    ).length,
    refundValue: records
      .filter((record) => record.status !== "rejected")
      .reduce((total, record) => total + record.refundAmount, 0),
  };
}

export function toReturnWorkspaceItem(
  state: AdminState,
  record: ControlRoomReturn,
): ReturnWorkspaceItem {
  const order = state.orders.find((entry) => entry.id === record.orderId);
  const customer = state.customers.find((entry) => entry.id === record.customerId);
  const productNames = record.lines.map((line) => {
    const product = state.products.find((entry) => entry.id === line.productId);
    if (!product) return "Missing product";
    if (product.inventoryMode !== "variant") return product.name;
    const variant = product.variants.find((entry) => entry.id === line.variantId);
    return variant ? `${product.name} · ${variant.label}` : product.name;
  });

  return {
    returnId: record.id,
    orderId: record.orderId,
    customerName: customer?.name ?? order?.customerLabel ?? "Guest customer",
    productNames,
    quantity: record.lines.reduce((total, line) => total + line.quantity, 0),
    status: record.status,
    refundAmount: record.refundAmount,
    requestedAt: record.requestedAt,
    updatedAt: record.updatedAt,
  };
}

export function getEligibleReturnOrders(state: AdminState) {
  return state.orders.filter(
    (order) =>
      order.fulfilmentStatus === "delivered" &&
      order.lines.some((line) => getEligibleReturnQuantity(state, order, line.id) > 0),
  );
}

export function getEligibleReturnQuantity(
  state: AdminState,
  order: ControlRoomOrder,
  orderLineId: string,
) {
  const line = order.lines.find((entry) => entry.id === orderLineId);
  if (!line) return 0;
  return Math.max(
    0,
    line.quantity - getReturnedQuantityForOrderLine(state.returns ?? [], order.id, orderLineId),
  );
}

function matchesView(record: ControlRoomReturn, view: ReturnSavedView) {
  switch (view) {
    case "all":
      return true;
    case "open":
      return !resolvedStatuses.has(record.status);
    case "awaiting-item":
      return record.status === "requested" || record.status === "approved";
    case "inspection":
      return record.status === "received" || record.status === "inspecting";
    case "refund":
      return record.status === "refunded";
    case "resolved":
      return resolvedStatuses.has(record.status);
  }
}

function matchesSearch(state: AdminState, record: ControlRoomReturn, normalized: string) {
  if (!normalized) return true;
  const item = toReturnWorkspaceItem(state, record);
  const searchable = normalize(
    [record.id, record.orderId, record.reason, item.customerName, ...item.productNames].join(" "),
  );
  return normalized.split(/\s+/).every((token) => searchable.includes(token));
}

function compareReturns(
  left: ControlRoomReturn,
  right: ControlRoomReturn,
  sort: ReturnQuery["sort"],
) {
  switch (sort) {
    case "updated-desc":
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    case "requested-desc":
      return new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime();
    case "value-desc":
      return right.refundAmount - left.refundAmount;
  }
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-NG");
}

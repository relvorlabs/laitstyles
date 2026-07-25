import type {
  OrderQuery,
  OrderSavedView,
  OrderWorkspaceItem,
  OrderWorkspaceSummary,
} from "@/features/admin/orders/order-types";
import type {
  ControlRoomOrder,
  OrderSavedViewCounts,
  OrderStatus,
} from "@/modules/orders/types";

export const defaultOrderQuery: OrderQuery = {
  view: "all",
  search: "",
  channel: "all",
  payment: "all",
  sort: "placed-desc",
  page: 1,
  pageSize: 25,
};

export const orderSavedViews: Array<{
  value: OrderSavedView;
  label: string;
  description: string;
}> = [
  { value: "all", label: "All", description: "Every persisted order." },
  {
    value: "needs-attention",
    label: "Needs attention",
    description: "Payment, packing, delivery or return follow-up.",
  },
  {
    value: "pending-payment",
    label: "Pending payment",
    description: "Orders that have not secured payment.",
  },
  {
    value: "fulfilment",
    label: "In fulfilment",
    description: "Paid orders moving through preparation and delivery.",
  },
  {
    value: "delivered",
    label: "Delivered",
    description: "Completed customer handoffs.",
  },
  {
    value: "closed",
    label: "Closed",
    description: "Cancelled, refunded or returned orders.",
  },
];

export const orderSortOptions: Array<{
  value: OrderQuery["sort"];
  label: string;
}> = [
  { value: "placed-desc", label: "Newest first" },
  { value: "placed-asc", label: "Oldest first" },
  { value: "total-desc", label: "Highest total" },
  { value: "total-asc", label: "Lowest total" },
];

const fulfilmentStatuses = new Set<OrderStatus>([
  "payment-confirmed",
  "preparing",
  "packed",
  "ready-for-pickup",
  "dispatched",
  "out-for-delivery",
]);
const closedStatuses = new Set<OrderStatus>(["cancelled", "refunded", "returned"]);

/** Compatibility helpers for focused tests and transitional consumers. */
export function queryOrders(orders: ControlRoomOrder[], query: OrderQuery): ControlRoomOrder[] {
  const normalizedSearch = normalize(query.search);
  return orders
    .filter((order) => matchesSavedView(order, query.view))
    .filter((order) => {
      if (query.channel === "all") return true;
      return query.channel === "online" ? order.channel === "online" : order.channel !== "online";
    })
    .filter((order) => query.payment === "all" || order.paymentStatus === query.payment)
    .filter((order) => matchesSearch(order, normalizedSearch))
    .toSorted((left, right) => compareOrders(left, right, query.sort));
}

export function getOrderSavedViewCounts(orders: ControlRoomOrder[]): OrderSavedViewCounts {
  return Object.fromEntries(
    orderSavedViews.map((view) => [
      view.value,
      orders.filter((order) => matchesSavedView(order, view.value)).length,
    ]),
  ) as OrderSavedViewCounts;
}

export function getOrderWorkspaceSummary(orders: ControlRoomOrder[]): OrderWorkspaceSummary {
  return {
    totalOrders: orders.length,
    needsAttention: orders.filter((order) => Boolean(order.attention)).length,
    pendingPayment: orders.filter((order) => order.fulfilmentStatus === "pending-payment").length,
    inFulfilment: orders.filter((order) => fulfilmentStatuses.has(order.fulfilmentStatus)).length,
    delivered: orders.filter((order) => order.fulfilmentStatus === "delivered").length,
    netRevenue: orders.reduce((total, order) => total + getOrderNetRevenue(order), 0),
  };
}

export function toOrderWorkspaceItem(order: ControlRoomOrder): OrderWorkspaceItem {
  return {
    orderId: order.id,
    customerName: order.customer?.name ?? order.customerLabel ?? "Guest customer",
    customerCity: order.customer?.city ?? order.deliveryCity,
    productNames: order.lines.map((line) => line.productName),
    unitCount: order.lines.reduce((total, line) => total + line.quantity, 0),
    netRevenue: getOrderNetRevenue(order),
    channel: order.channel,
    needsAttention: Boolean(order.attention),
  };
}

export function matchesSavedView(order: ControlRoomOrder, view: OrderSavedView) {
  switch (view) {
    case "all":
      return true;
    case "needs-attention":
      return Boolean(order.attention);
    case "pending-payment":
      return order.fulfilmentStatus === "pending-payment";
    case "fulfilment":
      return fulfilmentStatuses.has(order.fulfilmentStatus);
    case "delivered":
      return order.fulfilmentStatus === "delivered";
    case "closed":
      return closedStatuses.has(order.fulfilmentStatus);
  }
}

function getOrderNetRevenue(order: ControlRoomOrder) {
  const refundedAmount =
    order.refundedAmount ?? (order.paymentStatus === "refunded" ? order.total : 0);
  return Math.max(0, order.total - refundedAmount);
}

function matchesSearch(order: ControlRoomOrder, normalizedSearch: string) {
  if (!normalizedSearch) return true;
  const item = toOrderWorkspaceItem(order);
  const searchable = normalize(
    [
      order.id,
      item.customerName,
      item.customerCity,
      order.deliveryCity,
      order.channel,
      order.paymentStatus,
      order.fulfilmentStatus,
      ...item.productNames,
    ].join(" "),
  );
  return normalizedSearch.split(/\s+/).every((token) => searchable.includes(token));
}

function compareOrders(left: ControlRoomOrder, right: ControlRoomOrder, sort: OrderQuery["sort"]) {
  switch (sort) {
    case "placed-desc":
      return new Date(right.placedAt).getTime() - new Date(left.placedAt).getTime();
    case "placed-asc":
      return new Date(left.placedAt).getTime() - new Date(right.placedAt).getTime();
    case "total-desc":
      return right.total - left.total || left.id.localeCompare(right.id);
    case "total-asc":
      return left.total - right.total || left.id.localeCompare(right.id);
  }
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-NG");
}

import { getProductStock } from "@/lib/admin/inventory-selectors";
import {
  getActiveSalesHolds,
  getPaidOrders,
  getRevenueByChannel,
} from "@/lib/admin/sales-selectors";
import type {
  AttentionItem,
  ControlRoomHold,
  ControlRoomOrder,
  ControlRoomState,
  FulfilmentLaneItem,
  InventoryProduct,
  OverviewSnapshot,
} from "@/lib/admin/types";

export { getProductStock } from "@/lib/admin/inventory-selectors";

export function getCustomerName(state: ControlRoomState, customerId: string | null) {
  if (!customerId) return "Guest customer";
  return state.customers.find((customer) => customer.id === customerId)?.name ?? "Customer";
}

export function getProductName(state: ControlRoomState, productId: string) {
  return state.products.find((product) => product.id === productId)?.name ?? "Product";
}

export function getActiveHolds(state: ControlRoomState) {
  return getActiveSalesHolds(state);
}

export function getSecondsUntil(state: ControlRoomState, isoDate: string) {
  const difference = new Date(isoDate).getTime() - new Date(state.asOf).getTime();
  return Math.max(0, Math.floor(difference / 1000));
}

export function getOverviewSnapshot(state: ControlRoomState): OverviewSnapshot {
  const todaysOrders = state.orders.filter((order) =>
    order.placedAt.startsWith(state.reportingDate),
  );
  const paidOrders = getPaidOrders(todaysOrders);
  const revenue = getRevenueByChannel(todaysOrders);
  const activeHolds = getActiveHolds(state);

  const lowStockProducts = state.products
    .filter((product) => {
      const inventory = getProductStock(product);
      return (
        product.inventoryMode !== "unique" &&
        product.lifecycle === "active" &&
        inventory.available > 0 &&
        inventory.available <= product.lowStockThreshold
      );
    })
    .toSorted((left, right) => getProductStock(left).available - getProductStock(right).available);

  const unpublishedProducts = state.products.filter(
    (product) => product.publication !== "published" || product.lifecycle !== "active",
  );

  return {
    revenue,
    ordersToday: todaysOrders.length,
    unitsSoldToday: paidOrders.reduce(
      (total, order) =>
        total + order.lines.reduce((lineTotal, line) => lineTotal + line.quantity, 0),
      0,
    ),
    activeHolds: activeHolds.length,
    attention: buildAttentionItems(
      state,
      todaysOrders,
      activeHolds,
      lowStockProducts,
      unpublishedProducts,
    ),
    fulfilment: buildFulfilmentLane(state.orders),
    lowStockProducts,
    unpublishedProducts,
    recentActivities: state.activities
      .toSorted(
        (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
      )
      .slice(0, 5),
    continueTask: state.continueTasks[0],
  };
}

function buildFulfilmentLane(orders: ControlRoomOrder[]): FulfilmentLaneItem[] {
  const stages: FulfilmentLaneItem[] = [
    { status: "payment-confirmed", label: "Paid", count: 0 },
    { status: "preparing", label: "Preparing", count: 0 },
    { status: "packed", label: "Packed", count: 0 },
    { status: "dispatched", label: "Dispatched", count: 0 },
  ];

  return stages.map((stage) => ({
    ...stage,
    count: orders.filter((order) => order.fulfilmentStatus === stage.status).length,
  }));
}

function buildAttentionItems(
  state: ControlRoomState,
  todaysOrders: ControlRoomOrder[],
  activeHolds: ControlRoomState["holds"],
  lowStockProducts: InventoryProduct[],
  unpublishedProducts: InventoryProduct[],
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const order of todaysOrders) {
    if (order.paymentStatus === "failed") {
      items.push({
        id: `attention-payment-${order.id}`,
        tone: "critical",
        eyebrow: "Payment failed",
        title: `${order.id} needs customer follow-up`,
        detail: `${getCustomerName(state, order.customerId)} · ${order.deliveryCity}`,
        href: "#attention",
      });
      continue;
    }

    if (order.attention === "packing") {
      items.push({
        id: `attention-packing-${order.id}`,
        tone: "warning",
        eyebrow: "Packing queue",
        title: `${order.id} is paid but not packed`,
        detail: `${order.lines.length} line item${order.lines.length === 1 ? "" : "s"} · ${order.deliveryCity}`,
        href: "#fulfilment",
      });
    }
  }

  const deliveryException = state.orders.find((order) => order.attention === "delivery");
  if (deliveryException) {
    items.push({
      id: `attention-delivery-${deliveryException.id}`,
      tone: "warning",
      eyebrow: "Delivery update",
      title: `${deliveryException.id} needs waybill review`,
      detail: `Dispatched to ${deliveryException.deliveryCity}`,
      href: "#fulfilment",
    });
  }

  const expiringHold = findSoonestExpiringHold(state, activeHolds, 5 * 60);

  if (expiringHold) {
    items.push({
      id: `attention-hold-${expiringHold.hold.id}`,
      tone: "info",
      eyebrow: "Hold releasing soon",
      title: `${getProductName(state, expiringHold.hold.productId)} is still in checkout`,
      detail: `${expiringHold.hold.customerLabel} · ${formatCountdown(expiringHold.seconds)} remaining`,
      href: "#attention",
    });
  }

  const lowStock = lowStockProducts[0];
  if (lowStock) {
    const inventory = getProductStock(lowStock);
    items.push({
      id: `attention-stock-${lowStock.id}`,
      tone: "warning",
      eyebrow: "Low stock",
      title: `${lowStock.name} has ${inventory.available} available`,
      detail: `Threshold is ${lowStock.lowStockThreshold} units`,
      href: "/admin/inventory?view=low-stock",
    });
  }

  const incomplete = unpublishedProducts[0];
  if (incomplete) {
    items.push({
      id: `attention-draft-${incomplete.id}`,
      tone: "info",
      eyebrow: "Continue intake",
      title: `${incomplete.name} is not ready to publish`,
      detail: "Measurements, condition or price still need review",
      href: "/admin/inventory?view=intake",
    });
  }

  return items.slice(0, 5);
}

function findSoonestExpiringHold(
  state: ControlRoomState,
  holds: ControlRoomHold[],
  thresholdSeconds: number,
) {
  let soonest: { hold: ControlRoomHold; seconds: number } | undefined;

  for (const hold of holds) {
    const seconds = getSecondsUntil(state, hold.expiresAt);
    if (seconds > thresholdSeconds) continue;
    if (!soonest || seconds < soonest.seconds) {
      soonest = { hold, seconds };
    }
  }

  return soonest;
}

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

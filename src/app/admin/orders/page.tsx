import { OrdersWorkspace } from "@/features/control-room/orders/orders-workspace";
import {
  defaultOrderQuery,
  orderSavedViews,
  orderSortOptions,
} from "@/features/control-room/orders/order-selectors";
import type {
  OrderChannelFilter,
  OrderPaymentFilter,
  OrderSavedView,
  OrderSortKey,
} from "@/features/control-room/orders/order-types";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

type OrdersPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    q?: string | string[];
    channel?: string | string[];
    payment?: string | string[];
    sort?: string | string[];
    order?: string | string[];
  }>;
};

const viewValues = new Set<OrderSavedView>(
  orderSavedViews.map((view) => view.value),
);
const channelValues = new Set<OrderChannelFilter>([
  "all",
  "online",
  "offline",
]);
const paymentValues = new Set<OrderPaymentFilter>([
  "all",
  "pending",
  "paid",
  "deposit",
  "failed",
  "refunded",
]);
const sortValues = new Set<OrderSortKey>(
  orderSortOptions.map((option) => option.value),
);

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const requestedOrder = first(params.order);
  const initialOpenOrderId = activeControlRoomSeed.orders.some(
    (order) => order.id === requestedOrder,
  )
    ? requestedOrder ?? null
    : null;

  return (
    <OrdersWorkspace
      initialOpenOrderId={initialOpenOrderId}
      initialQuery={{
        ...defaultOrderQuery,
        view: pick(first(params.view), viewValues, "all"),
        search: first(params.q) ?? "",
        channel: pick(first(params.channel), channelValues, "all"),
        payment: pick(first(params.payment), paymentValues, "all"),
        sort: pick(first(params.sort), sortValues, "placed-desc"),
      }}
    />
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pick<TValue extends string>(
  value: string | undefined,
  allowed: Set<TValue>,
  fallback: TValue,
): TValue {
  return value && allowed.has(value as TValue) ? (value as TValue) : fallback;
}

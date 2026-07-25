import {
  defaultOrderQuery,
  orderSavedViews,
  orderSortOptions,
} from "@/features/admin/orders/order-selectors";
import type {
  OrderChannelFilter,
  OrderPaymentFilter,
  OrderSavedView,
  OrderSortKey,
} from "@/features/admin/orders/order-types";
import { OrdersWorkspace } from "@/features/admin/orders/orders-workspace";

type OrdersPageProps = {
  searchParams: Promise<{
    view?: string | string[];
    q?: string | string[];
    channel?: string | string[];
    payment?: string | string[];
    sort?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
    order?: string | string[];
  }>;
};

const viewValues = new Set<OrderSavedView>(orderSavedViews.map((view) => view.value));
const channelValues = new Set<OrderChannelFilter>(["all", "online", "offline"]);
const paymentValues = new Set<OrderPaymentFilter>([
  "all",
  "pending",
  "paid",
  "deposit",
  "failed",
  "refunded",
]);
const sortValues = new Set<OrderSortKey>(orderSortOptions.map((option) => option.value));
const pageSizeValues = new Set([10, 25, 50, 100]);

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const initialOpenOrderId = first(params.order)?.trim() || null;

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
        page: positiveInteger(first(params.page), 1),
        pageSize: pickNumber(first(params.pageSize), pageSizeValues, 25),
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

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pickNumber(value: string | undefined, allowed: Set<number>, fallback: number) {
  const parsed = Number(value);
  return allowed.has(parsed) ? parsed : fallback;
}

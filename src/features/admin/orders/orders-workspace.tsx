"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { OrderControls } from "@/features/admin/orders/order-controls";
import { OrderDetailSheet } from "@/features/admin/orders/order-detail-sheet";
import {
  defaultOrderQuery,
  orderSavedViews,
  orderSortOptions,
} from "@/features/admin/orders/order-selectors";
import { OrderSavedViews } from "@/features/admin/orders/order-saved-views";
import type {
  OrderChannelFilter,
  OrderPaymentFilter,
  OrderQuery,
  OrderSavedView,
  OrderSortKey,
} from "@/features/admin/orders/order-types";
import { OrdersEmptyState } from "@/features/admin/orders/orders-empty-state";
import { OrdersHeader } from "@/features/admin/orders/orders-header";
import { OrdersMobileList } from "@/features/admin/orders/orders-mobile-list";
import { OrdersPagination } from "@/features/admin/orders/orders-pagination";
import { OrdersSummaryStrip } from "@/features/admin/orders/orders-summary-strip";
import { OrdersTable } from "@/features/admin/orders/orders-table";
import { buildOrdersHref } from "@/features/admin/orders/orders-url";
import {
  adminOrderQueryOptions,
  adminOrdersQueryOptions,
  useTransitionOrder,
} from "@/modules/orders/client/hooks";
import type {
  OrderSavedViewCounts,
  OrderStatus,
  OrderWorkspaceSummary,
} from "@/modules/orders/types";

const emptyCounts: OrderSavedViewCounts = {
  all: 0,
  "needs-attention": 0,
  "pending-payment": 0,
  fulfilment: 0,
  delivered: 0,
  closed: 0,
};
const emptySummary: OrderWorkspaceSummary = {
  totalOrders: 0,
  needsAttention: 0,
  pendingPayment: 0,
  inFulfilment: 0,
  delivered: 0,
  netRevenue: 0,
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

export function OrdersWorkspace({
  initialQuery,
  initialOpenOrderId,
}: {
  initialQuery: OrderQuery;
  initialOpenOrderId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const transitionOrderMutation = useTransitionOrder();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const query = useMemo(
    () => readQueryFromUrl(searchParams, initialQuery),
    [initialQuery, searchParams],
  );
  const openOrderId = searchParams.get("order")?.trim() || initialOpenOrderId;
  const ordersQuery = useQuery(adminOrdersQueryOptions(query));
  const detailQuery = useQuery(adminOrderQueryOptions(openOrderId ?? ""));
  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;
  const counts = meta?.counts ?? emptyCounts;
  const summary = meta?.summary ?? emptySummary;
  const openOrder = detailQuery.data ?? null;

  function replaceUrl(nextQuery = query, nextOrderId = openOrderId) {
    router.replace(
      buildOrdersHref(pathname, {
        query: nextQuery,
        orderId: nextOrderId,
      }),
      { scroll: false },
    );
  }

  function patchQuery(patch: Partial<OrderQuery>) {
    const affectsResultSet = Object.keys(patch).some((key) => key !== "page");
    const nextQuery = {
      ...query,
      ...patch,
      ...(affectsResultSet ? { page: 1 } : {}),
    };
    setFeedback(null);
    replaceUrl(nextQuery);
  }

  function resetQuery() {
    setFeedback(null);
    replaceUrl(defaultOrderQuery);
  }

  function openOrderRecord(orderId: string) {
    setFeedback(null);
    replaceUrl(query, orderId);
  }

  function closeOrderRecord() {
    replaceUrl(query, null);
  }

  async function moveOrder(orderId: string, status: OrderStatus) {
    const result = await transitionOrderMutation.mutateAsync({ orderId, nextStatus: status });
    if (!result.ok) {
      setFeedback({
        tone: "error",
        title: "Order could not move",
        message: result.error.message,
      });
      return;
    }

    setFeedback({
      tone: "success",
      title: "Order updated",
      message: result.value.message,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <OrdersHeader />
      <OrdersSummaryStrip summary={summary} />

      <Card className="gap-0 overflow-hidden py-0">
        <OrderSavedViews
          counts={counts}
          onChange={(view) => patchQuery({ view })}
          value={query.view}
        />
        <OrderControls
          onQueryChange={patchQuery}
          onReset={resetQuery}
          query={query}
          resultCount={meta?.total ?? orders.length}
        />
      </Card>

      {feedback ? (
        <Alert aria-live="polite" variant={feedback.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      {ordersQuery.isError ? (
        <Alert aria-live="polite" variant="destructive">
          <AlertTitle>Orders could not be loaded</AlertTitle>
          <AlertDescription>
            {ordersQuery.error instanceof Error
              ? ordersQuery.error.message
              : "Refresh and try loading the persisted orders again."}
          </AlertDescription>
        </Alert>
      ) : null}

      {orders.length ? (
        <>
          <OrdersMobileList onOpen={openOrderRecord} orders={orders} />
          <OrdersTable onOpen={openOrderRecord} orders={orders} />
          {meta ? (
            <OrdersPagination
              onPageChange={(page) => patchQuery({ page })}
              onPageSizeChange={(pageSize) => patchQuery({ pageSize })}
              page={meta.page}
              pageCount={meta.pageCount}
              pageSize={meta.pageSize}
              totalItems={meta.total}
            />
          ) : null}
        </>
      ) : ordersQuery.isPending ? (
        <p className="rounded-[18px] border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          Loading orders…
        </p>
      ) : (
        <OrdersEmptyState hasOrders={summary.totalOrders > 0} onReset={resetQuery} />
      )}

      <OrderDetailSheet
        onOpenChange={(open) => {
          if (!open) closeOrderRecord();
        }}
        onTransition={moveOrder}
        order={openOrder}
      />
    </div>
  );
}

function readQueryFromUrl(searchParams: URLSearchParams, fallback: OrderQuery): OrderQuery {
  return {
    view: pick(searchParams.get("view"), viewValues, fallback.view),
    search: searchParams.get("q") ?? fallback.search,
    channel: pick(searchParams.get("channel"), channelValues, fallback.channel),
    payment: pick(searchParams.get("payment"), paymentValues, fallback.payment),
    sort: pick(searchParams.get("sort"), sortValues, fallback.sort),
    page: positiveInteger(searchParams.get("page"), fallback.page),
    pageSize: pickNumber(searchParams.get("pageSize"), pageSizeValues, fallback.pageSize),
  };
}

function pick<TValue extends string>(
  value: string | null,
  allowed: ReadonlySet<TValue>,
  fallback: TValue,
): TValue {
  return value && allowed.has(value as TValue) ? (value as TValue) : fallback;
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pickNumber(value: string | null, allowed: ReadonlySet<number>, fallback: number) {
  const parsed = Number(value);
  return allowed.has(parsed) ? parsed : fallback;
}

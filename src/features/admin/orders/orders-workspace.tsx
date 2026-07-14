"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { OrderControls } from "@/features/admin/orders/order-controls";
import { OrderDetailSheet } from "@/features/admin/orders/order-detail-sheet";
import { OrderSavedViews } from "@/features/admin/orders/order-saved-views";
import {
  defaultOrderQuery,
  getOrderSavedViewCounts,
  getOrderWorkspaceSummary,
  queryOrders,
} from "@/features/admin/orders/order-selectors";
import type { OrderQuery } from "@/features/admin/orders/order-types";
import { OrdersEmptyState } from "@/features/admin/orders/orders-empty-state";
import { OrdersHeader } from "@/features/admin/orders/orders-header";
import { OrdersMobileList } from "@/features/admin/orders/orders-mobile-list";
import { OrdersSummaryStrip } from "@/features/admin/orders/orders-summary-strip";
import { OrdersTable } from "@/features/admin/orders/orders-table";
import { buildOrdersHref } from "@/features/admin/orders/orders-url";
import { useAdmin } from "@/features/admin/state/admin-provider";
import type { OrderStatus } from "@/lib/admin/types";

export function OrdersWorkspace({
  initialQuery,
  initialOpenOrderId,
}: {
  initialQuery: OrderQuery;
  initialOpenOrderId: string | null;
}) {
  const pathname = usePathname();
  const { state, transitionOrder } = useAdmin();
  const [query, setQuery] = useState(initialQuery);
  const [openOrderId, setOpenOrderId] = useState<string | null>(initialOpenOrderId);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const orders = useMemo(() => queryOrders(state, query), [query, state]);
  const counts = useMemo(() => getOrderSavedViewCounts(state.orders), [state.orders]);
  const summary = useMemo(() => getOrderWorkspaceSummary(state), [state]);
  const openOrder = state.orders.find((order) => order.id === openOrderId) ?? null;

  function replaceUrl(nextQuery = query, nextOrderId = openOrderId) {
    window.history.replaceState(
      null,
      "",
      buildOrdersHref(pathname, {
        query: nextQuery,
        orderId: nextOrderId,
      }),
    );
  }

  function patchQuery(patch: Partial<OrderQuery>) {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    setFeedback(null);
    replaceUrl(nextQuery);
  }

  function resetQuery() {
    setQuery(defaultOrderQuery);
    setFeedback(null);
    replaceUrl(defaultOrderQuery);
  }

  function openOrderRecord(orderId: string) {
    setOpenOrderId(orderId);
    setFeedback(null);
    replaceUrl(query, orderId);
  }

  function closeOrderRecord() {
    setOpenOrderId(null);
    replaceUrl(query, null);
  }

  function moveOrder(orderId: string, status: OrderStatus) {
    const result = transitionOrder(orderId, status);
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
          resultCount={orders.length}
        />
      </Card>

      {feedback ? (
        <Alert aria-live="polite" variant={feedback.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>{feedback.title}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      {orders.length ? (
        <>
          <OrdersMobileList onOpen={openOrderRecord} orders={orders} state={state} />
          <OrdersTable onOpen={openOrderRecord} orders={orders} state={state} />
        </>
      ) : (
        <OrdersEmptyState hasOrders={state.orders.length > 0} onReset={resetQuery} />
      )}

      <OrderDetailSheet
        onOpenChange={(open) => {
          if (!open) closeOrderRecord();
        }}
        onTransition={moveOrder}
        order={openOrder}
        state={state}
      />
    </div>
  );
}

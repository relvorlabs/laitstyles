"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  channelLabels,
  formatOrderDate,
  paymentStatusLabels,
} from "@/modules/orders/ui/admin/order-labels";
import { toOrderWorkspaceItem } from "@/features/admin/orders/order-selectors";
import { OrderStatusBadge, PaymentStatusBadge } from "@/modules/orders/ui/admin/order-status-badge";
import { OrderTimeline } from "@/features/admin/orders/order-timeline";
import { OrderTransitionControls } from "@/features/admin/orders/order-transition-controls";
import { formatNaira } from "@/lib/admin/shared/formatters";
import type { ControlRoomOrder, OrderStatus } from "@/modules/orders/types";

export function OrderDetailSheet({
  order,
  onOpenChange,
  onTransition,
}: {
  order: ControlRoomOrder | null;
  onOpenChange: (open: boolean) => void;
  onTransition: (orderId: string, status: OrderStatus) => void;
}) {
  if (!order) return <Sheet onOpenChange={onOpenChange} open={false} />;

  const item = toOrderWorkspaceItem(order);
  const customer = order.customer;

  return (
    <Sheet onOpenChange={onOpenChange} open>
      <SheetContent
        className="data-[side=right]:gap-0 data-[side=right]:overflow-y-auto data-[side=right]:overscroll-contain max-sm:!inset-x-0 max-sm:!w-screen max-sm:!max-w-none max-sm:border-l-0 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:duration-0 data-[side=right]:sm:w-[min(94vw,780px)] data-[side=right]:sm:max-w-[780px]"
        side="right"
      >
        <SheetHeader className="border-b border-border px-5 py-5 pr-14 max-sm:pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {channelLabels[order.channel]} · {formatOrderDate(order.placedAt)}
              </p>
              <SheetTitle className="mt-2 font-serif text-[32px] font-medium leading-none">
                {order.id}
              </SheetTitle>
              <SheetDescription className="mt-2">
                Connected customer, stock, payment and fulfilment history for this order.
              </SheetDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PaymentStatusBadge status={order.paymentStatus} />
              <OrderStatusBadge status={order.fulfilmentStatus} />
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4 sm:p-6">
          <section aria-labelledby="order-actions-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Next operational step
                </p>
                <h2 className="mt-2 font-serif text-[24px] font-medium" id="order-actions-title">
                  Move this order
                </h2>
              </div>
              {order.attention ? (
                <Badge variant="destructive" className="capitalize">
                  {order.attention} attention
                </Badge>
              ) : null}
            </div>
            <div className="mt-4">
              <OrderTransitionControls
                onTransition={(status) => onTransition(order.id, status)}
                order={order}
              />
            </div>
          </section>

          <Separator />

          <section aria-labelledby="order-summary-title">
            <h2 className="font-serif text-[24px] font-medium" id="order-summary-title">
              Order summary
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <DetailMetric label="Customer" value={item.customerName} />
              <DetailMetric label="Units" value={String(item.unitCount)} />
              <DetailMetric label="Order total" value={formatNaira(order.total)} />
              <DetailMetric label="Net revenue" value={formatNaira(item.netRevenue)} />
            </div>
          </section>

          <section aria-labelledby="order-lines-title">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-[24px] font-medium" id="order-lines-title">
                Items
              </h2>
              <Badge variant="outline">
                {order.lines.length} line{order.lines.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {order.lines.map((line) => (
                <Card key={line.id} className="gap-0 py-0">
                  <CardContent className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <p className="text-[13px] font-semibold">{line.productName}</p>
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        {line.variantLabel ?? line.productCategory}
                        {line.stockState ? ` · ${line.stockState} stock` : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-6 sm:text-right">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {line.quantity} × {formatNaira(line.unitPrice)}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatNaira(line.quantity * line.unitPrice)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section
              className="rounded-[16px] border border-border bg-card p-4"
              aria-labelledby="payment-boundary-title"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Payment boundary
              </p>
              <h2 className="mt-2 font-serif text-[22px] font-medium" id="payment-boundary-title">
                {paymentStatusLabels[order.paymentStatus]}
              </h2>
              <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
                Method: {order.paymentMethod?.replaceAll("-", " ") ?? "Not captured"}. In-person
                Paystack orders remain pending until server verification or a signed webhook
                confirms the persisted reference and amount.
              </p>
            </section>

            <section
              className="rounded-[16px] border border-border bg-card p-4"
              aria-labelledby="delivery-boundary-title"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Delivery boundary
              </p>
              <h2 className="mt-2 font-serif text-[22px] font-medium" id="delivery-boundary-title">
                {order.deliveryCity || "No delivery city"}
              </h2>
              <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
                {order.courier
                  ? `${order.courier.name} · ${order.courier.statusLabel} · ${order.courier.trackingCode}`
                  : order.source === "offline-sale"
                    ? "In-person pickup or handoff. Stock is not sold until the paid order is handed to the customer."
                    : "No courier integration is connected. Delivery status is an internal operational record."}
              </p>
            </section>
          </div>

          <section aria-labelledby="customer-title">
            <h2 className="font-serif text-[24px] font-medium" id="customer-title">
              Customer & notes
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[16px] border border-border bg-card p-4 text-[11.5px] leading-5">
                <p className="font-semibold text-foreground">{item.customerName}</p>
                <p className="mt-2 text-muted-foreground">
                  {customer?.email || "No email captured"}
                  <br />
                  {customer?.phone || "No phone captured"}
                  <br />
                  {customer?.city || order.deliveryCity || "No city captured"}
                </p>
              </div>
              <div className="rounded-[16px] border border-border bg-card p-4 text-[11.5px] leading-5 text-muted-foreground">
                {order.notes?.trim() || "No internal notes have been recorded for this order."}
              </div>
            </div>
          </section>

          <section aria-labelledby="timeline-title">
            <h2 className="font-serif text-[24px] font-medium" id="timeline-title">
              Timeline
            </h2>
            <div className="mt-4 rounded-[16px] border border-border bg-card p-4">
              <OrderTimeline order={order} />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-secondary/65 p-4">
      <p className="break-words font-serif text-[21px] font-medium leading-tight tabular-nums sm:text-[22px]">
        {value}
      </p>
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-muted-foreground sm:text-[9.5px] sm:tracking-[0.12em]">
        {label}
      </p>
    </div>
  );
}

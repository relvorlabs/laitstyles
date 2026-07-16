"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { channelLabels, formatOrderDate } from "@/features/admin/orders/order-labels";
import { toOrderWorkspaceItem } from "@/features/admin/orders/order-selectors";
import { OrderStatusBadge, PaymentStatusBadge } from "@/features/admin/orders/order-status-badge";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { formatNaira } from "@/lib/admin/formatters";
import type { AdminState, ControlRoomOrder } from "@/lib/admin/types";

export function OrdersMobileList({
  state,
  orders,
  onOpen,
}: {
  state: AdminState;
  orders: ControlRoomOrder[];
  onOpen: (orderId: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:hidden md:grid-cols-2">
      {orders.map((order) => {
        const item = toOrderWorkspaceItem(state, order);
        return (
          <Card className="gap-0 overflow-hidden py-0" key={order.id}>
            <div className="border-b border-border bg-secondary/45 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <Button
                  className="h-auto justify-start p-0 text-left"
                  onClick={() => onOpen(order.id)}
                  type="button"
                  variant="link"
                >
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {channelLabels[order.channel]} · {formatOrderDate(order.placedAt)}
                    </span>
                    <span className="mt-1 block font-serif text-[24px] font-medium leading-none">
                      {order.id}
                    </span>
                  </span>
                </Button>
                {item.needsAttention ? <Badge variant="destructive">Attention</Badge> : null}
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="text-[13px] font-semibold">{item.customerName}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.customerCity || "No city"}
                </p>
              </div>

              <div className="rounded-[14px] bg-secondary/60 p-3">
                <p className="text-[11.5px] font-medium">
                  {item.unitCount} unit{item.unitCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-muted-foreground">
                  {item.productNames.join(", ")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PaymentStatusBadge status={order.paymentStatus} />
                <OrderStatusBadge status={order.fulfilmentStatus} />
              </div>

              <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Order total
                  </p>
                  <p className="mt-1 font-serif text-[24px] font-medium tabular-nums">
                    {formatNaira(order.total)}
                  </p>
                  {order.refundedAmount ? (
                    <p className="mt-1 text-[10.5px] text-muted-foreground">
                      Net {formatNaira(item.netRevenue)}
                    </p>
                  ) : null}
                </div>
                <Button
                  aria-label={`Open ${order.id}`}
                  onClick={() => onOpen(order.id)}
                  size="icon-lg"
                  type="button"
                  variant="outline"
                >
                  <AdminIcon icon={ArrowRight01Icon} size={17} />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { channelLabels } from "@/features/control-room/orders/order-labels";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/features/control-room/orders/order-status-badge";
import { toOrderWorkspaceItem } from "@/features/control-room/orders/order-selectors";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatNaira } from "@/lib/control-room/formatters";
import type {
  ControlRoomOrder,
  ControlRoomState,
} from "@/lib/control-room/types";

export function OrdersTable({
  state,
  orders,
  onOpen,
}: {
  state: ControlRoomState;
  orders: ControlRoomOrder[];
  onOpen: (orderId: string) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[18px] border border-border bg-card lg:block">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-secondary/55 hover:bg-secondary/55">
            <TableHead className="w-[16%]">Order</TableHead>
            <TableHead className="w-[18%]">Customer</TableHead>
            <TableHead className="w-[22%]">Items</TableHead>
            <TableHead className="w-[13%] text-right">Total</TableHead>
            <TableHead className="w-[12%]">Payment</TableHead>
            <TableHead className="w-[16%]">Fulfilment</TableHead>
            <TableHead className="w-[3%] text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const item = toOrderWorkspaceItem(state, order);
            return (
              <TableRow key={order.id}>
                <TableCell className="overflow-hidden">
                  <button
                    className="max-w-full rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpen(order.id)}
                    type="button"
                  >
                    <span className="block truncate text-[13px] font-semibold">
                      {order.id}
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                      {channelLabels[order.channel]}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <span className="block truncate text-[12.5px] font-medium">
                    {item.customerName}
                  </span>
                  <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                    {item.customerCity || "No city"}
                  </span>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <span className="block text-[12px] font-medium tabular-nums">
                    {item.unitCount} unit{item.unitCount === 1 ? "" : "s"}
                  </span>
                  <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                    {item.productNames.join(", ")}
                  </span>
                </TableCell>
                <TableCell className="overflow-hidden text-right font-semibold tabular-nums">
                  <span className="block truncate">{formatNaira(order.total)}</span>
                  {order.refundedAmount ? (
                    <span className="mt-1 block truncate text-[10px] font-normal text-muted-foreground">
                      Net {formatNaira(item.netRevenue)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="overflow-hidden">
                  <PaymentStatusBadge status={order.paymentStatus} />
                </TableCell>
                <TableCell className="overflow-hidden">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <OrderStatusBadge status={order.fulfilmentStatus} />
                    {item.needsAttention ? (
                      <Badge variant="destructive">Attention</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-1 text-right">
                  <Button
                    aria-label={`Open ${order.id}`}
                    className="size-9 rounded-full"
                    onClick={() => onOpen(order.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

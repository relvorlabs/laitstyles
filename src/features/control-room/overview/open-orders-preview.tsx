import { ArrowRight01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/features/control-room/orders/order-status-badge";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { SectionHeading } from "@/features/control-room/shared/section-heading";
import { formatNaira, formatRelativeTime } from "@/lib/control-room/formatters";
import { getCustomerName } from "@/lib/control-room/selectors";
import type { ControlRoomOrder, ControlRoomState } from "@/lib/control-room/types";

const terminalStatuses = new Set(["delivered", "cancelled", "refunded", "returned"]);

export function OpenOrdersPreview({ state }: { state: ControlRoomState }) {
  const orders = state.orders
    .filter((order) => !terminalStatuses.has(order.fulfilmentStatus))
    .toSorted(
      (left, right) => new Date(right.placedAt).getTime() - new Date(left.placedAt).getTime(),
    )
    .slice(0, 5);

  return (
    <section aria-labelledby="open-orders-heading" id="open-orders">
      <SectionHeading
        description="Current sales that still need payment, packing, dispatch or customer hand-off."
        eyebrow="Open orders"
        title="Keep fulfilment moving without leaving the Overview."
      />
      <Card className="mt-5 gap-0 py-0">
        <CardHeader className="border-b border-border px-5 py-4 sm:px-6">
          <CardTitle className="flex items-center justify-between gap-3 text-[13px]">
            <span id="open-orders-heading">Orders still in motion</span>
            <Badge variant={orders.length ? "secondary" : "outline"}>{orders.length} shown</Badge>
          </CardTitle>
          <CardDescription className="text-[12px]">
            Ordered by the most recently placed record.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length ? (
            <div className="divide-y divide-border">
              {orders.map((order) => (
                <OpenOrderRow key={order.id} order={order} state={state} />
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-sunken text-muted-foreground">
                <ControlRoomIcon icon={PackageIcon} size={21} />
              </span>
              <h3 className="mt-4 font-serif text-[23px] font-medium">No open fulfilment work.</h3>
              <p className="mx-auto mt-2 max-w-[380px] text-[13px] leading-5 text-muted-foreground">
                New paid, preparing, packed and dispatched orders will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function OpenOrderRow({ order, state }: { order: ControlRoomOrder; state: ControlRoomState }) {
  const firstLine = order.lines[0];
  const product = firstLine
    ? state.products.find((item) => item.id === firstLine.productId)
    : undefined;
  const customer = getCustomerName(state, order.customerId);

  return (
    <Link
      className="group grid min-h-[94px] grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-foreground transition-colors hover:bg-surface-interactive hover:text-foreground sm:px-5"
      href={`/admin/orders?order=${order.id}`}
    >
      <span className="relative aspect-[4/5] w-14 overflow-hidden rounded-xl bg-surface-sunken">
        {product ? (
          <Image
            alt={product.name}
            className="object-cover"
            fill
            sizes="56px"
            src={product.image}
          />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            <ControlRoomIcon icon={PackageIcon} size={18} />
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold">{order.id}</span>
          <OrderStatusBadge status={order.fulfilmentStatus} />
        </span>
        <span className="mt-1.5 block truncate text-[13.5px] font-semibold">{customer}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
          {product?.name ??
            `${order.lines.length} order line${order.lines.length === 1 ? "" : "s"}`}{" "}
          · {order.deliveryCity} · {formatRelativeTime(state.asOf, order.placedAt)}
        </span>
      </span>
      <span className="flex flex-col items-end gap-2">
        <span className="text-[12.5px] font-semibold tabular-nums">{formatNaira(order.total)}</span>
        <span className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
          <ControlRoomIcon icon={ArrowRight01Icon} size={15} />
        </span>
      </span>
    </Link>
  );
}

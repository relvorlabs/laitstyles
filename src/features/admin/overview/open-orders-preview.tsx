import { ArrowRight01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CloudImage } from "@/components/ui/cloud-image";
import { OrderStatusBadge } from "@/modules/orders/ui/admin/order-status-badge";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { formatNaira, formatRelativeTime } from "@/lib/admin/shared/formatters";
import type { OverviewOpenOrder } from "@/modules/overview/types";

export function OpenOrdersPreview({ orders, asOf }: { orders: OverviewOpenOrder[]; asOf: string }) {
  return (
    <section aria-labelledby="open-orders-heading" className="scroll-mt-24" id="open-orders">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Open orders
          </p>
          <h2
            className="mt-1.5 text-balance font-serif text-[27px] font-medium leading-tight sm:text-[30px]"
            id="open-orders-heading"
          >
            Keep fulfilment moving without leaving the Overview.
          </h2>
          <p className="mt-2 max-w-[620px] text-[13px] leading-5 text-muted-foreground sm:text-[13.5px]">
            Current sales that still need payment, packing, dispatch or customer hand-off.
          </p>
        </div>
        <Badge variant={orders.length ? "secondary" : "outline"}>{orders.length} shown</Badge>
      </header>

      <Card className="mt-5 gap-0 py-0">
        <CardContent className="p-0">
          {orders.length ? (
            <>
              <div className="divide-y divide-border">
                {orders.map((item) => (
                  <OpenOrderRow asOf={asOf} item={item} key={item.order.id} />
                ))}
              </div>
              <div className="flex justify-end border-t border-border px-3 py-2">
                <Link
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  data-slot="button"
                  href="/admin/orders"
                >
                  All orders
                  <AdminIcon icon={ArrowRight01Icon} size={15} />
                </Link>
              </div>
            </>
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-sunken text-muted-foreground">
                <AdminIcon icon={PackageIcon} size={21} />
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

function OpenOrderRow({ item, asOf }: { item: OverviewOpenOrder; asOf: string }) {
  const order = item.order;
  return (
    <Link
      className="group grid min-h-[94px] grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-foreground transition-colors hover:bg-surface-interactive hover:text-foreground sm:px-5"
      href={`/admin/orders?order=${order.id}`}
    >
      <span className="relative aspect-[4/5] w-14 overflow-hidden rounded-sm bg-surface-sunken">
        {item.productImage ? (
          <CloudImage
            alt={item.productImageAlt}
            className="object-cover"
            fill
            sizes="56px"
            src={item.productImage}
          />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            <AdminIcon icon={PackageIcon} size={18} />
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11.5px] font-semibold">{order.id}</span>
          <OrderStatusBadge status={order.fulfilmentStatus} />
        </span>
        <span className="mt-1.5 block truncate text-[13.5px] font-semibold">
          {item.customerName}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
          {item.productName} · {order.deliveryCity} · {formatRelativeTime(asOf, order.placedAt)}
        </span>
      </span>
      <span className="flex flex-col items-end gap-2">
        <span className="text-[12.5px] font-semibold tabular-nums">{formatNaira(order.total)}</span>
        <span className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
          <AdminIcon icon={ArrowRight01Icon} size={15} />
        </span>
      </span>
    </Link>
  );
}

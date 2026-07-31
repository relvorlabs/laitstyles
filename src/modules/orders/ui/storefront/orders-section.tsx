import { ShoppingBag03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { AccountOrderSummary } from "@/modules/orders/storefront/account-order-contract";
import {
  Eyebrow,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
  type StatusVariant,
} from "@/modules/storefront-shell/ui/account-primitives";

function formatMoney(kobo: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function paymentVariant(code: AccountOrderSummary["paymentStatus"]["code"]): StatusVariant {
  if (code === "paid") return "success";
  if (code === "review_required" || code === "cancelled") return "danger";
  if (code === "pending" || code === "processing") return "warning";
  return "neutral";
}

function fulfilmentVariant(code: AccountOrderSummary["fulfilmentStatus"]["code"]): StatusVariant {
  if (code === "delivered") return "success";
  if (code === "cancelled") return "danger";
  if (code === "processing" || code === "ready_for_dispatch" || code === "dispatched") {
    return "warning";
  }
  return "neutral";
}

function OrderImages({ order }: { order: AccountOrderSummary }) {
  const images = [...new Map(order.images.filter((image) => image?.src).map((image) => [image.src, image])).values()];

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-[10px] bg-[var(--acc-bone-2)] text-[var(--acc-muted)]">
        <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={28} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2", images.length > 1 && "grid-cols-2")}>
      {images.map((image) => (
        <div
          key={`account-order:${order.orderNumber}:image:${image.src}`}
          className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-[var(--acc-bone-2)]"
        >
          <CloudImage
            src={image.src}
            alt={image.alt || `Item from order ${order.orderNumber}`}
            fill
            sizes="(max-width: 767px) 42vw, 110px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export function OrdersSection({ orders }: { orders: AccountOrderSummary[] }) {
  const visibleOrders = uniqueOrders(orders);

  return (
    <>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Purchase history</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93] tracking-[-.03em]">
          Orders.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Follow each purchase from payment through delivery, then review the pieces you kept.
        </p>
      </header>

      {visibleOrders.length === 0 ? (
        <Empty className={cn("mt-8 min-h-80", panelClass)}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} />
            </EmptyMedia>
            <EmptyTitle className="font-serif text-2xl font-normal">No orders yet</EmptyTitle>
            <EmptyDescription>
              Pieces you purchase will appear here with delivery and review updates.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/products" className={buttonVariants({ size: "lg" })}>
              Explore the collection
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="mt-7 space-y-4">
          {visibleOrders.map((order, index) => {
            const detailsHref = `/account/orders/${encodeURIComponent(order.orderNumber)}`;
            const itemLabel = `${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`;
            const reviewLabel = `Review ${order.reviewableItemCount} ${order.reviewableItemCount === 1 ? "item" : "items"}`;

            return (
              <article
                key={`account-order:${order.orderNumber}`}
                className={cn("overflow-hidden", index === 0 ? panelElevatedClass : panelClass)}
              >
                <div className="flex flex-col gap-4 border-b border-[var(--acc-line)] p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Eyebrow className="text-[var(--acc-muted)]">
                      Order <span className={monoClass}>#{order.orderNumber}</span>
                    </Eyebrow>
                    <p className="mt-2 text-sm text-[var(--acc-muted)]">
                      {formatDate(order.placedAt)} ·{" "}
                      <span className={monoClass}>
                        {formatMoney(order.totalKobo, order.currency)}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge variant={paymentVariant(order.paymentStatus.code)}>
                      {order.paymentStatus.label}
                    </StatusBadge>
                    <StatusBadge variant={fulfilmentVariant(order.fulfilmentStatus.code)}>
                      {order.fulfilmentStatus.label}
                    </StatusBadge>
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-[170px_minmax(0,1fr)_auto] lg:items-center">
                  <OrderImages order={order} />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{itemLabel}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--acc-muted)]">
                      {order.itemNames.filter(Boolean).join(" · ") || "Order items unavailable"}
                    </p>
                    <p className="mt-3 text-sm text-[var(--acc-muted)]">
                      Last updated {formatDate(order.updatedAt)}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:col-start-2 sm:grid-cols-2 lg:col-start-auto lg:grid-cols-1">
                    {order.reviewableItemCount > 0 ? (
                      <Link
                        href={`${detailsHref}#review-items`}
                        className={buttonVariants({ size: "lg" })}
                      >
                        {reviewLabel}
                      </Link>
                    ) : null}
                    <Link
                      href={detailsHref}
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      View order details
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function uniqueOrders(orders: readonly AccountOrderSummary[]): AccountOrderSummary[] {
  const byNumber = new Map<string, AccountOrderSummary>();
  for (const order of orders) {
    if (!order?.orderNumber) continue;
    byNumber.set(order.orderNumber, order);
  }
  return Array.from(byNumber.values());
}

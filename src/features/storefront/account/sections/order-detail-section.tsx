import { ShoppingBag03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  reviewLifecycleMarkerCopy,
  reviewStateCopy,
} from "@/features/storefront/account/orders/order-state-copy";
import type {
  AccountOrderDetail,
  AccountOrderLine,
} from "@/features/storefront/account/orders/order-types";
import { cn } from "@/lib/utils";
import {
  Eyebrow,
  monoClass,
  ProgressTrack,
  panelClass,
  panelElevatedClass,
  StatusBadge,
  type StatusVariant,
  TimelineDot,
} from "../components/account-primitives";

function formatMoney(kobo: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

function sentenceCase(value: string): string {
  const words = value.replaceAll("_", " ").trim();
  return words ? `${words[0].toUpperCase()}${words.slice(1)}` : "Order update";
}

function paymentVariant(code: AccountOrderDetail["paymentStatus"]["code"]): StatusVariant {
  if (code === "paid") return "success";
  if (code === "review_required" || code === "cancelled") return "danger";
  if (code === "pending" || code === "processing") return "warning";
  return "neutral";
}

function fulfilmentVariant(code: AccountOrderDetail["fulfilmentStatus"]["code"]): StatusVariant {
  if (code === "delivered") return "success";
  if (code === "cancelled") return "danger";
  if (code === "processing" || code === "ready_for_dispatch" || code === "dispatched") {
    return "warning";
  }
  return "neutral";
}

function LineImage({ line }: { line: AccountOrderLine }) {
  const content = line.image ? (
    <Image
      src={line.image.src}
      alt={line.image.alt}
      fill
      sizes="(max-width: 639px) 96px, 112px"
      className="object-cover"
    />
  ) : (
    <span className="grid size-full place-items-center text-[var(--acc-muted)]">
      <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={26} strokeWidth={1.5} />
    </span>
  );
  const className =
    "relative block aspect-[4/5] overflow-hidden rounded-[10px] bg-[var(--acc-bone-2)]";

  return line.productSlug ? (
    <Link href={`/products/${encodeURIComponent(line.productSlug)}`} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function ReviewTreatment({ line, orderNumber }: { line: AccountOrderLine; orderNumber: string }) {
  const state = line.reviewState;
  const reviewHref = `/account/orders/${encodeURIComponent(orderNumber)}/items/${encodeURIComponent(line.id)}/review`;
  let actionLabel: string | null = null;

  if (state.kind === "eligible") actionLabel = "Write a review";
  if (state.kind === "published") actionLabel = "View review";
  if (state.kind === "rejected" && state.canResubmit) actionLabel = "Revise review";
  if (state.kind === "withdrawn" && state.canResubmit) actionLabel = "Submit review again";

  return (
    <div className="space-y-3 sm:text-right">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {state.kind === "pending" ? (
          <StatusBadge variant="warning">Pending review</StatusBadge>
        ) : null}
        {state.kind === "published" ? (
          <StatusBadge variant="success">Published review</StatusBadge>
        ) : null}
        {state.kind === "rejected" ? (
          <StatusBadge variant="danger">Changes requested</StatusBadge>
        ) : null}
        {state.kind === "withdrawn" ? (
          <StatusBadge variant="neutral">Review withdrawn</StatusBadge>
        ) : null}
        {state.kind === "published" && state.lifecycleMarker ? (
          <StatusBadge variant="neutral">
            {reviewLifecycleMarkerCopy(state.lifecycleMarker)}
          </StatusBadge>
        ) : null}
      </div>
      <p className="max-w-sm text-sm leading-6 text-[var(--acc-muted)] sm:ml-auto">
        {reviewStateCopy(state)}
      </p>
      {actionLabel ? (
        <Link href={reviewHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function OrderDetailSection({ order }: { order: AccountOrderDetail }) {
  return (
    <>
      <Link
        href="/account/orders"
        className={cn(buttonVariants({ variant: "link", size: "lg" }), "mb-5 px-0")}
      >
        ← Back to orders
      </Link>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Order detail</Eyebrow>
          <h1 className="mt-4 break-words font-serif text-[clamp(2.6rem,6vw,5rem)] font-normal leading-[.93]">
            Order <span className={cn(monoClass, "text-[.55em]")}>#{order.orderNumber}</span>
          </h1>
          <p className="mt-4 text-[var(--acc-muted)]">
            Placed {formatDate(order.placedAt)} · Total{" "}
            <span className={monoClass}>{formatMoney(order.totalKobo, order.currency)}</span>
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
      </header>

      <section className={cn("mt-7 p-5 sm:p-6", panelElevatedClass)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-serif text-3xl font-normal">Progress</h2>
          <p className="text-sm text-[var(--acc-muted)]">
            Updated {formatDateTime(order.updatedAt)}
          </p>
        </div>
        {order.timeline.length > 0 ? (
          <ProgressTrack>
            {order.timeline.map((event) => (
              <li
                key={`${event.status}-${event.occurredAt}`}
                className="grid grid-cols-[31px_minmax(0,1fr)] gap-4"
              >
                <TimelineDot state="complete">✓</TimelineDot>
                <div>
                  <p className="font-semibold">{sentenceCase(event.status)}</p>
                  <p className="mt-1 text-sm text-[var(--acc-muted)]">
                    {formatDateTime(event.occurredAt)}
                  </p>
                </div>
              </li>
            ))}
          </ProgressTrack>
        ) : (
          <Alert className="mt-5 bg-[var(--acc-bone-2)]">
            <AlertTitle>No timeline updates yet</AlertTitle>
            <AlertDescription>
              The current fulfilment state is {order.fulfilmentStatus.label.toLowerCase()}.
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section id="review-items" className={cn("mt-6 scroll-mt-24 overflow-hidden", panelClass)}>
        <div className="border-b border-[var(--acc-line)] p-5">
          <Eyebrow className="text-[var(--acc-muted)]">Purchased pieces</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-normal">Items</h2>
        </div>
        <div className="divide-y divide-[var(--acc-line)]">
          {order.lines.map((line) => (
            <article
              key={line.id}
              className="grid gap-5 p-5 sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[112px_minmax(0,1fr)_minmax(220px,0.8fr)] lg:items-start"
            >
              <LineImage line={line} />
              <div className="min-w-0">
                {line.productSlug ? (
                  <Link
                    href={`/products/${encodeURIComponent(line.productSlug)}`}
                    className="text-lg font-semibold underline-offset-4 hover:underline"
                  >
                    {line.productName}
                  </Link>
                ) : (
                  <h3 className="text-lg font-semibold">{line.productName}</h3>
                )}
                <p className="mt-2 text-sm leading-6 text-[var(--acc-muted)]">
                  {[
                    line.variantLabel,
                    line.sku ? `SKU ${line.sku}` : null,
                    `Quantity ${line.quantity}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className={cn("mt-2", monoClass)}>
                  {formatMoney(line.lineTotalKobo, order.currency)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge
                    variant={line.fulfilmentStatus.code === "delivered" ? "success" : "neutral"}
                  >
                    {line.fulfilmentStatus.label}
                  </StatusBadge>
                  {line.refundStatus.code !== "not_refunded" ? (
                    <StatusBadge variant="neutral">{line.refundStatus.label}</StatusBadge>
                  ) : null}
                </div>
                {line.deliveredAt ? (
                  <p className="mt-3 text-sm text-[var(--acc-muted)]">
                    First delivered {formatDate(line.deliveredAt)}
                  </p>
                ) : null}
              </div>
              <div className="sm:col-start-2 lg:col-start-auto">
                <ReviewTreatment line={line} orderNumber={order.orderNumber} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={cn("p-5 sm:p-6", panelClass)}>
          <Eyebrow className="text-[var(--acc-muted)]">
            {order.fulfilmentMethod === "pickup" ? "Pickup" : "Delivery"}
          </Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-normal">
            {order.delivery?.city ??
              (order.fulfilmentMethod === "pickup" ? "Store pickup" : "Address unavailable")}
          </h2>
          {order.delivery ? (
            <address className="mt-4 not-italic leading-7 text-[var(--acc-muted)]">
              {[
                order.delivery.name,
                order.delivery.line1,
                order.delivery.line2,
                order.delivery.state,
                order.delivery.country,
                order.delivery.postalCode,
              ]
                .filter(Boolean)
                .map((part) => (
                  <span key={part} className="block">
                    {part}
                  </span>
                ))}
              {order.delivery.phone ? (
                <span className="mt-3 block text-[var(--acc-ink)]">{order.delivery.phone}</span>
              ) : null}
            </address>
          ) : (
            <p className="mt-4 text-[var(--acc-muted)]">
              No delivery address snapshot is available for this order.
            </p>
          )}
        </section>

        <section className={cn("p-5 sm:p-6", panelClass)}>
          <Eyebrow className="text-[var(--acc-muted)]">Payment summary</Eyebrow>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd className={monoClass}>{formatMoney(order.subtotalKobo, order.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery</dt>
              <dd className={monoClass}>{formatMoney(order.deliveryFeeKobo, order.currency)}</dd>
            </div>
            {order.discountAmountKobo > 0 ? (
              <div className="flex justify-between gap-4">
                <dt>Discount</dt>
                <dd className={monoClass}>
                  −{formatMoney(order.discountAmountKobo, order.currency)}
                </dd>
              </div>
            ) : null}
            {order.refundedAmountKobo > 0 ? (
              <div className="flex justify-between gap-4 text-[var(--acc-muted)]">
                <dt>Refunded</dt>
                <dd className={monoClass}>
                  {formatMoney(order.refundedAmountKobo, order.currency)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-[var(--acc-line)] pt-4 text-lg font-semibold">
              <dt>Total</dt>
              <dd className={monoClass}>{formatMoney(order.totalKobo, order.currency)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-[var(--acc-muted)]">
            {order.paymentMethod ? `${order.paymentMethod} · ` : ""}
            {order.paymentStatus.label}
          </p>
        </section>
      </div>
    </>
  );
}

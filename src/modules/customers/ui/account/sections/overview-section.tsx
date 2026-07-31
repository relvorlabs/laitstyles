"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { cn } from "@/lib/utils";
import type {
  AccountOrderImage,
  AccountOrderSummary,
} from "@/modules/orders/storefront/account-order-contract";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
  type StatusVariant,
} from "../components/account-primitives";
import { AccountProductGrid } from "../components/account-product-grid";
import { useAccountProducts } from "../hooks/use-account-products";

type OverviewSectionProps = {
  email: string | null;
  firstName: string;
  preferredName: string;
  phone: string;
  savedCount: number;
  orders: readonly AccountOrderSummary[];
};

export function OverviewSection({
  email,
  firstName,
  preferredName,
  phone,
  savedCount,
  orders,
}: OverviewSectionProps) {
  const { navigate } = useAccountUi();
  const { saved } = useAccountProducts();
  const greetingName =
    preferredName.trim() || firstName.trim() || email?.split("@")[0] || "there";
  const currentOrder = orders.find((order) => !isTerminalOrder(order)) ?? orders.at(0) ?? null;
  const recentOrders = orders.slice(0, 3);
  const railProducts = saved.slice(0, 3);

  return (
    <>
      <header className="hidden md:block">
        <Eyebrow className="text-[var(--acc-sage-deep)]">Account overview</Eyebrow>
        <h1 className="mt-4 max-w-4xl font-serif text-[clamp(3rem,6vw,5.5rem)] font-normal leading-[.91] tracking-[-.035em]">
          Welcome back, <em>{greetingName}.</em>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Review orders, delivery details and the pieces saved to your account.
        </p>
      </header>

      {!phone.trim() ? (
        <section
          className={cn(
            "mt-7 border-l-[5px] border-[var(--acc-oxblood)] p-5 sm:p-6",
            panelClass,
          )}
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow className="text-[var(--acc-oxblood)]">Account detail needed</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal leading-tight">
                Add a phone number for delivery updates.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-[var(--acc-muted)]">
                Once it is saved to your profile, checkout will reuse it instead of asking again.
              </p>
            </div>
            <AcctButton onClick={() => navigate("profile")}>Open profile</AcctButton>
          </div>
        </section>
      ) : (
        <section className={cn("mt-7 grid gap-4 p-5 sm:grid-cols-3 sm:p-6", panelClass)}>
          <OverviewMetric label="Orders" value={String(orders.length)} />
          <OverviewMetric label="Saved pieces" value={String(savedCount)} />
          <OverviewMetric label="Account email" value={email ?? "Not available"} compact />
        </section>
      )}

      {currentOrder ? (
        <CurrentOrderCard order={currentOrder} />
      ) : (
        <section className={cn("mt-6 p-6 sm:p-8", panelElevatedClass)}>
          <Eyebrow className="text-[var(--acc-muted)]">Orders</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-normal">No orders yet.</h2>
          <p className="mt-3 max-w-2xl leading-7 text-[var(--acc-muted)]">
            Your first order will appear here with its payment and fulfilment status.
          </p>
          <Button className="mt-5" nativeButton={false} render={<Link href="/products" />}>
            Browse products
          </Button>
        </section>
      )}

      <section className="mt-10 grid gap-8 xl:grid-cols-[.75fr_1.25fr]">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Quick actions</Eyebrow>
          <h2 className="mt-3 font-serif text-4xl font-normal leading-none">
            The useful parts, first.
          </h2>
          <div className="mt-6 divide-y divide-[var(--acc-line)] border-y border-[var(--acc-line)]">
            {[
              { label: "View all orders", action: () => navigate("orders") },
              { label: "Start an eligible return", action: () => navigate("returns") },
              { label: "Manage addresses", action: () => navigate("addresses") },
              { label: "Contact support", action: () => navigate("support") },
            ].map((item) => (
              <Button
                className="w-full justify-between text-left"
                key={item.label}
                onClick={item.action}
                type="button"
                variant="ghost"
              >
                <span>{item.label}</span>
                <span aria-hidden="true">→</span>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">Purchase history</Eyebrow>
              <h2 className="mt-3 font-serif text-4xl font-normal">Recent orders</h2>
            </div>
            {orders.length > 0 ? (
              <Button onClick={() => navigate("orders")} size="lg" type="button" variant="link">
                View all
              </Button>
            ) : null}
          </div>
          <div className={cn("mt-5 divide-y divide-[var(--acc-line)] overflow-hidden", panelClass)}>
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => <RecentOrderRow key={order.orderNumber} order={order} />)
            ) : (
              <p className="p-6 text-sm leading-6 text-[var(--acc-muted)]">
                No purchase history is available yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow className="text-[var(--acc-sage-deep)]">Saved pieces</Eyebrow>
            <h2 className="mt-3 font-serif text-[clamp(2.5rem,5vw,4rem)] font-normal leading-none">
              Still thinking about these.
            </h2>
          </div>
          <Button onClick={() => navigate("saved")} size="lg" type="button" variant="link">
            Open saved items
          </Button>
        </div>
        {railProducts.length > 0 ? (
          <AccountProductGrid className="mt-7" layout="rail" products={railProducts} />
        ) : (
          <div className={cn("mt-7 p-6 text-sm leading-6 text-[var(--acc-muted)]", panelClass)}>
            You have not saved any pieces yet. Use the heart control on a product to keep it here.
          </div>
        )}
      </section>
    </>
  );
}

function CurrentOrderCard({ order }: { order: AccountOrderSummary }) {
  const status = primaryStatus(order);
  const progress = orderProgress(order);
  return (
    <section className={cn("mt-6 overflow-hidden", panelElevatedClass)}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--acc-line)] p-5 sm:p-6">
        <div>
          <Eyebrow className="text-[var(--acc-muted)]">Latest order</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-normal">
            Order <span className={cn(monoClass, "text-2xl")}>{order.orderNumber}</span>
          </h2>
        </div>
        <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
      </div>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[170px_minmax(0,1fr)_auto] lg:items-center">
        <OrderImageGrid images={order.images} />
        <div>
          <p className="text-xl font-semibold">
            {order.itemCount} {order.itemCount === 1 ? "piece" : "pieces"} ·{" "}
            <span className={monoClass}>{formatMoney(order.totalKobo, order.currency)}</span>
          </p>
          <p className="mt-2 text-[var(--acc-muted)]">
            Placed {formatDate(order.placedAt)} · {order.itemNames.slice(0, 2).join(", ")}
          </p>
          <div className="mt-6 grid grid-cols-4 gap-2" aria-label={`Order progress: ${status.label}`}>
            {["Placed", "Paid", "Processing", "Delivered"].map((label, index) => (
              <div key={label}>
                <span
                  className={cn(
                    "block h-1.5 rounded-full",
                    index <= progress
                      ? "bg-[var(--acc-sage-deep)]"
                      : "bg-[var(--acc-line-strong)]",
                  )}
                />
                <p
                  className={cn(
                    "mt-2 text-xs",
                    index <= progress ? "font-semibold" : "text-[var(--acc-muted)]",
                  )}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <AcctButton
          nativeButton={false}
          render={<Link href={`/account/orders/${encodeURIComponent(order.orderNumber)}`} />}
          variant="secondary"
        >
          View order
        </AcctButton>
      </div>
    </section>
  );
}

function RecentOrderRow({ order }: { order: AccountOrderSummary }) {
  const image = order.images.at(0) ?? null;
  const status = primaryStatus(order);
  return (
    <article className="grid gap-4 p-5 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
      <OrderImage image={image} />
      <div>
        <p className={cn("font-semibold", monoClass)}>{order.orderNumber}</p>
        <p className="mt-1 text-sm text-[var(--acc-muted)]">
          {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
          {formatDate(order.placedAt)} · {formatMoney(order.totalKobo, order.currency)}
        </p>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
        <Button
          nativeButton={false}
          render={<Link href={`/account/orders/${encodeURIComponent(order.orderNumber)}`} />}
          size="sm"
          variant="ghost"
        >
          View
        </Button>
      </div>
    </article>
  );
}

function OrderImageGrid({ images }: { images: readonly AccountOrderImage[] }) {
  const visible = images.slice(0, 2);
  if (visible.length === 0) {
    return <div className="aspect-[4/3] rounded-lg bg-[var(--acc-bone-2)]" aria-hidden="true" />;
  }
  return (
    <div className={cn("grid gap-2", visible.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
      {visible.map((image) => (
        <OrderImage image={image} key={`${image.src}:${image.alt}`} />
      ))}
    </div>
  );
}

function OrderImage({ image }: { image: AccountOrderImage | null }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-[var(--acc-bone-2)]">
      {image ? (
        <CloudImage
          alt={image.alt}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 88px, 25vw"
          src={image.src}
        />
      ) : null}
    </div>
  );
}

function OverviewMetric({
  compact = false,
  label,
  value,
}: {
  compact?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <Eyebrow className="text-[var(--acc-muted)]">{label}</Eyebrow>
      <p
        className={cn(
          "mt-2 truncate font-semibold",
          compact ? "text-sm" : "font-serif text-3xl font-normal",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function primaryStatus(order: AccountOrderSummary): {
  label: string;
  variant: StatusVariant;
} {
  if (order.paymentStatus.code !== "paid") {
    return {
      label: order.paymentStatus.label,
      variant:
        order.paymentStatus.code === "cancelled" || order.paymentStatus.code === "refunded"
          ? "danger"
          : order.paymentStatus.code === "review_required"
            ? "warning"
            : "neutral",
    };
  }
  const code = order.fulfilmentStatus.code;
  return {
    label: order.fulfilmentStatus.label,
    variant:
      code === "delivered"
        ? "success"
        : code === "cancelled" || code === "returned"
          ? "danger"
          : code === "processing" || code === "ready_for_dispatch" || code === "dispatched"
            ? "warning"
            : "neutral",
  };
}

function orderProgress(order: AccountOrderSummary): number {
  if (order.paymentStatus.code !== "paid") return 0;
  switch (order.fulfilmentStatus.code) {
    case "delivered":
    case "partially_returned":
    case "returned":
      return 3;
    case "processing":
    case "ready_for_dispatch":
    case "dispatched":
      return 2;
    default:
      return 1;
  }
}

function isTerminalOrder(order: AccountOrderSummary): boolean {
  return (
    order.paymentStatus.code === "cancelled" ||
    order.fulfilmentStatus.code === "cancelled" ||
    order.fulfilmentStatus.code === "delivered" ||
    order.fulfilmentStatus.code === "returned"
  );
}

function formatMoney(amountKobo: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

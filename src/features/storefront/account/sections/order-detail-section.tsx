"use client";

import { cn } from "@/lib/utils";
import { products } from "../../home-lab/data";
import { useAccountUi } from "../account-context";
import {
  AcctButton,
  Eyebrow,
  monoClass,
  PlaceholderLink,
  ProgressTrack,
  panelClass,
  panelElevatedClass,
  StatusBadge,
  TimelineDot,
} from "../components/account-primitives";

const thumbLinkClass =
  "block overflow-hidden rounded-[10px] border border-[var(--acc-line)] bg-[var(--acc-bone-2)]";

export function OrderDetailSection() {
  const { navigate, openModal, toast } = useAccountUi();

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("orders")}
        className="mb-5 text-sm font-semibold underline underline-offset-4"
      >
        ← Back to orders
      </button>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Order detail</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Order <span className={cn(monoClass, "text-[.6em]")}>#LS-1048</span>
          </h1>
          <p className="mt-4 text-[var(--acc-muted)]">
            Placed 12 July 2026 · Total <span className={monoClass}>₦63,000</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AcctButton variant="secondary" onClick={() => toast("Receipt download would start.")}>
            Receipt
          </AcctButton>
          <AcctButton onClick={() => toast("Carrier tracking would open.")}>
            Track shipment
          </AcctButton>
        </div>
      </header>

      {/* Progress */}
      <section className={cn("mt-7 p-5 sm:p-6", panelElevatedClass)}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl font-normal">Progress</h2>
          <StatusBadge variant="success">Shipped</StatusBadge>
        </div>
        <ProgressTrack>
          <li className="grid grid-cols-[31px_1fr] gap-4">
            <TimelineDot state="complete">✓</TimelineDot>
            <div>
              <p className="font-semibold">Order placed</p>
              <p className="mt-1 text-sm text-[var(--acc-muted)]">12 Jul · 10:04</p>
            </div>
          </li>
          <li className="grid grid-cols-[31px_1fr] gap-4">
            <TimelineDot state="complete">✓</TimelineDot>
            <div>
              <p className="font-semibold">Payment confirmed</p>
              <p className="mt-1 text-sm text-[var(--acc-muted)]">12 Jul · 10:06</p>
            </div>
          </li>
          <li className="grid grid-cols-[31px_1fr] gap-4">
            <TimelineDot state="complete">✓</TimelineDot>
            <div>
              <p className="font-semibold">Shipped with DHL Express</p>
              <p className="mt-1 text-sm text-[var(--acc-muted)]">14 Jul · 16:42</p>
            </div>
          </li>
          <li className="grid grid-cols-[31px_1fr] gap-4">
            <TimelineDot state="pending">4</TimelineDot>
            <div>
              <p className="font-semibold text-[var(--acc-muted)]">Delivered</p>
              <p className="mt-1 text-sm text-[var(--acc-muted)]">Pending real carrier event</p>
            </div>
          </li>
        </ProgressTrack>
      </section>

      {/* Items */}
      <section className={cn("mt-6 overflow-hidden", panelClass)}>
        <div className="border-b border-[var(--acc-line)] p-5">
          <h2 className="font-serif text-3xl font-normal">Items</h2>
        </div>
        <article className="grid gap-5 border-b border-[var(--acc-line)] p-5 sm:grid-cols-[110px_minmax(0,1fr)_auto]">
          <PlaceholderLink className={cn(thumbLinkClass, "aspect-[4/5]")}>
            <img
              src={products[0].images[0]}
              alt="Broken-in Leather Moto"
              className="h-full w-full object-cover [filter:saturate(0.72)_contrast(0.97)]"
            />
          </PlaceholderLink>
          <div>
            <PlaceholderLink className="font-semibold underline underline-offset-4">
              Broken-in Leather Moto
            </PlaceholderLink>
            <p className="mt-2 text-sm text-[var(--acc-muted)]">Large · Quantity 1</p>
            <p className={cn("mt-2", monoClass)}>₦41,000</p>
            <p className="mt-3 text-sm text-[var(--acc-muted)]">
              Eligible for return after delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openModal("cancel")}
            className="text-sm font-semibold acc-fg-oxblood underline underline-offset-4"
          >
            Cancel item
          </button>
        </article>
        <article className="grid gap-5 p-5 sm:grid-cols-[110px_minmax(0,1fr)_auto]">
          <PlaceholderLink className={cn(thumbLinkClass, "aspect-[4/5]")}>
            <img
              src={products[1].images[0]}
              alt="Reworked Indigo Denim"
              className="h-full w-full object-cover [filter:saturate(0.72)_contrast(0.97)]"
            />
          </PlaceholderLink>
          <div>
            <PlaceholderLink className="font-semibold underline underline-offset-4">
              Reworked Indigo Denim
            </PlaceholderLink>
            <p className="mt-2 text-sm text-[var(--acc-muted)]">W 32 · Quantity 1</p>
            <p className={cn("mt-2", monoClass)}>₦22,000</p>
            <p className="mt-3 text-sm text-[var(--acc-muted)]">
              Already with carrier; cancellation unavailable.
            </p>
          </div>
          <span className="text-sm text-[var(--acc-muted)]">Not cancellable</span>
        </article>
      </section>

      {/* Delivery + payment */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={cn("p-5 sm:p-6", panelClass)}>
          <Eyebrow className="text-[var(--acc-muted)]">Delivery</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-normal">Lekki, Lagos</h2>
          <address className="mt-4 not-italic leading-7 text-[var(--acc-muted)]">
            Ada Okafor
            <br />
            18 Example Road
            <br />
            Lekki Phase 1, Lagos
            <br />
            Nigeria
          </address>
          <p className="mt-5 border-t border-[var(--acc-line)] pt-4 text-sm">
            <strong>DHL Express</strong>
            <br />
            <span className={cn(monoClass, "text-[var(--acc-muted)]")}>DHL-83920102</span>
          </p>
        </section>
        <section className={cn("p-5 sm:p-6", panelClass)}>
          <Eyebrow className="text-[var(--acc-muted)]">Payment summary</Eyebrow>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd className={monoClass}>₦63,000</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery</dt>
              <dd className={monoClass}>₦0</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Tax</dt>
              <dd>Included</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--acc-line)] pt-4 text-lg font-semibold">
              <dt>Total</dt>
              <dd className={monoClass}>₦63,000</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-[var(--acc-muted)]">
            Visa ending 4242 · Payment confirmed
          </p>
        </section>
      </div>
    </>
  );
}

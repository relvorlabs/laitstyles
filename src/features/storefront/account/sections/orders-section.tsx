"use client";

import { cn } from "@/lib/utils";
import { useStorefront } from "../../shared/storefront-provider";
import { useAccountUi } from "../account-context";
import { ProductThumb } from "../components/account-garments";
import {
  AcctButton,
  Eyebrow,
  fieldClass,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
} from "../components/account-primitives";

export function OrdersSection() {
  const { products } = useStorefront();
  const { navigate, openModal, toast } = useAccountUi();

  return (
    <>
      <header>
        <Eyebrow className="text-[var(--acc-sage-deep)]">Purchase history</Eyebrow>
        <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93] tracking-[-.03em]">
          Orders.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          Payment and fulfillment stay separate, so the current state is always clear.
        </p>
      </header>

      <div className={cn("mt-7 p-4", panelClass)}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_170px_auto]">
          <input
            className={fieldClass}
            type="search"
            placeholder="Search order or product"
            aria-label="Search orders"
          />
          <select className={fieldClass} aria-label="Filter by status">
            <option>All statuses</option>
            <option>Processing</option>
            <option>Shipped</option>
            <option>Delivered</option>
            <option>Refunded</option>
          </select>
          <select className={fieldClass} aria-label="Sort orders">
            <option>Newest first</option>
            <option>Oldest first</option>
          </select>
          <AcctButton variant="secondary" onClick={() => toast("Order filters applied.")}>
            Apply
          </AcctButton>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* LS-1048 */}
        <article className={cn("overflow-hidden", panelElevatedClass)}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--acc-line)] p-5">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">
                Order <span className={monoClass}>#LS-1048</span>
              </Eyebrow>
              <p className="mt-2 text-sm text-[var(--acc-muted)]">
                12 July 2026 · <span className={monoClass}>₦63,000</span>
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge variant="neutral">Paid</StatusBadge>
              <StatusBadge variant="success">Shipped</StatusBadge>
            </div>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center">
            <div className="grid grid-cols-2 gap-2">
              <ProductThumb product={products[0]} className="aspect-square" />
              <ProductThumb product={products[1]} className="aspect-square" />
            </div>
            <div>
              <p className="text-lg font-semibold">2 items</p>
              <p className="mt-2 text-[var(--acc-muted)]">Estimated arrival Friday, 17 July</p>
              <p className="mt-2 text-sm text-[var(--acc-muted)]">DHL Express · Shipment 1 of 1</p>
            </div>
            <div className="grid gap-3">
              <AcctButton onClick={() => toast("Carrier tracking would open.")}>Track</AcctButton>
              <AcctButton variant="secondary" onClick={() => navigate("order-detail")}>
                Details
              </AcctButton>
            </div>
          </div>
        </article>

        {/* LS-0977 */}
        <article className={cn("overflow-hidden", panelClass)}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--acc-line)] p-5">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">
                Order <span className={monoClass}>#LS-0977</span>
              </Eyebrow>
              <p className="mt-2 text-sm text-[var(--acc-muted)]">
                18 May 2026 · <span className={monoClass}>₦28,500</span>
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge variant="neutral">Paid</StatusBadge>
              <StatusBadge variant="neutral">Delivered</StatusBadge>
            </div>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center">
            <ProductThumb product={products[6] ?? products[2]} className="aspect-[4/3]" />
            <div>
              <p className="text-lg font-semibold">1 item</p>
              <p className="mt-2 text-[var(--acc-muted)]">Delivered 23 May 2026</p>
              <p className="mt-2 text-sm text-[var(--acc-warning)]">
                Return window closes in 2 days
              </p>
            </div>
            <div className="grid gap-3">
              <AcctButton onClick={() => openModal("return")}>Start return</AcctButton>
              <AcctButton variant="secondary" onClick={() => navigate("order-detail")}>
                Details
              </AcctButton>
            </div>
          </div>
        </article>

        {/* LS-0891 */}
        <article
          className={cn("overflow-hidden border-l-[5px] border-l-[var(--acc-oxblood)]", panelClass)}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">
                Order <span className={monoClass}>#LS-0891</span>
              </Eyebrow>
              <h2 className="mt-3 font-serif text-2xl font-normal">Payment needs attention.</h2>
              <p className="mt-2 text-[var(--acc-muted)]">
                This order has not entered fulfillment.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <AcctButton onClick={() => toast("Retry payment would use the existing provider.")}>
                Retry payment
              </AcctButton>
              <AcctButton variant="secondary" onClick={() => navigate("order-detail")}>
                Details
              </AcctButton>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}

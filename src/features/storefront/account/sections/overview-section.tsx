"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStorefront } from "../../shared/storefront-provider";
import { useAccountUi } from "../account-context";
import { ProductThumb } from "../components/account-garments";
import {
  AcctButton,
  Eyebrow,
  monoClass,
  panelClass,
  panelElevatedClass,
  StatusBadge,
} from "../components/account-primitives";
import { AccountProductGrid, useAccountProducts } from "../components/account-product-grid";

export function OverviewSection() {
  const { products } = useStorefront();
  const { navigate, openModal, toast } = useAccountUi();
  const { saved } = useAccountProducts();

  const railProducts = (
    saved.length ? saved : products.filter((p) => p.status === "available")
  ).slice(0, 3);

  return (
    <>
      <header className="hidden md:block">
        <Eyebrow className="text-[var(--acc-sage-deep)]">Account overview</Eyebrow>
        <h1 className="mt-4 max-w-4xl font-serif text-[clamp(3rem,6vw,5.5rem)] font-normal leading-[.91] tracking-[-.035em]">
          Good afternoon, <em>Ada.</em>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
          The account surfaces the thing that needs attention first, then gets out of the way.
        </p>
      </header>

      <section
        className={cn("mt-7 border-l-[5px] border-[var(--acc-oxblood)] p-5 sm:p-6", panelClass)}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Eyebrow className="text-[var(--acc-oxblood)]">Action required</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-normal leading-tight">
              Verify your email address.
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-[var(--acc-muted)]">
              Verification protects order updates and sensitive account changes.
            </p>
          </div>
          <AcctButton onClick={() => openModal("verify-email")}>Verify email</AcctButton>
        </div>
      </section>

      <section className={cn("mt-6 overflow-hidden", panelElevatedClass)}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--acc-line)] p-5 sm:p-6">
          <div>
            <Eyebrow className="text-[var(--acc-muted)]">Current order</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-normal">
              Order <span className={cn(monoClass, "text-2xl")}>#LS-1048</span>
            </h2>
          </div>
          <StatusBadge variant="success">Shipped</StatusBadge>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[170px_minmax(0,1fr)_auto] lg:items-center">
          <div className="grid grid-cols-2 gap-2">
            <ProductThumb product={products[0]} className="aspect-[3/4]" />
            <ProductThumb product={products[1]} className="aspect-[3/4]" />
          </div>

          <div>
            <p className="text-xl font-semibold">
              2 pieces · <span className={monoClass}>₦63,000</span>
            </p>
            <p className="mt-2 text-[var(--acc-muted)]">Estimated arrival Friday, 17 July</p>

            <div className="mt-6 grid grid-cols-4 gap-2">
              <div>
                <span className="block h-1.5 rounded-full bg-[var(--acc-ink)]" />
                <p className="mt-2 text-xs font-semibold">Placed</p>
              </div>
              <div>
                <span className="block h-1.5 rounded-full bg-[var(--acc-ink)]" />
                <p className="mt-2 text-xs font-semibold">Paid</p>
              </div>
              <div>
                <span className="block h-1.5 rounded-full bg-[var(--acc-sage-deep)]" />
                <p className="mt-2 text-xs font-semibold">Shipped</p>
              </div>
              <div>
                <span className="block h-1.5 rounded-full bg-[var(--acc-line-strong)]" />
                <p className="mt-2 text-xs text-[var(--acc-muted)]">Delivered</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {/* TODO(button-action): Open the carrier tracking URL after fulfillment events expose a trusted tracking link. */}
            <AcctButton onClick={() => toast("Carrier tracking is not available yet.")}>
              Track order
            </AcctButton>
            <AcctButton variant="secondary" onClick={() => navigate("order-detail")}>
              View order
            </AcctButton>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-8 xl:grid-cols-[.75fr_1.25fr]">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Quick actions</Eyebrow>
          <h2 className="mt-3 font-serif text-4xl font-normal leading-none">
            The useful parts, first.
          </h2>
          <div className="mt-6 divide-y divide-[var(--acc-line)] border-y border-[var(--acc-line)]">
            {[
              { label: "View all orders", action: () => navigate("orders") },
              { label: "Start an eligible return", action: () => openModal("return") },
              { label: "Manage addresses", action: () => navigate("addresses") },
              { label: "Contact support", action: () => navigate("support") },
            ].map((item) => (
              <Button
                key={item.label}
                type="button"
                onClick={item.action}
                className="w-full justify-between text-left"
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
            <Button size="lg" type="button" onClick={() => navigate("orders")} variant="link">
              View all
            </Button>
          </div>

          <div className={cn("mt-5 divide-y divide-[var(--acc-line)] overflow-hidden", panelClass)}>
            <article className="grid gap-4 p-5 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
              <ProductThumb product={products[0]} className="aspect-square" />
              <div>
                <p className={cn("font-semibold", monoClass)}>#LS-1048</p>
                <p className="mt-1 text-sm text-[var(--acc-muted)]">2 items · 12 Jul · ₦63,000</p>
              </div>
              <AcctButton variant="secondary" onClick={() => navigate("order-detail")}>
                View
              </AcctButton>
            </article>
            <article className="grid gap-4 p-5 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
              <ProductThumb product={products[6] ?? products[2]} className="aspect-square" />
              <div>
                <p className={cn("font-semibold", monoClass)}>#LS-0977</p>
                <p className="mt-1 text-sm text-[var(--acc-muted)]">1 item · 18 May · ₦28,500</p>
              </div>
              <StatusBadge variant="neutral">Delivered</StatusBadge>
            </article>
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
          <Button size="lg" type="button" onClick={() => navigate("saved")} variant="link">
            Open saved items
          </Button>
        </div>

        <AccountProductGrid products={railProducts} layout="rail" className="mt-7" />
      </section>
    </>
  );
}

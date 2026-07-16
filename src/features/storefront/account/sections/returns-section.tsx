"use client";

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

export function ReturnsSection() {
  const { products } = useStorefront();
  const { navigate, openModal } = useAccountUi();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow className="text-[var(--acc-sage-deep)]">Post-purchase</Eyebrow>
          <h1 className="mt-4 font-serif text-[clamp(3rem,6vw,5rem)] font-normal leading-[.93]">
            Returns.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--acc-muted)]">
            Every request stays connected to the order, item, outcome and refund method.
          </p>
        </div>
        <AcctButton onClick={() => openModal("return")}>Start a return</AcctButton>
      </header>

      <div className="mt-7 space-y-4">
        <article className={cn("overflow-hidden", panelElevatedClass)}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--acc-line)] p-5">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">
                Return <span className={monoClass}>#RT-0038</span>
              </Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">Ship this item by 20 July.</h2>
            </div>
            <StatusBadge variant="warning">Awaiting shipment</StatusBadge>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[120px_minmax(0,1fr)_auto] lg:items-center">
            <ProductThumb product={products[1]} className="aspect-square" />
            <div>
              <p className="font-semibold">1 item · Refund requested</p>
              <p className="mt-2 text-[var(--acc-muted)]">
                Estimated refund <span className={monoClass}>₦24,000</span>
              </p>
            </div>
            <AcctButton onClick={() => navigate("return-detail")}>View instructions</AcctButton>
          </div>
        </article>

        <article className={cn("overflow-hidden", panelClass)}>
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <Eyebrow className="text-[var(--acc-muted)]">
                Return <span className={monoClass}>#RT-0021</span>
              </Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-normal">Refund complete.</h2>
              <p className="mt-2 text-[var(--acc-muted)]">₦18,500 returned to Visa ending 4242.</p>
            </div>
            <StatusBadge variant="success">Refunded</StatusBadge>
          </div>
        </article>
      </div>
    </>
  );
}

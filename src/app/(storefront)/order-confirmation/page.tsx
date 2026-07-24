"use client";

import { Check, Home, MapPin, PackageCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  getLatestOrderSnapshot,
  getServerOrderSnapshot,
  parseOrderReceiptSnapshot,
  subscribeToLatestOrder,
} from "@/features/storefront/checkout/order-receipt";
import { money } from "@/features/storefront/shared/catalogue-data";

export default function OrderConfirmationPage() {
  const receiptSnapshot = useSyncExternalStore(
    subscribeToLatestOrder,
    getLatestOrderSnapshot,
    getServerOrderSnapshot,
  );
  const receipt = useMemo(() => parseOrderReceiptSnapshot(receiptSnapshot), [receiptSnapshot]);

  if (!receipt) return <MissingReceipt />;

  return (
    <main className="min-h-dvh bg-[#ECEBE6] px-5 pb-[50px] pt-[26px] text-[#1B1A17] max-sm:px-4">
      <div className="mx-auto w-full max-w-[640px]">
        <div className="flex items-center justify-center px-1 pb-6">
          <Link className="flex items-center gap-[9px]" href="/">
            <Home aria-hidden="true" className="size-5" strokeWidth={1.9} />
            <span className="text-[15px] font-semibold tracking-[.26em]">LAITSTYLE</span>
          </Link>
        </div>

        <article className="overflow-hidden rounded-[16px] bg-white shadow-[0_30px_80px_rgba(0,0,0,.10)]">
          <header className="border-b border-[#F0EEE8] bg-[linear-gradient(180deg,#F4F6EE_0%,#FFFFFF_100%)] px-[34px] pb-10 pt-[52px] text-center max-sm:px-5">
            <div className="mx-auto mb-6 flex size-[78px] animate-[leemPop_.5s_cubic-bezier(.33,1,.68,1)] items-center justify-center rounded-full border border-[#CFDCB4] bg-[#EAF0DD]">
              <Check aria-hidden="true" className="size-9 text-[#5F7043]" strokeWidth={2.4} />
            </div>
            <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[.28em] text-[#7C8C63]">
              Order confirmed
            </div>
            <h1 className="mb-2.5 font-serif text-[34px] font-medium leading-[1.15]">
              They&apos;re yours, {receipt.firstName || "there"}.
            </h1>
            <p className="mx-auto max-w-[430px] text-[14.5px] leading-[1.6] text-[#57554E]">
              Your order summary is saved for this session. A receipt is on its way to{" "}
              <strong className="text-[#1B1A17]">{receipt.email}</strong>.
            </p>
          </header>

          <section className="flex flex-wrap gap-5 border-b border-[#F0EEE8] px-[34px] py-[26px] max-sm:px-5">
            <MetaBlock label="Order number" value={`#${receipt.orderNumber}`} />
            <div className="min-w-[160px] flex-1">
              <div className="mb-1 text-[11px] uppercase tracking-[.06em] text-[#A7A59B]">
                Payment
              </div>
              <div className="flex items-center gap-1.5 text-[15px] font-semibold">
                {receipt.paymentName}
                <span className="rounded-[5px] bg-[#EAF0DD] px-1.5 py-0.5 text-[10px] font-bold text-[#5F7043]">
                  PAID
                </span>
              </div>
            </div>
            <MetaBlock label="Est. delivery" value={receipt.eta} />
          </section>

          <section className="px-[34px] pb-2 pt-7 max-sm:px-5">
            <div className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[.04em] text-[#57554E]">
              Delivering to
            </div>
            <div className="flex items-start gap-3 border-b border-[#F4F3EE] pb-[22px] pt-3.5">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-[18px] shrink-0 text-[#7C8C63]"
                strokeWidth={1.8}
              />
              <address className="not-italic text-[13.5px] leading-[1.65] text-[#3D3B35]">
                {receipt.firstName}
                <br />
                {receipt.address}
                <br />
                {receipt.city}, {receipt.country}
                <br />
                {receipt.phone}
              </address>
            </div>
          </section>

          <section className="px-[34px] pb-1.5 pt-5 max-sm:px-5">
            {receipt.items.map((item) => (
              <div
                className="flex items-center gap-3.5 border-b border-[#F4F3EE] py-3"
                key={item.lineKey}
              >
                <div className="relative h-[70px] w-[58px] shrink-0 overflow-hidden rounded-[9px] bg-[#E4E5DE]">
                  {item.imageUrl ? (
                    <Image
                      alt={item.name}
                      className="object-cover"
                      fill
                      sizes="58px"
                      src={item.imageUrl}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link className="text-[14px] font-medium" href={`/products/${item.slug}`}>
                    {item.name}
                  </Link>
                  <div className="mt-0.5 text-[12px] text-[#8A887E]">
                    Size {item.size ?? "—"} · {item.colour ?? "—"} · Grade {item.condition}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-[#A7A59B]">
                    Quantity {item.quantity}
                  </div>
                </div>
                <div className="shrink-0 text-[14px] font-semibold">
                  {money(item.unitPriceNaira * item.quantity)}
                </div>
              </div>
            ))}
          </section>

          <section className="px-[34px] pb-2 pt-[18px] max-sm:px-5">
            <SummaryRow label="Subtotal" value={money(receipt.subtotal)} />
            <SummaryRow label={`Delivery · ${receipt.zoneName}`} value={money(receipt.shipping)} />
            <SummaryRow label="VAT (7.5%)" value={money(receipt.vat)} />
            <div className="mt-3.5 flex items-baseline justify-between border-t border-[#ECEAE3] pt-3.5">
              <span className="text-[16px] font-semibold">Total paid</span>
              <span className="text-[20px] font-semibold">{money(receipt.total)}</span>
            </div>
          </section>

          <section className="px-[34px] pb-[30px] pt-[22px] max-sm:px-5">
            <div className="flex items-start gap-3 rounded-xl border border-[#EEECE5] bg-[#F7F7F3] px-[18px] py-4">
              <Truck
                aria-hidden="true"
                className="mt-0.5 size-[18px] shrink-0 text-[#7C8C63]"
                strokeWidth={1.8}
              />
              <div>
                <div className="text-[13.5px] font-semibold">Tracking on the way</div>
                <div className="mt-1 text-[12.5px] leading-[1.55] text-[#57554E]">
                  We&apos;ll text your tracking link when the parcel is booked.
                </div>
              </div>
            </div>

            <div className="mt-[22px] flex flex-wrap gap-3">
              <Button
                className="min-w-[180px] flex-1"
                nativeButton={false}
                render={<Link href="/products" />}
                size="lg"
              >
                Continue shopping
              </Button>
              <Button
                className="min-w-[180px] flex-1"
                nativeButton={false}
                render={<Link href="/account?tab=orders" />}
                size="lg"
                variant="outline"
              >
                View my orders
              </Button>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}

function MissingReceipt() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#ECEBE6] px-5 py-10 text-[#1B1A17]">
      <section className="w-full max-w-[620px] rounded-[16px] bg-white px-8 py-14 text-center shadow-[0_30px_80px_rgba(0,0,0,.10)]">
        <div className="mx-auto flex size-[78px] items-center justify-center rounded-full bg-[#F2F4EA] text-[#7C8C63]">
          <PackageCheck aria-hidden="true" className="size-8" />
        </div>
        <h1 className="mt-6 font-serif text-[34px] font-medium">No recent order found</h1>
        <p className="mx-auto mt-2 max-w-[440px] text-[14px] leading-[1.6] text-[#57554E]">
          This confirmation is created after checkout. Your existing purchases remain available from
          your account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/account?tab=orders" />}
            size="lg"
            variant="outline"
          >
            View my orders
          </Button>
          <Button nativeButton={false} render={<Link href="/products" />} size="lg">
            Continue shopping
          </Button>
        </div>
      </section>
    </main>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[160px] flex-1">
      <div className="mb-1 text-[11px] uppercase tracking-[.06em] text-[#A7A59B]">{label}</div>
      <div className="text-[15px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2.5 flex justify-between gap-4 text-[13.5px]">
      <span className="text-[#57554E]">{label}</span>
      <span className="text-[#1B1A17]">{value}</span>
    </div>
  );
}

"use client";

import { Clock, Home, LockKeyhole, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { money as naira } from "@/features/storefront/shared/catalogue-data";
import {
  useStorefrontCart,
  useStorefrontHolds,
} from "@/features/storefront/shared/storefront-runtime";

const USD_RATE = 1600;

type Currency = "NGN" | "USD";

export default function CartPage() {
  const cart = useStorefrontCart();
  const holds = useStorefrontHolds();
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [discountInput, setDiscountInput] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountMessage, setDiscountMessage] = useState("");

  const heldLines = cart.views.filter(
    ({ product }) => (holds.secondsByProduct[product.id] ?? 0) > 0,
  );
  const soonestHoldSeconds = heldLines.length
    ? Math.min(
        ...heldLines.map(({ product }) => holds.secondsByProduct[product.id] ?? 0),
      )
    : 0;
  const itemCount = cart.count;

  const totals = useMemo(() => {
    const subtotal = cart.views.reduce(
      (sum, line) => sum + line.unitPriceNaira * line.lineQty,
      0,
    );
    const discount = discountApplied ? Math.round(subtotal * 0.1) : 0;
    const shipping = itemCount ? 3500 : 0;
    const vat = Math.round((subtotal - discount) * 0.075);
    return {
      subtotal,
      discount,
      shipping,
      vat,
      total: subtotal - discount + shipping + vat,
    };
  }, [cart.views, discountApplied, itemCount]);

  function formatMoney(value: number) {
    if (currency === "NGN") return naira(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value / USD_RATE);
  }

  function applyDiscount() {
    const valid = discountInput.trim().toUpperCase() === "LAIT10";
    setDiscountApplied(valid);
    setDiscountMessage(
      valid
        ? "LAIT10 applied — 10% off your pieces."
        : "That code is not active. Try LAIT10 for this preview.",
    );
  }

  return (
    <main className="min-h-dvh bg-[#ECEBE6] px-5 py-[26px] text-[#1B1A17] max-sm:px-4">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="flex items-center justify-between px-1 pb-[22px]">
          <Link className="flex items-center gap-[9px]" href="/">
            <Home aria-hidden="true" className="size-5" strokeWidth={1.9} />
            <span className="text-[15px] font-semibold tracking-[.26em]">LAITSTYLE</span>
          </Link>
          <div className="flex items-center gap-1.5" aria-label="Currency">
            <CurrencyButton active={currency === "NGN"} onClick={() => setCurrency("NGN")}>
              ₦ NGN
            </CurrencyButton>
            <CurrencyButton active={currency === "USD"} onClick={() => setCurrency("USD")}>
              $ USD
            </CurrencyButton>
          </div>
        </div>

        {cart.views.length ? (
          <div className="flex flex-wrap items-start gap-[22px]">
            <section className="min-w-[300px] flex-[1_1_560px] rounded-[16px] bg-white px-8 pb-[34px] pt-[30px] shadow-[0_30px_80px_rgba(0,0,0,.10)] max-sm:px-5">
              <div className="mb-1.5 flex items-baseline justify-between gap-4">
                <h1 className="font-serif text-[30px] font-medium">Your bag</h1>
                <span className="text-[13px] text-[#8A887E]">
                  {itemCount} {itemCount === 1 ? "piece" : "pieces"}
                </span>
              </div>
              <p className="mb-5 font-serif text-[13px] italic text-[#8A887E]">
                Your selections use the same bag shown in the header and checkout.
              </p>

              <div
                className={
                  soonestHoldSeconds > 0
                    ? "mb-[22px] flex items-center gap-2.5 rounded-xl border border-[#D6DAC8] bg-[#F2F4EA] px-4 py-3 text-[#4A5540]"
                    : "mb-[22px] flex items-center gap-2.5 rounded-xl border border-[#E4E2DA] bg-[#F7F6F1] px-4 py-3 text-[#57554E]"
                }
              >
                <span
                  className={
                    soonestHoldSeconds > 0
                      ? "size-[9px] shrink-0 animate-[leemPulse_1.6s_ease-in-out_infinite] rounded-full bg-[#7C8C63]"
                      : "size-[9px] shrink-0 rounded-full bg-[#A7A59B]"
                  }
                />
                <span aria-live="polite" className="text-[13px] leading-[1.4]">
                  {soonestHoldSeconds > 0 ? (
                    <>
                      Your next hold releases in{" "}
                      <strong className="tabular-nums">
                        {formatHoldTime(soonestHoldSeconds)}
                      </strong>
                    </>
                  ) : (
                    "Availability is confirmed again when you continue to checkout."
                  )}
                </span>
              </div>

              <div>
                {cart.views.map(
                  ({ product, lineKey, lineQty, variantLabel, colour, size, unitPriceNaira }) => {
                    const holdSeconds = holds.secondsByProduct[product.id] ?? 0;
                    const held = holdSeconds > 0;
                    return (
                      <article
                        className="flex gap-4 border-t border-[#F0EEE8] py-[18px]"
                        key={lineKey}
                      >
                        <Link
                          className="relative h-28 w-[88px] shrink-0 overflow-hidden rounded-[11px] bg-[#E4E5DE]"
                          href={`/products/${product.slug}`}
                        >
                          {product.images[0] ? (
                            <Image
                              alt={product.name}
                              className="object-cover"
                              fill
                              sizes="88px"
                              src={product.images[0]}
                            />
                          ) : null}
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                className="text-[15px] font-medium"
                                href={`/products/${product.slug}`}
                              >
                                {product.name}
                              </Link>
                              <div className="mt-1 text-[12.5px] text-[#8A887E]">
                                Size {size ?? variantLabel ?? product.size} ·{" "}
                                {colour ?? product.colour} · Grade {product.condition}
                              </div>
                              <div className="mt-0.5 text-[12px] text-[#A7A59B]">
                                {product.inventory === "one-of-one"
                                  ? "One-of-one Laitstyle piece"
                                  : `Quantity ${lineQty}`}
                              </div>
                            </div>
                            <div className="shrink-0 text-[15px] font-semibold">
                              {formatMoney(unitPriceNaira * lineQty)}
                            </div>
                          </div>

                          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                            {held ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6DAC8] bg-[#F2F4EA] px-[11px] py-[5px] text-[11.5px] font-semibold text-[#4A5540]">
                                <Clock aria-hidden="true" className="size-3" />
                                Held ·{" "}
                                <span className="tabular-nums">
                                  {formatHoldTime(holdSeconds)}
                                </span>
                              </span>
                            ) : product.inventory === "one-of-one" ? (
                              <Button
                                className="h-auto px-0 text-[11.5px]"
                                onClick={() => holds.holdProduct(product.id)}
                                type="button"
                                variant="link"
                              >
                                Hold for 15 minutes
                              </Button>
                            ) : (
                              <span className="text-[11.5px] text-[#8A887E]">
                                {lineQty} in your bag
                              </span>
                            )}
                            <Button
                              className="h-auto gap-1.5"
                              onClick={() => {
                                cart.removeLine(lineKey);
                                holds.releaseProduct(product.id);
                              }}
                              type="button"
                              variant="link"
                            >
                              <Trash2 aria-hidden="true" className="size-[13px]" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>

              <Link
                className="mt-5 inline-flex items-center gap-2 text-[13.5px] font-medium text-[#7C8C63]"
                href="/products"
              >
                ← Keep browsing the drop
              </Link>
            </section>

            <aside className="sticky top-[26px] min-w-[280px] flex-[1_1_320px] rounded-[16px] bg-white px-7 pb-8 pt-7 shadow-[0_30px_80px_rgba(0,0,0,.10)] max-md:static">
              <h2 className="mb-[18px] text-[16px] font-semibold tracking-[.02em]">
                Order summary
              </h2>

              <div className="mb-2 flex gap-2.5">
                <label className="sr-only" htmlFor="discount-code">
                  Discount code
                </label>
                <input
                  className="h-[46px] min-w-0 flex-1 rounded-[9px] border border-[#E4E2DA] px-3.5 text-[13.5px] outline-none focus:border-[#1B1A17]"
                  id="discount-code"
                  name="discount-code"
                  onChange={(event) => setDiscountInput(event.target.value)}
                  placeholder="Discount code"
                  value={discountInput}
                />
                <Button size="lg" onClick={applyDiscount} type="button">
                  Apply
                </Button>
              </div>
              <p
                aria-live="polite"
                className={
                  discountApplied
                    ? "mb-4 text-[11.5px] text-[#5F7043]"
                    : "mb-4 text-[11.5px] text-[#8A887E]"
                }
              >
                {discountMessage || "Preview code: LAIT10"}
              </p>

              <SummaryRow
                label={`Subtotal · ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                value={formatMoney(totals.subtotal)}
              />
              {totals.discount ? (
                <SummaryRow
                  accent
                  label="Discount · LAIT10"
                  value={`−${formatMoney(totals.discount)}`}
                />
              ) : null}
              <SummaryRow label="Delivery · est. Lagos" value={formatMoney(totals.shipping)} />
              <SummaryRow label="VAT (7.5%)" value={formatMoney(totals.vat)} />

              <div className="mt-4 flex items-baseline justify-between border-t border-[#ECEAE3] pt-4">
                <span className="text-[17px] font-semibold">Total</span>
                <span className="text-[22px] font-semibold">{formatMoney(totals.total)}</span>
              </div>

              <Link
                className="mt-[22px] flex h-[54px] w-full items-center justify-center rounded-full bg-[#1B1A17] text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C8C63] focus-visible:ring-offset-2"
                href="/checkout"
              >
                Review &amp; check out
              </Link>

              <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[12px] text-[#8A887E]">
                <LockKeyhole aria-hidden="true" className="size-3.5" />
                Secure checkout powered by Paystack
              </div>
            </aside>
          </div>
        ) : (
          <section className="mx-auto flex min-h-[560px] max-w-[680px] flex-col items-center justify-center rounded-[16px] bg-white px-6 text-center shadow-[0_30px_80px_rgba(0,0,0,.10)]">
            <div className="flex size-[78px] items-center justify-center rounded-full bg-[#F2F4EA] text-[#7C8C63]">
              <ShoppingBag aria-hidden="true" className="size-8" />
            </div>
            <h1 className="mt-6 font-serif text-[34px] font-medium">Your bag is waiting</h1>
            <p className="mt-2 max-w-[440px] text-[14px] leading-[1.6] text-[#57554E]">
              Add something from the drop and it will appear here and in the header bag.
            </p>
            <Link
              className="mt-6 flex h-12 items-center justify-center rounded-full bg-[#1B1A17] px-7 text-[14px] font-semibold text-white"
              href="/products"
            >
              Shop the latest drop
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

function formatHoldTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function CurrencyButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      className="h-8 rounded-full px-3 text-[11px]"
      onClick={onClick}
      type="button"
      variant={active ? "default" : "ghost"}
    >
      {children}
    </Button>
  );
}

function SummaryRow({
  accent = false,
  label,
  value,
}: {
  accent?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-[13px]">
      <span className="text-[#8A887E]">{label}</span>
      <span className={accent ? "font-medium text-[#5F7043]" : "font-medium"}>{value}</span>
    </div>
  );
}

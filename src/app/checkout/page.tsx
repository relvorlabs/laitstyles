"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  HelpCircle,
  Home,
  LockKeyhole,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { formatHoldTime, useShop } from "@/components/shop/shop-provider";
import { naira } from "@/lib/catalogue";
import { createOrderNumber, ORDER_STORAGE_KEY, type OrderReceipt } from "@/lib/order";

const USD_RATE = 1600;

type Currency = "NGN" | "USD";
type CheckoutStep = 0 | 1 | 2 | 3;
type ZoneId = "lagos" | "interstate";
type PaymentId = "paystack" | "flutterwave" | "pod";
type FormField = "email" | "first" | "last" | "address" | "city" | "phone";
type FormErrors = Partial<Record<FormField, string>>;

const zones = [
  {
    id: "lagos" as const,
    name: "Lagos mainland & island",
    eta: "1–2 business days",
    confirmationEta: "Wed, 15 Jul",
    fee: 3500,
  },
  {
    id: "interstate" as const,
    name: "Interstate (rest of Nigeria)",
    eta: "3–5 business days",
    confirmationEta: "Fri, 17 Jul",
    fee: 6500,
  },
];

const paymentMethods = [
  {
    id: "paystack" as const,
    name: "Paystack",
    description: "Card, bank transfer or USSD",
    badges: ["CARD", "TRANSFER", "USSD"],
  },
  {
    id: "flutterwave" as const,
    name: "Flutterwave",
    description: "Card, bank transfer or USSD",
    badges: ["CARD", "TRANSFER", "USSD"],
  },
  {
    id: "pod" as const,
    name: "Pay on delivery",
    description: "Refundable deposit now, balance to courier",
    badges: ["LAGOS"],
  },
];

const initialForm = {
  email: "",
  first: "",
  last: "",
  address: "",
  city: "",
  postcode: "",
  phone: "+234 ",
  country: "Nigeria",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { heldItems, rehold, clearCart } = useShop();
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [step, setStep] = useState<CheckoutStep>(0);
  const [zone, setZone] = useState<ZoneId>("lagos");
  const [payment, setPayment] = useState<PaymentId>("paystack");
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [news, setNews] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountMessage, setDiscountMessage] = useState("");

  const activeItems = heldItems.filter((item) => item.secondsLeft > 0);
  const expiredItems = heldItems.filter((item) => item.secondsLeft <= 0);
  const soonest = activeItems.length ? Math.min(...activeItems.map((item) => item.secondsLeft)) : 0;
  const selectedZone = zones.find((item) => item.id === zone) ?? zones[0];
  const selectedPayment = paymentMethods.find((item) => item.id === payment) ?? paymentMethods[0];

  const totals = useMemo(() => {
    const subtotal = activeItems.reduce((sum, item) => sum + item.product.price, 0);
    const discount = discountApplied ? Math.round(subtotal * 0.1) : 0;
    const shipping = activeItems.length ? selectedZone.fee : 0;
    const vat = Math.round((subtotal - discount) * 0.075);
    return {
      subtotal,
      discount,
      shipping,
      vat,
      total: subtotal - discount + shipping + vat,
    };
  }, [activeItems, discountApplied, selectedZone.fee]);

  function money(value: number) {
    if (currency === "NGN") return naira(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value / USD_RATE);
  }

  function setField(name: keyof typeof form, value: string) {
    const next = { ...form, [name]: value };
    setForm(next);
    if (errors[name as FormField]) {
      setErrors(validate(step, next));
    }
  }

  function nextStep() {
    const nextErrors = validate(step, form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setErrors({});
    setStep((current) => Math.min(3, current + 1) as CheckoutStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setErrors({});
    setStep((current) => Math.max(0, current - 1) as CheckoutStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function reholdExpiredItems() {
    expiredItems.forEach((item) => {
      rehold(item.product.id);
    });
  }

  function placeOrder() {
    if (!activeItems.length || processing) return;

    const finalErrors = validate(1, form);
    if (Object.keys(finalErrors).length) {
      setStep(1);
      setErrors(finalErrors);
      return;
    }

    setProcessing(true);

    const receipt: OrderReceipt = {
      orderNumber: createOrderNumber(),
      firstName: form.first,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      country: form.country,
      zoneName: selectedZone.name,
      eta: selectedZone.confirmationEta,
      paymentName: selectedPayment.name,
      items: activeItems.map((item) => item.product),
      subtotal: totals.subtotal - totals.discount,
      shipping: totals.shipping,
      vat: totals.vat,
      total: totals.total,
      placedAt: new Date().toISOString(),
    };

    window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(receipt));
      } catch {
        // The confirmation page has a safe fallback when session storage is blocked.
      }
      clearCart();
      router.push(`/order-confirmation?order=${encodeURIComponent(receipt.orderNumber)}`);
    }, 900);
  }

  if (!heldItems.length) {
    return <CheckoutEmptyState />;
  }

  return (
    <main className="min-h-dvh bg-[#ECEBE6] px-5 py-[26px] text-[#1B1A17] max-sm:px-4">
      <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[16px] bg-white shadow-[0_30px_80px_rgba(0,0,0,.10)]">
        <div className="flex items-center justify-between border-b border-[#F0EEE8] px-[34px] py-[22px] max-sm:px-5">
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

        {expiredItems.length ? (
          <div className="mx-[34px] mt-6 flex gap-3 rounded-xl border border-[#E8D7A6] bg-[#FBF6E8] px-4 py-3.5 max-sm:mx-5">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-[18px] shrink-0 text-[#9A7B1F]"
            />
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold text-[#6E5714]">
                {expiredItems.length} {expiredItems.length === 1 ? "hold has" : "holds have"}{" "}
                expired
              </div>
              <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[#8A7434]">
                Good news — the pieces are still available. Re-hold them before completing payment.
              </p>
              <button
                className="mt-2.5 h-9 rounded-full bg-[#1B1A17] px-4 text-[12.5px] font-semibold text-white"
                onClick={reholdExpiredItems}
                type="button"
              >
                Re-hold my pieces
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap">
          <section className="min-w-[300px] flex-[1_1_520px] px-[34px] pb-10 pt-7 max-sm:px-5">
            <StepIndicator current={step} onSelect={setStep} />

            {step === 0 ? (
              <div className="animate-[leemRise_.3s_ease]">
                <h1 className="mb-1 text-[18px] font-semibold">Contact</h1>
                <p className="mb-4 text-[12.5px] text-[#8A887E]">
                  Your receipt and delivery updates go here.
                </p>
                <Field
                  autoComplete="email"
                  error={errors.email}
                  label="Email"
                  name="email"
                  onChange={(value) => setField("email", value)}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                />
                <button
                  aria-pressed={news}
                  className="mt-4 flex items-center gap-2.5 text-left"
                  onClick={() => setNews((value) => !value)}
                  type="button"
                >
                  <span
                    className={
                      news
                        ? "flex size-[18px] items-center justify-center rounded-[4px] bg-[#1B1A17] text-white"
                        : "flex size-[18px] items-center justify-center rounded-[4px] border border-[#CFCDBF] bg-white"
                    }
                  >
                    {news ? <Check aria-hidden="true" className="size-3" /> : null}
                  </span>
                  <span className="text-[13.5px] text-[#3D3B35]">
                    Email me with news and one-of-one drop alerts
                  </span>
                </button>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="animate-[leemRise_.3s_ease]">
                <h1 className="mb-3.5 text-[18px] font-semibold">Delivery</h1>

                <label className="relative mb-3 block">
                  <span className="absolute left-[15px] top-[8px] text-[11px] text-[#A7A59B]">
                    Country/Region
                  </span>
                  <select
                    className="h-[60px] w-full appearance-none rounded-[9px] border border-[#E4E2DA] bg-white px-[15px] pb-2 pt-[22px] text-[14px] outline-none focus:border-[#1B1A17]"
                    name="country"
                    onChange={(event) => setField("country", event.target.value)}
                    value={form.country}
                  >
                    <option>Nigeria</option>
                    <option>Ghana</option>
                    <option>United Kingdom</option>
                    <option>United States</option>
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-4 top-6 size-4 text-[#8A887E]"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <Field
                    autoComplete="given-name"
                    error={errors.first}
                    label="First name"
                    name="first"
                    onChange={(value) => setField("first", value)}
                    placeholder="First name"
                    value={form.first}
                  />
                  <Field
                    autoComplete="family-name"
                    error={errors.last}
                    label="Last name"
                    name="last"
                    onChange={(value) => setField("last", value)}
                    placeholder="Last name"
                    value={form.last}
                  />
                </div>

                <div className="relative mt-3">
                  <Field
                    autoComplete="street-address"
                    error={errors.address}
                    label="Address"
                    name="address"
                    onChange={(value) => setField("address", value)}
                    placeholder="Address"
                    value={form.address}
                    withRightPadding
                  />
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute right-4 top-[18px] size-4 text-[#8A887E]"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <Field
                    autoComplete="address-level2"
                    error={errors.city}
                    label="City"
                    name="city"
                    onChange={(value) => setField("city", value)}
                    placeholder="City"
                    value={form.city}
                  />
                  <Field
                    autoComplete="postal-code"
                    label="Postcode"
                    name="postcode"
                    onChange={(value) => setField("postcode", value)}
                    placeholder="Postcode (optional)"
                    value={form.postcode}
                  />
                </div>

                <div className="relative mt-3">
                  <Field
                    autoComplete="tel"
                    error={errors.phone}
                    label="Phone"
                    name="phone"
                    onChange={(value) => setField("phone", value)}
                    placeholder="Phone · +234 801 234 5678"
                    type="tel"
                    value={form.phone}
                    withRightPadding
                  />
                  <HelpCircle
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3.5 top-4 size-5 text-[#8A887E]"
                  />
                </div>

                <div className="mb-2.5 mt-6 text-[12.5px] font-semibold uppercase tracking-[.04em] text-[#57554E]">
                  Delivery zone
                </div>
                <div className="flex flex-col gap-2.5">
                  {zones.map((item) => (
                    <ChoiceRow
                      active={item.id === zone}
                      key={item.id}
                      onClick={() => setZone(item.id)}
                      right={money(item.fee)}
                      subtitle={item.eta}
                      title={item.name}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="animate-[leemRise_.3s_ease]">
                <h1 className="mb-1.5 text-[18px] font-semibold">Payment</h1>
                <p className="mb-3.5 text-[12.5px] text-[#8A887E]">
                  All transactions are secure and encrypted.
                </p>
                <div className="flex flex-col gap-2.5">
                  {paymentMethods.map((method) => (
                    <button
                      aria-pressed={payment === method.id}
                      className={
                        payment === method.id
                          ? "rounded-[11px] border border-[#7C8C63] bg-[#F7F8F2] px-4 py-3.5 text-left"
                          : "rounded-[11px] border border-[#E4E2DA] bg-white px-4 py-3.5 text-left"
                      }
                      key={method.id}
                      onClick={() => setPayment(method.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-3">
                        <RadioDot active={payment === method.id} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold">{method.name}</span>
                          <span className="mt-0.5 block text-[12px] text-[#8A887E]">
                            {method.description}
                          </span>
                        </span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {method.badges.map((badge) => (
                            <span
                              className="rounded-[5px] border border-[#E0DED6] bg-white px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.04em] text-[#6C6A61]"
                              key={badge}
                            >
                              {badge}
                            </span>
                          ))}
                        </span>
                      </span>
                      {method.id === "pod" && payment === "pod" ? (
                        <span className="mt-2 block pl-8 text-[12px] leading-[1.5] text-[#8A7434]">
                          A refundable {money(5000)} deposit is paid now to confirm the hold; the
                          balance is paid to the courier.
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="animate-[leemRise_.3s_ease]">
                <h1 className="mb-3.5 text-[18px] font-semibold">Review &amp; confirm</h1>
                <ReviewRow label="Contact" onEdit={() => setStep(0)} value={form.email} />
                <ReviewRow
                  label="Delivery"
                  onEdit={() => setStep(1)}
                  value={`${form.first} ${form.last}\n${form.address}\n${form.city}, ${form.country}\n${form.phone}`}
                />
                <ReviewRow
                  label="Payment"
                  onEdit={() => setStep(2)}
                  value={`${selectedPayment.name}\n${selectedPayment.description}`}
                />
                <div className="mt-[18px] flex gap-2.5 rounded-[11px] border border-[#D6DAC8] bg-[#F2F4EA] px-[15px] py-[13px]">
                  <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#7C8C63]" />
                  <span className="text-[12.5px] leading-[1.5] text-[#4A5540]">
                    These {activeItems.length} one-of-one pieces stay reserved through payment. Your
                    next hold releases in{" "}
                    <strong className="tabular-nums">{formatHoldTime(soonest)}</strong>.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-7 flex gap-3">
              {step > 0 ? (
                <button
                  className="h-14 rounded-full border-[1.5px] border-[#1B1A17] bg-white px-6 text-[14.5px] font-medium"
                  onClick={previousStep}
                  type="button"
                >
                  Back
                </button>
              ) : null}
              {step < 3 ? (
                <button
                  className="h-14 flex-1 rounded-full bg-[#1B1A17] text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                  onClick={nextStep}
                  type="button"
                >
                  {step === 0
                    ? "Continue to delivery"
                    : step === 1
                      ? "Continue to payment"
                      : "Review order"}
                </button>
              ) : (
                <button
                  className="h-14 flex-1 rounded-full bg-[#1B1A17] text-[15px] font-semibold text-white disabled:cursor-wait disabled:bg-[#4A4842]"
                  disabled={processing || !activeItems.length}
                  onClick={placeOrder}
                  type="button"
                >
                  {processing ? "Confirming your order…" : `Pay ${money(totals.total)}`}
                </button>
              )}
            </div>
            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[12px] text-[#8A887E]">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Secure checkout · {selectedPayment.name}
            </div>
          </section>

          <aside className="min-w-[300px] flex-[1_1_400px] border-l border-[#F0EEE8] bg-[#FAF9F6] px-[34px] pb-11 pt-8 max-md:border-l-0 max-md:border-t max-sm:px-5">
            <div className="mb-4 flex items-center gap-2 rounded-full border border-[#D6DAC8] bg-[#F2F4EA] px-3.5 py-2.5">
              <span className="size-2 animate-[leemPulse_1.8s_ease-in-out_infinite] rounded-full bg-[#7C8C63]" />
              <span aria-live="polite" className="text-[12.5px] text-[#4A5540]">
                {activeItems.length
                  ? `Held for you · ${formatHoldTime(soonest)} remaining`
                  : "Re-hold your pieces to continue"}
              </span>
            </div>

            <div>
              {heldItems.map(({ product, secondsLeft }) => (
                <div className="flex items-center gap-3.5 py-2.5" key={product.id}>
                  <div className="relative h-[66px] w-[60px] shrink-0 overflow-hidden rounded-[9px] bg-[#E4E5DE]">
                    <Image
                      alt={product.name}
                      className={
                        secondsLeft <= 0 ? "object-cover opacity-55 grayscale" : "object-cover"
                      }
                      fill
                      sizes="60px"
                      src={product.image}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[13.5px] font-medium">{product.name}</div>
                    <div className="mt-0.5 text-[12px] text-[#8A887E]">
                      Size {product.size} · {product.color} · {product.condition}
                    </div>
                  </div>
                  <div className="shrink-0 text-[13.5px] font-semibold">{money(product.price)}</div>
                </div>
              ))}
            </div>

            <div className="mb-2 mt-[18px] flex gap-2.5">
              <label className="sr-only" htmlFor="checkout-discount">
                Discount code or gift card
              </label>
              <input
                className="h-12 min-w-0 flex-1 rounded-[9px] border border-[#E4E2DA] bg-white px-[15px] text-[13.5px] outline-none focus:border-[#1B1A17]"
                id="checkout-discount"
                name="checkout-discount"
                onChange={(event) => setDiscountInput(event.target.value)}
                placeholder="Discount code or gift card"
                value={discountInput}
              />
              <button
                className="h-12 rounded-full bg-[#1B1A17] px-[22px] text-[13.5px] font-medium text-white"
                onClick={applyDiscount}
                type="button"
              >
                Apply
              </button>
            </div>
            <p
              aria-live="polite"
              className={
                discountApplied
                  ? "mb-5 text-[11.5px] text-[#5F7043]"
                  : "mb-5 text-[11.5px] text-[#8A887E]"
              }
            >
              {discountMessage || "Preview code: LAIT10"}
            </p>

            <SummaryRow
              label={`Subtotal · ${activeItems.length} items`}
              value={money(totals.subtotal)}
            />
            {totals.discount ? (
              <SummaryRow label="Discount · LAIT10" value={`−${money(totals.discount)}`} accent />
            ) : null}
            <SummaryRow label={`Delivery · ${selectedZone.name}`} value={money(totals.shipping)} />
            <SummaryRow label="VAT (7.5%)" value={money(totals.vat)} />
            <div className="mt-4 flex items-baseline justify-between border-t border-[#ECEAE3] pt-4">
              <span className="text-[18px] font-semibold">Total</span>
              <span className="text-[22px] font-semibold">{money(totals.total)}</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function CheckoutEmptyState() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#ECEBE6] px-5 py-10 text-[#1B1A17]">
      <section className="w-full max-w-[620px] rounded-[16px] bg-white px-8 py-14 text-center shadow-[0_30px_80px_rgba(0,0,0,.10)]">
        <div className="mx-auto flex size-[78px] items-center justify-center rounded-full bg-[#F2F4EA] text-[#7C8C63]">
          <Clock aria-hidden="true" className="size-8" />
        </div>
        <h1 className="mt-6 font-serif text-[34px] font-medium">No active holds</h1>
        <p className="mx-auto mt-2 max-w-[430px] text-[14px] leading-[1.6] text-[#57554E]">
          Checkout begins after you reserve at least one available one-of-one piece.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="flex h-[50px] items-center rounded-full border border-[#D6D4CB] px-6 text-[14px] font-semibold"
            href="/cart"
          >
            Review bag
          </Link>
          <Link
            className="flex h-[50px] items-center rounded-full bg-[#1B1A17] px-6 text-[14px] font-semibold text-white"
            href="/shop"
          >
            Browse the drop
          </Link>
        </div>
      </section>
    </main>
  );
}

function StepIndicator({
  current,
  onSelect,
}: {
  current: CheckoutStep;
  onSelect: (step: CheckoutStep) => void;
}) {
  const labels = ["Contact", "Delivery", "Payment", "Review"] as const;
  return (
    <ol className="mb-8 flex items-center" aria-label="Checkout progress">
      {labels.map((label, index) => {
        const step = index as CheckoutStep;
        const complete = step < current;
        const active = step === current;
        return (
          <li className="flex flex-1 items-center last:flex-none" key={label}>
            <button
              aria-current={active ? "step" : undefined}
              className="flex shrink-0 flex-col items-center gap-1.5"
              disabled={step > current}
              onClick={() => onSelect(step)}
              type="button"
            >
              <span
                className={
                  complete || active
                    ? "flex size-7 items-center justify-center rounded-full bg-[#1B1A17] text-[11px] font-semibold text-white"
                    : "flex size-7 items-center justify-center rounded-full border border-[#D6D4CB] bg-white text-[11px] font-semibold text-[#8A887E]"
                }
              >
                {complete ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
              </span>
              <span
                className={
                  active
                    ? "text-[10.5px] font-semibold text-[#1B1A17]"
                    : "text-[10.5px] text-[#8A887E]"
                }
              >
                {label}
              </span>
            </button>
            {index < labels.length - 1 ? (
              <span
                className={
                  complete
                    ? "mx-2 mb-5 h-px flex-1 bg-[#1B1A17]"
                    : "mx-2 mb-5 h-px flex-1 bg-[#DDDAD1]"
                }
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  autoComplete,
  error,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
  withRightPadding = false,
}: {
  autoComplete?: string;
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
  withRightPadding?: boolean;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={
          error
            ? `h-[52px] w-full rounded-[9px] border border-[#B4453C] bg-white px-[15px] text-[14px] outline-none focus:ring-2 focus:ring-[#E4C4BF] ${withRightPadding ? "pr-11" : ""}`
            : `h-[52px] w-full rounded-[9px] border border-[#E4E2DA] bg-white px-[15px] text-[14px] outline-none focus:border-[#1B1A17] ${withRightPadding ? "pr-11" : ""}`
        }
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <span className="mt-1 block text-[12px] text-[#B4453C]" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function ChoiceRow({
  active,
  onClick,
  right,
  subtitle,
  title,
}: {
  active: boolean;
  onClick: () => void;
  right: string;
  subtitle: string;
  title: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={
        active
          ? "flex items-center gap-[13px] rounded-[11px] border border-[#7C8C63] bg-[#F7F8F2] px-4 py-3.5 text-left"
          : "flex items-center gap-[13px] rounded-[11px] border border-[#E4E2DA] bg-white px-4 py-3.5 text-left"
      }
      onClick={onClick}
      type="button"
    >
      <RadioDot active={active} />
      <span className="flex-1">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[12px] text-[#8A887E]">{subtitle}</span>
      </span>
      <span className="text-[14px] font-semibold">{right}</span>
    </button>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 border-[#7C8C63]"
          : "flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 border-[#C8C6BD]"
      }
    >
      <span
        className={
          active ? "size-[9px] rounded-full bg-[#7C8C63]" : "size-[9px] rounded-full bg-transparent"
        }
      />
    </span>
  );
}

function ReviewRow({ label, onEdit, value }: { label: string; onEdit: () => void; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-[#F0EEE8] py-[15px]">
      <div className="min-w-0">
        <div className="mb-1 text-[11px] uppercase tracking-[.06em] text-[#A7A59B]">{label}</div>
        <div className="whitespace-pre-line text-[13.5px] leading-[1.6] text-[#3D3B35]">
          {value}
        </div>
      </div>
      <button
        className="self-start text-[12.5px] font-semibold text-[#7C8C63] underline underline-offset-2"
        onClick={onEdit}
        type="button"
      >
        Edit
      </button>
    </div>
  );
}

function CurrencyButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={
        active
          ? "h-[34px] rounded-full border border-[#1B1A17] bg-[#1B1A17] px-3.5 text-[12.5px] font-semibold text-white"
          : "h-[34px] rounded-full border border-[#D6D4CB] bg-transparent px-3.5 text-[12.5px] font-semibold text-[#57554E]"
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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
    <div className="mb-2.5 flex justify-between gap-4 text-[13.5px]">
      <span className="text-[#57554E]">{label}</span>
      <span className={accent ? "font-medium text-[#5F7043]" : "text-[#1B1A17]"}>{value}</span>
    </div>
  );
}

function validate(step: CheckoutStep, form: typeof initialForm): FormErrors {
  const errors: FormErrors = {};
  if ((step === 0 || step === 1) && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (step === 1) {
    if (!form.first.trim()) errors.first = "Enter your first name.";
    if (!form.last.trim()) errors.last = "Enter your last name.";
    if (!form.address.trim()) errors.address = "Enter a delivery address.";
    if (!form.city.trim()) errors.city = "Enter your city.";
    if (form.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Enter a valid phone number.";
    }
  }
  return errors;
}

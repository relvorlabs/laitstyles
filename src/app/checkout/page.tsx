"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  HelpCircle,
  Home,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Currency = "NGN" | "USD";
type CheckoutStep = 0 | 1 | 2 | 3;
type ZoneId = "lagos" | "interstate";
type PaymentId = "paystack" | "flutterwave" | "pod";
type PayState = "idle" | "processing" | "declined";
type FormErrors = Partial<
  Record<"email" | "first" | "last" | "address" | "city" | "phone", string>
>;
type CheckoutSnapshot = ReturnType<typeof buildCheckoutSnapshot>;

const checkoutItems = [
  {
    name: "Sage Field Vest",
    meta: "Size M \u00B7 Sage \u00B7 Excellent",
    seller: "Ada O.",
    priceNum: 28000,
    img: "https://drive.google.com/thumbnail?id=1a_gBKr983vl3VEPy5mT-oC6M4kMmiipy&sz=w1000",
  },
  {
    name: "Wool Herringbone Blazer",
    meta: "Size L \u00B7 Charcoal \u00B7 Good",
    seller: "Tunde A.",
    priceNum: 31000,
    img: "https://drive.google.com/thumbnail?id=1TRkBEXRzM9TkK7UhzAqcywy5sgfbQoAQ&sz=w1000",
  },
  {
    name: "Pleated Tailored Trousers",
    meta: "Size 32 \u00B7 Olive \u00B7 Excellent",
    seller: "Zainab M.",
    priceNum: 22000,
    img: "https://drive.google.com/thumbnail?id=1RbUrJyyoo6nkKfK6NJwdHO0zIHY2n04D&sz=w1000",
  },
];

const zones = [
  {
    id: "lagos" as const,
    name: "Lagos mainland & island",
    eta: "1\u20132 business days",
    feeNum: 3500,
  },
  {
    id: "interstate" as const,
    name: "Interstate (rest of Nigeria)",
    eta: "3\u20135 business days",
    feeNum: 6500,
  },
];

const paymentMethods = [
  {
    id: "paystack" as const,
    name: "Paystack",
    sub: "Card, bank transfer or USSD",
    badges: ["CARD", "TRANSFER", "USSD"],
  },
  {
    id: "flutterwave" as const,
    name: "Flutterwave",
    sub: "Card, bank transfer or USSD",
    badges: ["CARD", "TRANSFER", "USSD"],
  },
  {
    id: "pod" as const,
    name: "Pay on delivery",
    sub: "Refundable deposit now, balance to courier",
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
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [zone, setZone] = useState<ZoneId>("lagos");
  const [method, setMethod] = useState<PaymentId>("paystack");
  const [secondsLeft, setSecondsLeft] = useState(852);
  const [payState, setPayState] = useState<PayState>("idle");
  const [placed, setPlaced] = useState(false);
  const [step, setStep] = useState<CheckoutStep>(0);
  const [showErr, setShowErr] = useState(false);
  const [news, setNews] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 0 ? current : current - 1));
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  const vals = useMemo(
    () => buildCheckoutSnapshot(currency, zone, method, secondsLeft),
    [currency, method, secondsLeft, zone],
  );

  function setField(name: keyof typeof form, value: string) {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    if (showErr) setErrors(validate(step, nextForm));
  }

  function next() {
    const nextErrors = validate(step, form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setShowErr(true);
      return;
    }
    setStep((current) => Math.min(3, current + 1) as CheckoutStep);
    setErrors({});
    setShowErr(false);
  }

  function back() {
    setStep((current) => Math.max(0, current - 1) as CheckoutStep);
    setErrors({});
    setShowErr(false);
  }

  function goStep(index: CheckoutStep) {
    if (index > step) return;
    setStep(index);
    setErrors({});
    setShowErr(false);
  }

  function payNow() {
    if (secondsLeft <= 0) return;
    setPayState("processing");
    // INTEGRATION: Replace this simulated redirect with Paystack/Flutterwave checkout session creation and verified callback handling.
    try {
      window.open("https://paystack.shop/pay/1tdagzew46", "_blank", "noopener");
    } catch {}
  }

  function markPlaced() {
    // INTEGRATION: Persist the order, convert held pieces to sold, clear the cart, and attach the gateway reference before showing confirmation.
    window.scrollTo(0, 0);
    setPlaced(true);
    setPayState("idle");
  }

  if (placed) {
    return (
      <main className="flex w-full justify-center bg-[#ECEBE6] px-5 py-[26px] pb-[50px]">
        <ConfirmationScreen form={form} vals={vals} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#ECEBE6] px-5 py-[26px]">
      <Card className="w-full max-w-[1120px] gap-0 overflow-hidden rounded-lg bg-card p-0 shadow-laitstyle ring-0">
        <div className="flex items-center justify-between border-b border-[#F0EEE8] px-[34px] py-[22px] max-sm:px-5">
          <Link className="flex items-center gap-[9px]" href="/shop">
            <Home className="size-5" strokeWidth={1.9} />
            <span className="text-[15px] font-semibold tracking-[.26em]">LAITSTYLE</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <CurrencyButton active={currency === "NGN"} onClick={() => setCurrency("NGN")}>
              {"\u20A6"} NGN
            </CurrencyButton>
            <CurrencyButton active={currency === "USD"} onClick={() => setCurrency("USD")}>
              $ USD
            </CurrencyButton>
          </div>
        </div>

        <div className="flex flex-wrap">
          <section className="min-w-[300px] flex-[1_1_520px] px-[34px] pb-10 pt-7 max-sm:px-5">
            {vals.expired ? (
              <Alert className="mb-[22px] flex gap-3 rounded-xl border-[#E8D7A6] bg-[#FBF6E8] px-4 py-3.5 animate-[leemRise_.3s_ease]">
                <AlertTriangle className="mt-0.5 size-[18px] shrink-0 text-[#9A7B1F]" />
                <div className="flex-1">
                  <AlertTitle className="text-[13.5px] font-semibold text-[#6E5714]">
                    Your hold expired
                  </AlertTitle>
                  <AlertDescription className="mt-0.5 text-[12.5px] leading-[1.5] text-[#8A7434]">
                    Good news &mdash; your pieces are still available. Re-hold them to finish
                    checking out. Nothing was lost.
                  </AlertDescription>
                  <Button
                    className="mt-2.5 h-9 rounded-full px-4 text-[12.5px] font-semibold"
                    onClick={() => setSecondsLeft(852)}
                  >
                    Re-hold my pieces
                  </Button>
                </div>
              </Alert>
            ) : null}

            <StepIndicator current={step} goStep={goStep} />

            {step === 0 ? (
              <div className="animate-[leemStep_.3s_ease]">
                <h2 className="m-0 mb-1 text-lg font-semibold">Contact</h2>
                <p className="m-0 mb-4 text-[12.5px] text-[#8A887E]">
                  Your receipt and delivery updates go here.
                </p>
                <FieldInput
                  ariaLabel="Email"
                  error={showErr ? errors.email : undefined}
                  onChange={(value) => setField("email", value)}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                />
                <Button
                  className="mt-4 flex h-auto items-center gap-2.5 rounded-none bg-transparent p-0 text-left font-normal hover:bg-transparent"
                  onClick={() => setNews((value) => !value)}
                  variant="ghost"
                >
                  <CheckBox checked={news} />
                  <span className="text-[13.5px] text-[#3D3B35]">
                    Email me with news and one-of-one drop alerts
                  </span>
                </Button>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="animate-[leemStep_.3s_ease]">
                <h2 className="m-0 mb-3.5 text-lg font-semibold">Delivery</h2>
                <div className="relative mb-3">
                  <div className="absolute left-[15px] top-[9px] text-[11px] text-[#A7A59B]">
                    Country/Region
                  </div>
                  <select
                    aria-label="Country/Region"
                    className="h-[60px] w-full appearance-none rounded-[9px] border border-input bg-card px-[15px] pb-2 pt-[22px] text-sm outline-none focus:border-primary"
                    onChange={(event) => setField("country", event.target.value)}
                    value={form.country}
                  >
                    <option>Nigeria</option>
                    <option>Ghana</option>
                    <option>United Kingdom</option>
                    <option>United States</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-6 size-4 text-[#8A887E]" />
                </div>

                <div className="mb-1 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <FieldInput
                    ariaLabel="First name"
                    error={showErr ? errors.first : undefined}
                    onChange={(value) => setField("first", value)}
                    placeholder="First name"
                    value={form.first}
                  />
                  <FieldInput
                    ariaLabel="Last name"
                    error={showErr ? errors.last : undefined}
                    onChange={(value) => setField("last", value)}
                    placeholder="Last name"
                    value={form.last}
                  />
                </div>

                <div className="relative mt-3">
                  <FieldInput
                    ariaLabel="Address"
                    error={showErr ? errors.address : undefined}
                    onChange={(value) => setField("address", value)}
                    placeholder="Address"
                    value={form.address}
                    withRightPadding
                  />
                  <Search className="pointer-events-none absolute right-4 top-[18px] size-4 text-[#8A887E]" />
                </div>

                <div className="mb-1 mt-3 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <FieldInput
                    ariaLabel="City"
                    error={showErr ? errors.city : undefined}
                    onChange={(value) => setField("city", value)}
                    placeholder="City"
                    value={form.city}
                  />
                  <FieldInput
                    ariaLabel="Postcode"
                    onChange={(value) => setField("postcode", value)}
                    placeholder="Postcode (optional)"
                    value={form.postcode}
                  />
                </div>

                <div className="relative mt-3">
                  <FieldInput
                    ariaLabel="Phone"
                    error={showErr ? errors.phone : undefined}
                    onChange={(value) => setField("phone", value)}
                    placeholder="Phone \u00B7 +234 801 234 5678"
                    type="tel"
                    value={form.phone}
                    withRightPadding
                  />
                  <HelpCircle className="absolute right-3.5 top-4 size-5 text-[#8A887E]" />
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
                      right={moneyLabel(item.feeNum, currency)}
                      subtitle={item.eta}
                      title={item.name}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="animate-[leemStep_.3s_ease]">
                <h2 className="m-0 mb-1.5 text-lg font-semibold">Payment</h2>
                <p className="m-0 mb-3.5 text-[12.5px] text-[#8A887E]">
                  All transactions are secure and encrypted.
                </p>
                <div className="flex flex-col gap-2.5">
                  {paymentMethods.map((item) => {
                    const active = item.id === method;
                    return (
                      <div
                        className={cn(
                          "overflow-hidden rounded-[11px] border",
                          active ? "border-primary bg-[#F7F7F3]" : "border-input bg-card",
                        )}
                        key={item.id}
                      >
                        <Button
                          className="flex h-auto w-full items-center gap-[13px] rounded-none bg-transparent px-4 py-3.5 text-left font-normal hover:bg-transparent"
                          onClick={() => setMethod(item.id)}
                          variant="ghost"
                        >
                          <RadioDot active={active} />
                          <span className="flex-1">
                            <span className="block text-sm font-semibold">{item.name}</span>
                            <span className="mt-0.5 block text-xs text-[#8A887E]">{item.sub}</span>
                          </span>
                          <span className="flex items-center gap-[5px]">
                            {item.badges.map((badge) => (
                              <Badge
                                className="rounded-[5px] border border-[#E0DED6] bg-card px-1.5 py-[3px] text-[9.5px] font-bold tracking-[.04em] text-[#6C6A61] hover:bg-card"
                                key={badge}
                              >
                                {badge}
                              </Badge>
                            ))}
                          </span>
                        </Button>
                        {active && item.id === "pod" ? (
                          <div className="px-4 pb-3.5 pl-12 text-xs leading-[1.5] text-[#8A7434]">
                            A refundable <strong>{vals.podDeposit} deposit</strong> is paid now to
                            confirm the hold; the balance is paid to the courier on delivery.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="animate-[leemStep_.3s_ease]">
                <h2 className="m-0 mb-3.5 text-lg font-semibold">Review &amp; confirm</h2>
                <ReviewRow
                  label="Contact"
                  onEdit={() => goStep(0)}
                  value={form.email || "\u2014"}
                />
                <ReviewRow
                  label="Ship to"
                  onEdit={() => goStep(1)}
                  value={`${`${form.first} ${form.last}`.trim()}\n${form.address}\n${form.city}${form.postcode ? `, ${form.postcode}` : ""}\n${form.country}\n${form.phone}`}
                />
                <ReviewRow
                  label="Payment"
                  onEdit={() => goStep(2)}
                  value={`${vals.activeMethod.name}${vals.isPod ? ` \u00B7 ${vals.podDeposit} deposit now` : ""}`}
                />
                <Alert className="mt-[18px] flex gap-2.5 rounded-[11px] border-chip-border bg-chip-bg px-[15px] py-[13px]">
                  <Clock className="mt-0.5 size-4 shrink-0 text-accent" />
                  <AlertTitle className="sr-only">Hold status</AlertTitle>
                  <AlertDescription className="text-[12.5px] leading-[1.5] text-[#4A5540]">
                    These {checkoutItems.length} one-of-one pieces stay reserved to you through
                    payment. {vals.reviewHold}
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="mt-7 flex gap-3">
              {step > 0 ? (
                <Button
                  className="h-14 rounded-full border-[1.5px] border-primary bg-card px-6 text-[14.5px] font-medium text-primary hover:bg-card"
                  onClick={back}
                  variant="outline"
                >
                  Back
                </Button>
              ) : null}
              {step < 3 ? (
                <Button
                  className="h-14 flex-1 rounded-full text-[15px] font-semibold transition-transform hover:-translate-y-0.5"
                  onClick={next}
                >
                  {step === 0
                    ? "Continue to delivery"
                    : step === 1
                      ? "Continue to payment"
                      : "Review order"}
                </Button>
              ) : (
                <Button
                  className="h-14 flex-1 rounded-full text-[15px] font-semibold transition-transform hover:-translate-y-0.5"
                  onClick={payNow}
                >
                  {vals.payLabel}
                </Button>
              )}
            </div>
            <div className="mt-3.5 flex items-center justify-center gap-[7px] text-xs text-[#8A887E]">
              <LockKeyhole className="size-3.5" />
              {vals.payGateway}
            </div>
          </section>

          <OrderSummary
            currency={currency}
            secondsLeft={secondsLeft}
            setCurrency={setCurrency}
            vals={vals}
          />
        </div>
      </Card>

      {payState === "processing" ? (
        <ProcessingDialog
          gatewayName={vals.gatewayName}
          markPlaced={markPlaced}
          simulateDecline={() => setPayState("declined")}
        />
      ) : null}
      {payState === "declined" ? (
        <DeclinedDialog dismiss={() => setPayState("idle")} payNow={payNow} timer={vals.timer} />
      ) : null}
    </main>
  );
}

function OrderSummary({
  currency,
  secondsLeft,
  setCurrency,
  vals,
}: {
  currency: Currency;
  secondsLeft: number;
  setCurrency: (currency: Currency) => void;
  vals: CheckoutSnapshot;
}) {
  const expired = secondsLeft <= 0;
  const expiring = !expired && secondsLeft <= 180;
  return (
    <aside className="min-w-[300px] flex-[1_1_400px] border-l border-[#F0EEE8] bg-[#FAF9F6] px-[34px] pb-11 pt-8 max-md:border-l-0 max-sm:px-5">
      <div
        className={cn(
          "mb-4 flex items-center gap-2 rounded-full border px-3.5 py-[9px]",
          expired
            ? "border-[#E4C4BF] bg-[#FBF0EE]"
            : expiring
              ? "border-[#E8D7A6] bg-[#FBF6E8]"
              : "border-chip-border bg-chip-bg",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full",
            !expired ? "animate-[leemPulse_1.8s_ease-in-out_infinite]" : "",
          )}
          style={{ background: expired ? "#B4453C" : expiring ? "#9A7B1F" : "#7C8C63" }}
        />
        <span
          aria-live="polite"
          className="text-[12.5px]"
          style={{ color: expired ? "#8A362F" : expiring ? "#8A7434" : "#4A5540" }}
        >
          {vals.holdMsg}
        </span>
      </div>

      {vals.items.map((item) => (
        <div className="flex items-center gap-3.5 py-2.5" key={item.name}>
          <div className="relative h-[66px] w-[60px] shrink-0 overflow-hidden rounded-[9px] bg-[#E4E5DE]">
            <span className="absolute -right-[7px] -top-[7px] z-[2] flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4A4842] text-[11px] font-semibold text-white">
              1
            </span>
            <Image alt={item.name} className="object-cover" fill sizes="60px" src={item.img} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium">{item.name}</div>
            <div className="mt-0.5 text-xs text-[#8A887E]">{item.meta}</div>
          </div>
          <div className="whitespace-nowrap text-[13.5px] font-semibold">{item.price}</div>
        </div>
      ))}

      <div className="my-[18px] mb-[22px] flex gap-2.5">
        <Input
          className="h-12 flex-1 rounded-[9px] bg-card px-[15px] text-[13.5px]"
          placeholder="Discount code or gift card"
        />
        <Button className="h-12 rounded-full px-[22px] text-[13.5px] font-medium">Apply</Button>
      </div>

      <SummaryRows
        subtotal={vals.subtotal}
        shipping={vals.shipping}
        total={vals.total}
        vat={vals.vat}
        zoneName={vals.activeZone.name.split(" ")[0]}
        totalLabel="Total"
      />
      {vals.isPod ? (
        <div className="mt-2.5 flex justify-between rounded-[9px] border border-[#E8D7A6] bg-[#FBF6E8] px-3 py-2.5 text-[12.5px] text-[#8A7434]">
          <span>Deposit due now</span>
          <span className="font-semibold">{vals.podDeposit}</span>
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-3 gap-3">
        <TrustBadge icon={<Truck className="size-[22px]" />} label="GIG \u00B7 Sendbox" />
        <TrustBadge icon={<HelpCircle className="size-[22px]" />} label="7-day returns" />
        <TrustBadge icon={<ShieldCheck className="size-[22px]" />} label="Buyer protection" />
      </div>

      <div className="mt-6 hidden gap-1.5 max-md:flex">
        <CurrencyButton active={currency === "NGN"} onClick={() => setCurrency("NGN")}>
          {"\u20A6"} NGN
        </CurrencyButton>
        <CurrencyButton active={currency === "USD"} onClick={() => setCurrency("USD")}>
          $ USD
        </CurrencyButton>
      </div>
    </aside>
  );
}

function ConfirmationScreen({ form, vals }: { form: typeof initialForm; vals: CheckoutSnapshot }) {
  const first = form.first.trim() || "there";
  const email = form.email || "your inbox";
  const orderNo = "LAIT-4821";
  return (
    <div className="w-full max-w-[640px]">
      <div className="flex items-center justify-center px-1 pb-6">
        <Link className="flex items-center gap-[9px]" href="/">
          <Home className="size-5" strokeWidth={1.9} />
          <span className="text-[15px] font-semibold tracking-[.26em]">LAITSTYLE</span>
        </Link>
      </div>
      <Card className="gap-0 overflow-hidden rounded-lg bg-card p-0 shadow-[0_30px_80px_rgba(0,0,0,.10)] ring-0">
        <div className="border-b border-[#F0EEE8] bg-[linear-gradient(180deg,#F4F6EE_0%,#FFFFFF_100%)] px-[34px] py-[52px] pb-10 text-center">
          <div className="mx-auto mb-6 flex size-[78px] items-center justify-center rounded-full border border-[#CFDCB4] bg-[#EAF0DD] animate-[leemPop_.5s_cubic-bezier(.33,1,.68,1)]">
            <Check className="size-9 text-[#5F7043]" strokeWidth={2.4} />
          </div>
          <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[.28em] text-accent">
            Order confirmed &middot; &#8470; one of one
          </div>
          <h1 className="m-0 mb-2.5 font-serif text-[34px] font-medium italic leading-[1.15]">
            They&apos;re yours, {first}.
          </h1>
          <p className="mx-auto m-0 max-w-[420px] text-[14.5px] leading-[1.6] text-[#57554E]">
            Each piece is one-of-one &mdash; off the rail for good and reserved to you. A receipt is
            on its way to <strong className="text-primary">{email}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap gap-5 border-b border-[#F0EEE8] px-[34px] py-[26px]">
          <ConfirmMetric label="Order number" value={`#${orderNo}`} />
          <ConfirmMetric label="Payment" value={vals.activeMethod.name} paid />
          <ConfirmMetric label="Est. delivery" value="Wed, 15 Jul" />
        </div>

        <div className="px-[34px] pb-2 pt-7">
          <div className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[.04em] text-[#57554E]">
            Delivering to
          </div>
          <div className="flex items-start gap-3 border-b border-[#F4F3EE] py-3.5 pb-[22px]">
            <MapPin className="mt-0.5 size-[18px] shrink-0 text-accent" />
            <div className="text-[13.5px] leading-[1.65] text-[#3D3B35]">
              {`${form.first} ${form.last}`.trim() || "Your delivery address"}
              <br />
              {form.address || "\u2014"}
              <br />
              {form.city}
              {form.postcode ? `, ${form.postcode}` : ""} &middot; {form.country}
              <br />
              {form.phone}
            </div>
          </div>
        </div>

        <div className="px-[34px] pb-1.5 pt-5">
          {vals.items.map((item) => (
            <div
              className="flex items-center gap-3.5 border-b border-[#F4F3EE] py-3"
              key={item.name}
            >
              <div className="relative h-[70px] w-[58px] shrink-0 overflow-hidden rounded-[9px] bg-[#E4E5DE]">
                <Image alt={item.name} className="object-cover" fill sizes="58px" src={item.img} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{item.name}</div>
                <div className="mt-0.5 text-xs text-[#8A887E]">{item.meta}</div>
                <div className="mt-0.5 text-[11.5px] text-[#A7A59B]">
                  Reserved to you &middot; one of one
                </div>
              </div>
              <div className="whitespace-nowrap text-sm font-semibold">{item.price}</div>
            </div>
          ))}
        </div>

        <div className="px-[34px] pb-2 pt-[18px]">
          <SummaryRows
            subtotal={vals.subtotal}
            shipping={vals.shipping}
            total={vals.total}
            vat={vals.vat}
            zoneName={vals.activeZone.name.split(" ")[0]}
            totalLabel="Total paid"
            compact
          />
        </div>

        <div className="px-[34px] pb-[30px] pt-[22px]">
          <Alert className="flex gap-3 rounded-xl border-[#EEECE5] bg-[#F7F7F3] px-[18px] py-4">
            <Truck className="mt-0.5 size-[18px] shrink-0 text-accent" />
            <AlertTitle className="sr-only">Tracking</AlertTitle>
            <AlertDescription>
              <div className="text-[13.5px] font-semibold text-primary">Tracking on the way</div>
              <div className="mt-[3px] text-[12.5px] leading-[1.55] text-[#57554E]">
                We&apos;ll text your <strong>GIG Logistics</strong> tracking link the moment your
                parcel is booked. Follow it from your account.
              </div>
            </AlertDescription>
          </Alert>
          <div className="mt-[22px] flex flex-wrap gap-3">
            <Button
              className="h-[52px] min-w-[180px] flex-1 rounded-full text-[14.5px] font-semibold"
              render={<Link href="/shop" />}
            >
              Back to the archive
            </Button>
            <Button
              className="h-[52px] min-w-[180px] flex-1 rounded-full border border-[#D6D4CB] bg-card text-[14.5px] font-semibold text-primary hover:bg-card"
              render={<Link href="/account" />}
              variant="outline"
            >
              View my orders
            </Button>
          </div>
        </div>
      </Card>
      <p className="mx-auto mt-[22px] max-w-[440px] text-center font-serif text-[12.5px] italic leading-[1.6] text-[#8A887E]">
        Questions about your order? Reach us at care@laitstyle.ng &mdash; we reply within a day.
      </p>
    </div>
  );
}

function StepIndicator({
  current,
  goStep,
}: {
  current: CheckoutStep;
  goStep: (step: CheckoutStep) => void;
}) {
  const labels = ["Contact", "Delivery", "Payment", "Review"] as const;
  return (
    <div className="mb-[26px] flex items-center">
      {labels.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div className="contents" key={label}>
            {index > 0 ? (
              <span
                className={cn(
                  "mx-2.5 h-[1.5px] flex-1",
                  index <= current ? "bg-primary" : "bg-input",
                )}
              />
            ) : null}
            <Button
              className="flex h-auto shrink-0 items-center gap-2 rounded-none bg-transparent p-0 font-normal hover:bg-transparent"
              onClick={() => goStep(index as CheckoutStep)}
              variant="ghost"
              aria-label={label}
            >
              <span
                className={cn(
                  "flex size-[26px] items-center justify-center rounded-full text-[12.5px] font-semibold",
                  done || active
                    ? "bg-primary text-primary-foreground"
                    : "border-[1.5px] border-[#D6D4CB] bg-card text-[#A7A59B]",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-[13px] max-sm:hidden",
                  active
                    ? "font-semibold text-primary"
                    : done
                      ? "text-[#57554E]"
                      : "text-[#A7A59B]",
                )}
              >
                {label}
              </span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function FieldInput({
  ariaLabel,
  error,
  onChange,
  placeholder,
  type = "text",
  value,
  withRightPadding = false,
}: {
  ariaLabel: string;
  error?: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
  withRightPadding?: boolean;
}) {
  return (
    <div>
      <Input
        aria-invalid={!!error}
        aria-label={ariaLabel}
        className={cn(
          "h-[52px] rounded-[9px] bg-card px-[15px] text-sm focus-visible:border-primary focus-visible:ring-0",
          withRightPadding ? "pr-11" : "",
          error ? "border-[#D98B84]" : "border-input",
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <div className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </div>
      ) : null}
    </div>
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
    <Button
      className={cn(
        "flex h-auto items-center gap-[13px] rounded-[11px] border px-4 py-3.5 text-left font-normal hover:bg-[#F7F7F3]",
        active ? "border-primary bg-[#F7F7F3]" : "border-input bg-card",
      )}
      onClick={onClick}
      variant="ghost"
    >
      <RadioDot active={active} />
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-[#8A887E]">{subtitle}</span>
      </span>
      <span className="text-sm font-semibold">{right}</span>
    </Button>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex size-[19px] shrink-0 items-center justify-center rounded-full border-2",
        active ? "border-primary" : "border-[#CFCDC4]",
      )}
    >
      <span className={cn("size-[9px] rounded-full", active ? "bg-primary" : "bg-transparent")} />
    </span>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[5px]",
        checked ? "bg-primary" : "border-[1.5px] border-[#CFCDC3] bg-card",
      )}
    >
      {checked ? <Check className="size-[13px] text-white" strokeWidth={3} /> : null}
    </span>
  );
}

function ReviewRow({ label, onEdit, value }: { label: string; onEdit: () => void; value: string }) {
  return (
    <div className="flex justify-between gap-3.5 border-t border-[#F0EEE8] py-[15px]">
      <div className="min-w-0">
        <div className="mb-[5px] text-[11px] uppercase tracking-[.06em] text-[#A7A59B]">
          {label}
        </div>
        <div className="whitespace-pre-line text-[13.5px] leading-[1.6] text-[#3D3B35]">
          {value}
        </div>
      </div>
      <Button
        className="h-auto shrink-0 self-start rounded-none p-0 text-[12.5px] font-semibold text-accent underline underline-offset-2 hover:bg-transparent"
        onClick={onEdit}
        variant="ghost"
      >
        Edit
      </Button>
    </div>
  );
}

function SummaryRows({
  compact = false,
  shipping,
  subtotal,
  total,
  totalLabel,
  vat,
  zoneName,
}: {
  compact?: boolean;
  shipping: string;
  subtotal: string;
  total: string;
  totalLabel: string;
  vat: string;
  zoneName: string;
}) {
  return (
    <div>
      <div className="mb-2.5 flex justify-between text-[13.5px] text-[#57554E]">
        <span>Subtotal{compact ? "" : " \u00B7 3 items"}</span>
        <span className="text-primary">{subtotal}</span>
      </div>
      <div className="mb-2.5 flex justify-between text-[13.5px] text-[#57554E]">
        <span>
          Delivery <span className="text-[#A7A59B]">&middot; {zoneName}</span>
        </span>
        <span className="text-primary">{shipping}</span>
      </div>
      <div className="mb-3.5 flex justify-between text-[13.5px] text-[#57554E]">
        <span>VAT (7.5%)</span>
        <span className="text-primary">{vat}</span>
      </div>
      <Separator className="bg-[#ECEAE3]" />
      <div className="flex items-baseline justify-between pt-3.5">
        <span className={cn("font-semibold", compact ? "text-base" : "text-lg")}>{totalLabel}</span>
        <span className={cn("font-semibold", compact ? "text-xl" : "text-[22px]")}>{total}</span>
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {icon}
      <span className="text-[11.5px] text-[#57554E]">{label}</span>
    </div>
  );
}

function ProcessingDialog({
  gatewayName,
  markPlaced,
  simulateDecline,
}: {
  gatewayName: string;
  markPlaced: () => void;
  simulateDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-[#1B1A17]/50 animate-[leemFade_.25s_ease]" />
      <div
        className="relative w-full max-w-[400px] rounded-lg bg-card px-8 py-[38px] text-center shadow-[0_30px_80px_rgba(0,0,0,.28)] animate-[leemPop_.35s_cubic-bezier(.33,1,.68,1)]"
        role="dialog"
        aria-label="Processing payment"
      >
        <div className="mx-auto mb-[22px] size-[52px] rounded-full border-[3px] border-[#ECEAE3] border-t-primary animate-spin" />
        <h3 className="m-0 mb-2 font-serif text-[22px] font-medium">
          Redirecting to {gatewayName}...
        </h3>
        <p className="m-0 mb-[22px] text-[13.5px] leading-[1.6] text-[#57554E]">
          Complete your payment in the secure {gatewayName} window. Your pieces stay held until
          you&apos;re back.
        </p>
        <Button
          className="mb-2.5 h-12 w-full rounded-full text-sm font-semibold"
          onClick={markPlaced}
        >
          I&apos;ve completed payment
        </Button>
        <Button
          className="h-auto rounded-none p-0 text-[12.5px] font-normal text-[#A7A59B] hover:bg-transparent"
          onClick={simulateDecline}
          variant="ghost"
        >
          Payment failed? Simulate a declined card
        </Button>
      </div>
    </div>
  );
}

function DeclinedDialog({
  dismiss,
  payNow,
  timer,
}: {
  dismiss: () => void;
  payNow: () => void;
  timer: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-[#1B1A17]/50 animate-[leemFade_.25s_ease]" />
      <div
        className="relative w-full max-w-[400px] rounded-lg bg-card px-8 py-[38px] text-center shadow-[0_30px_80px_rgba(0,0,0,.28)] animate-[leemPop_.35s_cubic-bezier(.33,1,.68,1)]"
        role="alertdialog"
        aria-label="Payment declined"
      >
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-[#E4C4BF] bg-[#FBF0EE]">
          <XCircle className="size-7 text-destructive" strokeWidth={2.2} />
        </div>
        <h3 className="m-0 mb-2 font-serif text-[22px] font-medium">Payment declined</h3>
        <p className="m-0 mb-2 text-[13.5px] leading-[1.6] text-[#57554E]">
          Your bank declined the charge &mdash; no money left your account.{" "}
          <strong className="text-primary">Your pieces are still held</strong>, so you can try again
          right away.
        </p>
        <div className="mb-[22px] text-xs text-[#8A887E]">Held for {timer} more</div>
        <Button className="mb-2.5 h-12 w-full rounded-full text-sm font-semibold" onClick={payNow}>
          Try payment again
        </Button>
        <Button
          className="h-auto rounded-none p-0 text-[13px] font-normal text-[#8A887E] hover:bg-transparent"
          onClick={dismiss}
          variant="ghost"
        >
          Choose another method
        </Button>
      </div>
    </div>
  );
}

function ConfirmMetric({
  label,
  paid = false,
  value,
}: {
  label: string;
  paid?: boolean;
  value: string;
}) {
  return (
    <div className="flex-[1_1_160px]">
      <div className="mb-[5px] text-[11px] uppercase tracking-[.06em] text-[#A7A59B]">{label}</div>
      <div className="flex items-center gap-[7px] text-[15px] font-semibold tabular-nums">
        {value}
        {paid ? (
          <span className="rounded-[5px] bg-[#EAF0DD] px-1.5 py-0.5 text-[10px] font-bold text-[#5F7043]">
            PAID
          </span>
        ) : null}
      </div>
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
    <Button
      className={cn(
        "h-8 rounded-full border px-[13px] text-xs font-semibold",
        active
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/86"
          : "border-[#D6D4CB] bg-card text-[#57554E] hover:bg-card",
      )}
      onClick={onClick}
      variant="ghost"
    >
      {children}
    </Button>
  );
}

function validate(step: CheckoutStep, form: typeof initialForm): FormErrors {
  const nextErrors: FormErrors = {};
  if (step === 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((form.email || "").trim()))
    nextErrors.email = "Enter a valid email address";
  if (step === 1) {
    if (!form.first.trim()) nextErrors.first = "Required";
    if (!form.last.trim()) nextErrors.last = "Required";
    if (!form.address.trim()) nextErrors.address = "Add your street address";
    if (!form.city.trim()) nextErrors.city = "Required";
    const digits = form.phone.replace(/\D/g, "");
    const ok =
      (digits.startsWith("234") && digits.length === 13) ||
      (digits.startsWith("0") && digits.length === 11) ||
      (!digits.startsWith("234") && !digits.startsWith("0") && digits.length === 10);
    if (!ok) nextErrors.phone = "Enter a valid Nigerian number, e.g. +234 801 234 5678";
  }
  return nextErrors;
}

function moneyLabel(ngn: number, currency: Currency) {
  return currency === "NGN"
    ? `\u20A6${ngn.toLocaleString()}`
    : `$${(Math.round((ngn / 1600) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatSeconds(sec = 0) {
  const value = Math.max(0, sec);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function buildCheckoutSnapshot(
  currency: Currency,
  zone: ZoneId,
  method: PaymentId,
  secondsLeft: number,
) {
  const activeZone = zones.find((item) => item.id === zone) || zones[0];
  const activeMethod = paymentMethods.find((item) => item.id === method) || paymentMethods[0];
  const sub = checkoutItems.reduce((sum, item) => sum + item.priceNum, 0);
  const vatNum = Math.round(sub * 0.075);
  const totalNum = sub + activeZone.feeNum + vatNum;
  const podDepositNum = 5000;
  const expired = secondsLeft <= 0;
  const expiring = !expired && secondsLeft <= 180;
  const isPod = method === "pod";
  const money = (ngn: number) =>
    currency === "NGN"
      ? `\u20A6${ngn.toLocaleString()}`
      : `$${(Math.round((ngn / 1600) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return {
    activeMethod,
    activeZone,
    expired,
    expiring,
    gatewayName: method === "flutterwave" ? "Flutterwave" : "Paystack",
    isPod,
    items: checkoutItems.map((item) => ({ ...item, price: money(item.priceNum) })),
    podDeposit: money(podDepositNum),
    reviewHold: expired ? "Re-hold above to continue." : `Held ${formatSeconds(secondsLeft)}.`,
    shipping: money(activeZone.feeNum),
    subtotal: money(sub),
    timer: formatSeconds(secondsLeft),
    total: money(totalNum),
    vat: money(vatNum),
    payGateway: isPod
      ? "Deposit secured \u00B7 Paystack"
      : `Secured by ${activeMethod.name} \u00B7 PCI-DSS`,
    payLabel: expired
      ? "Re-hold to pay"
      : isPod
        ? `Pay deposit \u00B7 ${money(podDepositNum)}`
        : `Pay ${money(totalNum)}`,
    holdMsg: expired
      ? "Hold released \u2014 re-hold above to continue"
      : isPod
        ? "Deposit confirms your hold at checkout"
        : `Your ${checkoutItems.length} pieces are held \u2014 releasing in ${formatSeconds(secondsLeft)}`,
  };
}

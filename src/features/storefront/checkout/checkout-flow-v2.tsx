"use client";

import { ChevronDown, Clock, HelpCircle, Home, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  CheckoutItem,
  CheckoutStep,
  Currency,
  FormErrors,
  PaymentId,
  PayState,
  ZoneId,
} from "@/features/storefront/checkout/checkout-helpers";
import {
  buildCheckoutSnapshot,
  initialForm,
  moneyLabel,
  paymentMethods,
  validate,
  zones,
} from "@/features/storefront/checkout/checkout-helpers";
import { CheckBox } from "@/features/storefront/checkout/components/check-box";
import { ChoiceRow } from "@/features/storefront/checkout/components/choice-row";
import { CurrencyButton } from "@/features/storefront/checkout/components/currency-button";
import { DeclinedDialog } from "@/features/storefront/checkout/components/declined-dialog";
import { FieldInput } from "@/features/storefront/checkout/components/field-input";
import { OrderSummary } from "@/features/storefront/checkout/components/order-summary";
import { ProcessingDialog } from "@/features/storefront/checkout/components/processing-dialog";
import { RadioDot } from "@/features/storefront/checkout/components/radio-dot";
import { ReviewRow } from "@/features/storefront/checkout/components/review-row";
import { StepIndicator } from "@/features/storefront/checkout/components/step-indicator";
import {
  createOrderNumber,
  type OrderReceipt,
  writeLatestOrderReceipt,
} from "@/features/storefront/checkout/order-receipt";
import {
  useStorefrontCart,
  useStorefrontHolds,
} from "@/features/storefront/shared/storefront-runtime";
import { cn } from "@/lib/utils";

export function CheckoutFlowV2() {
  const router = useRouter();
  const cart = useStorefrontCart();
  const holds = useStorefrontHolds();
  const checkoutItems = useMemo<CheckoutItem[]>(
    () =>
      cart.views.map((line) => ({
        lineKey: line.lineKey,
        productId: line.product.id,
        slug: line.product.slug,
        name: line.product.name,
        meta: `Size ${line.size ?? line.variantLabel ?? line.product.size} · ${line.colour ?? line.product.colour} · Grade ${line.product.condition}`,
        seller: "Laitstyles",
        quantity: line.lineQty,
        unitPriceNaira: line.unitPriceNaira,
        priceNum: line.unitPriceNaira * line.lineQty,
        img: line.product.images[0] ?? "",
      })),
    [cart.views],
  );
  const activeHoldSeconds = checkoutItems.flatMap((item) => {
    const seconds = holds.secondsByProduct[item.productId];
    return seconds && seconds > 0 ? [seconds] : [];
  });
  const secondsLeft = activeHoldSeconds.length ? Math.min(...activeHoldSeconds) : null;

  const [currency, setCurrency] = useState<Currency>("NGN");
  const [zone, setZone] = useState<ZoneId>("lagos");
  const [method, setMethod] = useState<PaymentId>("paystack");
  const [payState, setPayState] = useState<PayState>("idle");
  const [step, setStep] = useState<CheckoutStep>(0);
  const [showErrors, setShowErrors] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const snapshot = useMemo(
    () => buildCheckoutSnapshot(currency, zone, method, secondsLeft, checkoutItems),
    [checkoutItems, currency, method, secondsLeft, zone],
  );

  function setField(name: keyof typeof form, value: string) {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    if (showErrors) setErrors(validate(step, nextForm));
  }

  function next() {
    const nextErrors = validate(step, form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setShowErrors(true);
      return;
    }
    setStep((current) => Math.min(3, current + 1) as CheckoutStep);
    setErrors({});
    setShowErrors(false);
  }

  function back() {
    setStep((current) => Math.max(0, current - 1) as CheckoutStep);
    setErrors({});
    setShowErrors(false);
  }

  function goStep(index: CheckoutStep) {
    if (index > step) return;
    setStep(index);
    setErrors({});
    setShowErrors(false);
  }

  function payNow() {
    if (checkoutItems.length === 0) return;
    setPayState("processing");
    try {
      window.open("https://paystack.shop/pay/1tdagzew46", "_blank", "noopener");
    } catch {
      // The prototype success/decline controls remain available if a popup is blocked.
    }
  }

  function markPlaced() {
    const receipt: OrderReceipt = {
      orderNumber: createOrderNumber(),
      firstName: form.first.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      country: form.country,
      zoneName: snapshot.activeZone.name,
      eta: snapshot.activeZone.eta,
      paymentName: snapshot.activeMethod.name,
      items: cart.views.map((line) => ({
        lineKey: line.lineKey,
        productId: line.product.id,
        slug: line.product.slug,
        name: line.product.name,
        imageUrl: line.product.images[0] ?? "",
        size: line.size ?? line.variantLabel ?? line.product.size ?? null,
        colour: line.colour ?? line.product.colour ?? null,
        condition: line.product.condition,
        quantity: line.lineQty,
        unitPriceNaira: line.unitPriceNaira,
      })),
      subtotal: snapshot.subtotalNum,
      shipping: snapshot.shippingNum,
      vat: snapshot.vatNum,
      total: snapshot.totalNum,
      placedAt: new Date().toISOString(),
    };

    writeLatestOrderReceipt(window.sessionStorage, receipt);
    for (const item of checkoutItems) holds.releaseProduct(item.productId);
    cart.clear();
    setPayState("idle");
    router.push("/order-confirmation");
  }

  if (checkoutItems.length === 0) {
    return (
      <main className="flex min-h-[70dvh] items-center justify-center bg-[#ECEBE6] px-5 py-10">
        <Card className="w-full max-w-[620px] items-center gap-4 rounded-lg px-8 py-14 text-center shadow-laitstyle">
          <h1 className="font-serif text-4xl">Your bag is empty</h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Checkout reads the same bag as the header and cart page. Add a piece before continuing.
          </p>
          <Button nativeButton={false} render={<Link href="/products" />} size="lg">
            Browse the archive
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#ECEBE6] px-5 py-[26px]">
      <Card className="w-full max-w-[1120px] gap-0 overflow-hidden rounded-lg bg-card p-0 shadow-laitstyle ring-0">
        <div className="flex items-center justify-between border-b border-[#F0EEE8] px-[34px] py-[22px] max-sm:px-5">
          <Link className="flex items-center gap-[9px]" href="/cart">
            <Home aria-hidden="true" className="size-5" strokeWidth={1.9} />
            <span className="text-[15px] font-semibold tracking-[.26em]">LAITSTYLE</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <CurrencyButton active={currency === "NGN"} onClick={() => setCurrency("NGN")}>
              ₦ NGN
            </CurrencyButton>
            <CurrencyButton active={currency === "USD"} onClick={() => setCurrency("USD")}>
              $ USD
            </CurrencyButton>
          </div>
        </div>

        <div className="flex flex-wrap">
          <section className="min-w-[300px] flex-[1_1_520px] px-[34px] pb-10 pt-7 max-sm:px-5">
            <StepIndicator current={step} goStep={goStep} />

            {step === 0 ? (
              <div className="animate-[leemStep_.3s_ease]">
                <h2 className="mb-1 text-lg font-semibold">Contact</h2>
                <p className="mb-4 text-[12.5px] text-[#8A887E]">
                  Your receipt and delivery updates go here.
                </p>
                <FieldInput
                  ariaLabel="Email"
                  error={showErrors ? errors.email : undefined}
                  onChange={(value) => setField("email", value)}
                  placeholder="Email"
                  type="email"
                  value={form.email}
                />
                <Button
                  className="mt-4 flex h-auto items-center gap-2.5 p-0 text-left"
                  onClick={() => setNewsletter((value) => !value)}
                  variant="ghost"
                >
                  <CheckBox checked={newsletter} />
                  <span className="text-[13.5px] text-[#3D3B35]">
                    Email me with news and one-of-one drop alerts
                  </span>
                </Button>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="animate-[leemStep_.3s_ease]">
                <h2 className="mb-3.5 text-lg font-semibold">Delivery</h2>
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
                    error={showErrors ? errors.first : undefined}
                    onChange={(value) => setField("first", value)}
                    placeholder="First name"
                    value={form.first}
                  />
                  <FieldInput
                    ariaLabel="Last name"
                    error={showErrors ? errors.last : undefined}
                    onChange={(value) => setField("last", value)}
                    placeholder="Last name"
                    value={form.last}
                  />
                </div>
                <div className="mt-3">
                  <FieldInput
                    ariaLabel="Address"
                    error={showErrors ? errors.address : undefined}
                    onChange={(value) => setField("address", value)}
                    placeholder="Address"
                    value={form.address}
                  />
                </div>
                <div className="mb-1 mt-3 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <FieldInput
                    ariaLabel="City"
                    error={showErrors ? errors.city : undefined}
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
                    error={showErrors ? errors.phone : undefined}
                    onChange={(value) => setField("phone", value)}
                    placeholder="Phone · +234 801 234 5678"
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
                <h2 className="mb-1.5 text-lg font-semibold">Payment</h2>
                <p className="mb-3.5 text-[12.5px] text-[#8A887E]">
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
                          className="flex h-auto w-full items-center gap-[13px] text-left"
                          onClick={() => setMethod(item.id)}
                          variant="ghost"
                        >
                          <RadioDot active={active} />
                          <span className="flex-1">
                            <span className="block text-sm font-semibold">{item.name}</span>
                            <span className="mt-0.5 block text-xs text-[#8A887E]">
                              {item.sub}
                            </span>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="animate-[leemStep_.3s_ease]">
                <h2 className="mb-3.5 text-lg font-semibold">Review &amp; confirm</h2>
                <ReviewRow label="Contact" onEdit={() => goStep(0)} value={form.email || "—"} />
                <ReviewRow
                  label="Ship to"
                  onEdit={() => goStep(1)}
                  value={`${`${form.first} ${form.last}`.trim()}\n${form.address}\n${form.city}${form.postcode ? `, ${form.postcode}` : ""}\n${form.country}\n${form.phone}`}
                />
                <ReviewRow
                  label="Payment"
                  onEdit={() => goStep(2)}
                  value={snapshot.activeMethod.name}
                />
                <Alert className="mt-[18px] flex gap-2.5 rounded-[11px] border-chip-border bg-chip-bg px-[15px] py-[13px]">
                  <Clock className="mt-0.5 size-4 shrink-0 text-accent" />
                  <AlertTitle className="sr-only">Availability status</AlertTitle>
                  <AlertDescription className="text-[12.5px] leading-[1.5] text-[#4A5540]">
                    {snapshot.reviewHold}
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="mt-7 flex gap-3">
              {step > 0 ? (
                <Button size="lg" onClick={back} variant="outline">
                  Back
                </Button>
              ) : null}
              {step < 3 ? (
                <Button className="flex-1" onClick={next}>
                  {step === 0
                    ? "Continue to delivery"
                    : step === 1
                      ? "Continue to payment"
                      : "Review order"}
                </Button>
              ) : (
                <Button className="flex-1" onClick={payNow}>
                  {snapshot.payLabel}
                </Button>
              )}
            </div>
            <div className="mt-3.5 flex items-center justify-center gap-[7px] text-xs text-[#8A887E]">
              <LockKeyhole className="size-3.5" />
              {snapshot.payGateway}
            </div>
          </section>

          <OrderSummary currency={currency} setCurrency={setCurrency} vals={snapshot} />
        </div>
      </Card>

      {payState === "processing" ? (
        <ProcessingDialog
          gatewayName={snapshot.gatewayName}
          markPlaced={markPlaced}
          simulateDecline={() => setPayState("declined")}
        />
      ) : null}
      {payState === "declined" ? (
        <DeclinedDialog
          dismiss={() => setPayState("idle")}
          payNow={payNow}
          timer={snapshot.timer ?? "Availability check"}
        />
      ) : null}
    </main>
  );
}

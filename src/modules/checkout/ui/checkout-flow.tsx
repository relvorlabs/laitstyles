"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Home, LockKeyhole, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CloudImage } from "@/components/ui/cloud-image";
import { cn } from "@/lib/utils";
import {
  checkoutQueryOptions,
  useCreateCheckout,
  useVerifyCheckoutPayment,
} from "@/modules/checkout/client/hooks";
import type { CheckoutDraft } from "@/modules/checkout/types";
import type { OwnedAddress } from "@/modules/customers/types";
import {
  preloadPaystackPopup,
  resumePaystackTransaction,
} from "@/modules/payments/client/paystack-popup";
import {
  useStorefrontCart,
  useStorefrontHolds,
} from "@/modules/storefront-shell/client/storefront-runtime";

export type CheckoutDeliveryZone = {
  id: string;
  name: string;
  city: string;
  feeMinor: number;
  estimatedDays: string | null;
};

type CheckoutStep = 0 | 1 | 2 | 3;
type PayState = "idle" | "opening" | "confirming" | "cancelled" | "error";

export function CheckoutFlow({
  customerEmail,
  initialAddresses,
  initialZones,
}: {
  customerEmail: string;
  initialAddresses: OwnedAddress[];
  initialZones: CheckoutDeliveryZone[];
}) {
  const router = useRouter();
  const cart = useStorefrontCart();
  const holds = useStorefrontHolds();
  const createCheckout = useCreateCheckout();
  const verifyPayment = useVerifyCheckoutPayment();
  const defaultAddress = initialAddresses.find((address) => address.isDefault) ?? initialAddresses[0];
  const defaultZone =
    initialZones.find(
      (zone) => zone.city.trim().toLowerCase() === defaultAddress?.city.trim().toLowerCase(),
    ) ?? initialZones[0];

  const [step, setStep] = useState<CheckoutStep>(0);
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "");
  const [zoneId, setZoneId] = useState(defaultZone?.id ?? "");
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [payState, setPayState] = useState<PayState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const completedOrder = useRef<string | null>(null);

  const checkoutItems = useMemo(
    () =>
      cart.views.map((line) => ({
        lineKey: line.lineKey,
        productId: line.product.id,
        variantId: line.variantId ?? undefined,
        slug: line.product.slug,
        name: line.product.name,
        meta: `Size ${line.size ?? line.variantLabel ?? line.product.size} · ${line.colour ?? line.product.colour} · Grade ${line.product.condition}`,
        quantity: line.lineQty,
        unitPriceNaira: line.unitPriceNaira,
        image: line.product.images[0] ?? "",
      })),
    [cart.views],
  );
  const selectedAddress = initialAddresses.find((address) => address.id === addressId) ?? null;
  const selectedZone = initialZones.find((zone) => zone.id === zoneId) ?? null;
  const activeHoldSeconds = checkoutItems.flatMap((item) => {
    const seconds = holds.secondsByProduct[item.productId];
    return seconds && seconds > 0 ? [seconds] : [];
  });
  const secondsLeft = activeHoldSeconds.length ? Math.min(...activeHoldSeconds) : null;
  const fingerprint = JSON.stringify({
    addressId,
    zoneId,
    lines: checkoutItems.map((item) => [item.lineKey, item.quantity]),
  });

  useEffect(() => {
    void preloadPaystackPopup();
  }, []);

  useEffect(() => {
    setDraft(null);
    setIdempotencyKey(crypto.randomUUID());
    setPayState("idle");
    setMessage(null);
  }, [fingerprint]);

  const checkoutStatus = useQuery(checkoutQueryOptions(draft?.checkoutId ?? ""));
  const canonicalCheckout = checkoutStatus.data ?? draft;

  useEffect(() => {
    if (!canonicalCheckout || canonicalCheckout.status !== "success") return;
    if (completedOrder.current === canonicalCheckout.orderNumber) return;
    completedOrder.current = canonicalCheckout.orderNumber;
    for (const item of checkoutItems) holds.releaseProduct(item.productId);
    cart.clear();
    router.replace(`/order-confirmation?order=${encodeURIComponent(canonicalCheckout.orderNumber)}`);
  }, [canonicalCheckout, cart, checkoutItems, holds, router]);

  const displaySubtotalMinor =
    canonicalCheckout?.subtotalMinor ??
    checkoutItems.reduce((sum, item) => sum + item.unitPriceNaira * item.quantity * 100, 0);
  const displayDeliveryMinor = canonicalCheckout?.deliveryFeeMinor ?? selectedZone?.feeMinor ?? 0;
  const displayDiscountMinor = canonicalCheckout?.discountMinor ?? 0;
  const displayTotalMinor =
    canonicalCheckout?.totalMinor ?? displaySubtotalMinor + displayDeliveryMinor - displayDiscountMinor;

  async function ensureDraft() {
    if (draft) return draft;
    if (!addressId || !zoneId) {
      setMessage("Choose a saved delivery address and delivery zone before continuing.");
      return null;
    }
    if (checkoutItems.length === 0) return null;
    setMessage(null);
    try {
      const created = await createCheckout.mutateAsync({
        idempotencyKey,
        addressId,
        deliveryZoneId: zoneId,
        lines: checkoutItems.map((item) => ({
          productId: item.productId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
          quantity: item.quantity,
        })),
      });
      setDraft(created);
      return created;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be prepared.");
      return null;
    }
  }

  async function next() {
    setMessage(null);
    if (step === 1 && (!addressId || !zoneId)) {
      setMessage("Choose a saved delivery address and delivery zone.");
      return;
    }
    if (step === 2) {
      const prepared = await ensureDraft();
      if (!prepared) return;
    }
    setStep((current) => Math.min(3, current + 1) as CheckoutStep);
  }

  async function payNow() {
    const prepared = await ensureDraft();
    if (!prepared?.accessCode) {
      setMessage("Payment is not ready yet. Refresh the checkout status and try again.");
      return;
    }
    setMessage(null);
    setPayState("opening");
    const outcome = await resumePaystackTransaction(prepared.accessCode);
    if (outcome.kind === "cancelled") {
      setPayState("cancelled");
      setMessage("Payment was cancelled. Your order remains unpaid and can be retried.");
      return;
    }
    if (outcome.kind === "error") {
      setPayState("error");
      setMessage(outcome.message);
      return;
    }

    setPayState("confirming");
    try {
      await verifyPayment.mutateAsync(prepared.paymentId);
      await checkoutStatus.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment confirmation is still pending. We will keep checking the server status.",
      );
      await checkoutStatus.refetch();
    }
  }

  if (checkoutItems.length === 0) {
    return (
      <main className="flex min-h-[70dvh] items-center justify-center bg-[#ECEBE6] px-5 py-10">
        <Card className="w-full max-w-[620px] items-center gap-4 rounded-lg px-8 py-14 text-center shadow-laitstyle">
          <h1 className="font-serif text-4xl">Your bag is empty</h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Add a piece before starting a server-authoritative checkout.
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
          <span className="rounded-md border px-3 py-2 text-xs font-semibold">₦ NGN</span>
        </div>

        <div className="flex flex-wrap">
          <section className="min-w-[300px] flex-[1_1_520px] px-[34px] pb-10 pt-7 max-sm:px-5">
            <StepIndicator current={step} goStep={(target) => target <= step && setStep(target)} />

            {step === 0 ? (
              <section className="animate-[leemStep_.3s_ease]">
                <h2 className="mb-1 text-lg font-semibold">Contact</h2>
                <p className="mb-4 text-[12.5px] text-[#8A887E]">
                  Receipts and delivery updates use your authenticated account email.
                </p>
                <div className="rounded-[10px] border border-input bg-card px-4 py-4 text-sm">
                  <span className="block text-[11px] uppercase tracking-[.06em] text-[#A7A59B]">Email</span>
                  <span className="mt-1 block font-semibold">{customerEmail}</span>
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section className="animate-[leemStep_.3s_ease]">
                <h2 className="mb-1 text-lg font-semibold">Delivery</h2>
                <p className="mb-4 text-[12.5px] text-[#8A887E]">
                  Checkout accepts only addresses owned by this account.
                </p>
                {initialAddresses.length === 0 ? (
                  <Alert>
                    <MapPin className="size-4" />
                    <AlertTitle>Add a delivery address</AlertTitle>
                    <AlertDescription>
                      <Link className="underline" href="/account/addresses">Manage addresses</Link>{" "}
                      before continuing.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {initialAddresses.map((address) => (
                      <ChoiceRow
                        key={address.id}
                        active={address.id === addressId}
                        onClick={() => setAddressId(address.id)}
                        title={address.label || (address.isDefault ? "Default address" : address.city)}
                        subtitle={[address.line1, address.line2, address.city, address.state]
                          .filter(Boolean)
                          .join(", ")}
                        right={address.isDefault ? "DEFAULT" : ""}
                      />
                    ))}
                  </div>
                )}

                <h3 className="mb-2 mt-6 text-sm font-semibold">Delivery zone</h3>
                <div className="space-y-2">
                  {initialZones.map((zone) => (
                    <ChoiceRow
                      key={zone.id}
                      active={zone.id === zoneId}
                      onClick={() => setZoneId(zone.id)}
                      title={zone.name}
                      subtitle={zone.estimatedDays ?? zone.city}
                      right={money(zone.feeMinor)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="animate-[leemStep_.3s_ease]">
                <h2 className="mb-1 text-lg font-semibold">Payment</h2>
                <p className="mb-4 text-[12.5px] text-[#8A887E]">
                  Card, bank transfer and USSD are collected inside Paystack Popup.
                </p>
                <button
                  className="flex w-full items-center gap-3 rounded-[10px] border border-primary bg-[#F4F6EE] p-4 text-left"
                  type="button"
                >
                  <span className="flex size-5 items-center justify-center rounded-full border-2 border-primary">
                    <span className="size-2 rounded-full bg-primary" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">Paystack</span>
                    <span className="block text-xs text-[#8A887E]">Card, bank transfer or USSD</span>
                  </span>
                  <LockKeyhole className="size-4" />
                </button>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="animate-[leemStep_.3s_ease]">
                <h2 className="mb-1 text-lg font-semibold">Review</h2>
                <p className="mb-4 text-[12.5px] text-[#8A887E]">
                  Prices and availability below are confirmed by the server.
                </p>
                <ReviewRow label="Contact" value={customerEmail} onEdit={() => setStep(0)} />
                <ReviewRow
                  label="Delivery"
                  value={
                    selectedAddress
                      ? [
                          selectedAddress.line1,
                          selectedAddress.line2,
                          selectedAddress.city,
                          selectedAddress.state,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : "No address selected"
                  }
                  onEdit={() => setStep(1)}
                />
                <ReviewRow
                  label="Payment"
                  value="Paystack · card, bank transfer or USSD"
                  onEdit={() => setStep(2)}
                />
                <Alert className="mt-5">
                  <LockKeyhole className="size-4" />
                  <AlertTitle>Server-confirmed checkout</AlertTitle>
                  <AlertDescription>
                    Popup completion only starts verification. Your cart clears after the local
                    payment and order settle successfully.
                  </AlertDescription>
                </Alert>
              </section>
            ) : null}

            {message ? (
              <Alert className="mt-5" variant="destructive">
                <AlertTitle>
                  {payState === "cancelled" ? "Payment cancelled" : "Checkout needs attention"}
                </AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            {payState === "confirming" || canonicalCheckout?.status === "pending" ? (
              <Alert className="mt-5">
                <Clock className="size-4" />
                <AlertTitle>Confirming payment</AlertTitle>
                <AlertDescription>
                  Paystack has returned control. We are verifying the canonical server status; do
                  not close this page yet.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="mt-7 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setStep((value) => Math.max(0, value - 1) as CheckoutStep)}
                >
                  Back
                </Button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <Button
                  onClick={() => void next()}
                  disabled={createCheckout.isPending || (step === 1 && (!addressId || !zoneId))}
                >
                  {step === 2 && createCheckout.isPending ? "Preparing checkout…" : "Continue"}
                </Button>
              ) : (
                <Button
                  onClick={() => void payNow()}
                  disabled={
                    !draft?.accessCode ||
                    payState === "opening" ||
                    payState === "confirming" ||
                    verifyPayment.isPending
                  }
                >
                  {payState === "opening"
                    ? "Opening Paystack…"
                    : payState === "confirming"
                      ? "Confirming…"
                      : `Pay ${money(displayTotalMinor)}`}
                </Button>
              )}
            </div>
          </section>

          <OrderSummary
            checkoutItems={checkoutItems}
            deliveryMinor={displayDeliveryMinor}
            discountMinor={displayDiscountMinor}
            secondsLeft={secondsLeft}
            subtotalMinor={displaySubtotalMinor}
            totalMinor={displayTotalMinor}
            zoneName={selectedZone?.name ?? "Delivery"}
          />
        </div>
      </Card>
    </main>
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
              className="flex h-auto shrink-0 items-center gap-2 p-0"
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
      className="flex h-auto w-full items-center gap-[13px] text-left"
      onClick={onClick}
      variant={active ? "secondary" : "outline"}
    >
      <span
        className={cn(
          "flex size-[19px] shrink-0 items-center justify-center rounded-full border-2",
          active ? "border-primary" : "border-[#CFCDC4]",
        )}
      >
        <span className={cn("size-[9px] rounded-full", active ? "bg-primary" : "bg-transparent")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[#8A887E]">{subtitle}</span>
      </span>
      <span className="text-xs font-semibold">{right}</span>
    </Button>
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
      <Button size="lg" className="shrink-0 self-start" onClick={onEdit} variant="ghost">
        Edit
      </Button>
    </div>
  );
}

function OrderSummary({
  checkoutItems,
  deliveryMinor,
  discountMinor,
  secondsLeft,
  subtotalMinor,
  totalMinor,
  zoneName,
}: {
  checkoutItems: Array<{
    lineKey: string;
    name: string;
    meta: string;
    quantity: number;
    unitPriceNaira: number;
    image: string;
  }>;
  deliveryMinor: number;
  discountMinor: number;
  secondsLeft: number | null;
  subtotalMinor: number;
  totalMinor: number;
  zoneName: string;
}) {
  return (
    <aside className="min-w-[300px] flex-[1_1_400px] border-l border-[#F0EEE8] bg-[#FAF9F6] px-[34px] pb-11 pt-8 max-md:border-l-0 max-sm:px-5">
      <div className="mb-4 flex items-center gap-2 rounded-full border border-chip-border bg-chip-bg px-3.5 py-[9px]">
        <span className="size-2 rounded-full bg-[#7C8C63]" />
        <span className="text-[12.5px] text-[#4A5540]">
          {secondsLeft === null
            ? "Availability is confirmed when checkout starts"
            : `Browser hold indicator · ${formatSeconds(secondsLeft)}`}
        </span>
      </div>
      {checkoutItems.map((item) => (
        <div className="flex items-center gap-3.5 py-2.5" key={item.lineKey}>
          <div className="relative h-[66px] w-[60px] shrink-0 overflow-hidden rounded-[9px] bg-[#E4E5DE]">
            <span className="absolute -right-[7px] -top-[7px] z-[2] flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4A4842] text-[11px] font-semibold text-white">
              {item.quantity}
            </span>
            {item.image ? (
              <CloudImage
                alt={item.name}
                className="object-cover"
                fill
                sizes="60px"
                src={item.image}
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium">{item.name}</div>
            <div className="mt-0.5 text-xs text-[#8A887E]">{item.meta}</div>
          </div>
          <div className="whitespace-nowrap text-[13.5px] font-semibold">
            {money(item.unitPriceNaira * item.quantity * 100)}
          </div>
        </div>
      ))}
      <div className="mt-5 space-y-2 border-t border-[#ECEAE3] pt-4 text-[13.5px]">
        <SummaryRow label="Subtotal" value={money(subtotalMinor)} />
        <SummaryRow label={`Delivery · ${zoneName}`} value={money(deliveryMinor)} />
        {discountMinor > 0 ? (
          <SummaryRow label="Discount" value={`−${money(discountMinor)}`} />
        ) : null}
        <div className="mt-3 flex items-baseline justify-between border-t border-[#ECEAE3] pt-3">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-[22px] font-semibold">{money(totalMinor)}</span>
        </div>
      </div>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#57554E]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function money(amountMinor: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatSeconds(seconds: number) {
  const value = Math.max(0, seconds);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

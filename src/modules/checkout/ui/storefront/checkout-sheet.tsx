"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/http/client";
import { useStorefrontAuth } from "@/modules/auth/ui/storefront-auth-provider";
import {
  checkoutContextQueryOptions,
  checkoutCouponQueryOptions,
  checkoutQueryOptions,
  useCreateCheckout,
  useVerifyCheckoutPayment,
} from "@/modules/checkout/client/hooks";
import { checkoutKeys } from "@/modules/checkout/client/keys";
import type {
  CheckoutContext,
  CheckoutDraft,
  CheckoutStatus,
} from "@/modules/checkout/types";
import { useUpdateOwnedProfile } from "@/modules/customers/client/account-hooks";
import type { OwnedAddress } from "@/modules/customers/types";
import {
  preloadPaystackPopup,
  resumePaystackTransaction,
} from "@/modules/payments/client/paystack-popup";
import { openStorefrontOverlay } from "@/modules/storefront-shell/client/storefront-runtime";

export type StorefrontCheckoutLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

type StorefrontCheckoutSheetProps = {
  active: boolean;
  lines: readonly StorefrontCheckoutLine[];
  subtotalMinor: number;
  onBack: () => void;
  onPaid: (orderNumber: string) => void;
};

type PaymentStage = "ready" | "creating" | "paying" | "verifying";
type PaymentNotice = {
  title: string;
  detail: string;
  tone: "neutral" | "warning" | "danger";
};

export function StorefrontCheckoutSheet({
  active,
  lines,
  subtotalMinor,
  onBack,
  onPaid,
}: StorefrontCheckoutSheetProps) {
  const queryClient = useQueryClient();
  const auth = useStorefrontAuth();
  const signedIn = auth.state.signedIn;
  const contextQuery = useQuery(checkoutContextQueryOptions(active && signedIn));
  const createCheckout = useCreateCheckout();
  const verifyPayment = useVerifyCheckoutPayment();
  const updateProfile = useUpdateOwnedProfile();
  const normalizedLines = useMemo(() => mergeCheckoutLines(lines), [lines]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [debouncedCouponCode, setDebouncedCouponCode] = useState("");
  const [paymentStage, setPaymentStage] = useState<PaymentStage>("ready");
  const [activeCheckout, setActiveCheckout] = useState<CheckoutDraft | null>(null);
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const completedOrder = useRef<string | null>(null);
  const checkoutStatusQuery = useQuery(checkoutQueryOptions(activeCheckout?.checkoutId ?? ""));
  const couponQuery = useQuery(
    checkoutCouponQueryOptions(
      debouncedCouponCode,
      subtotalMinor,
      active && signedIn && !activeCheckout && debouncedCouponCode.trim().length >= 2,
    ),
  );

  const context = contextQuery.data;
  const addresses = useMemo(() => uniqueById(context?.addresses ?? []), [context?.addresses]);
  const deliveryZones = useMemo(
    () => uniqueById(context?.deliveryZones ?? []),
    [context?.deliveryZones],
  );
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );
  const selectedZone = useMemo(
    () => deliveryZones.find((zone) => zone.id === selectedZoneId) ?? null,
    [deliveryZones, selectedZoneId],
  );
  const couponValidation = couponCode.trim() ? couponQuery.data ?? null : null;
  const discountMinor = couponValidation?.valid ? couponValidation.discountMinor : 0;
  const displaySubtotalMinor = activeCheckout?.subtotalMinor ?? subtotalMinor;
  const displayDeliveryFeeMinor = activeCheckout?.deliveryFeeMinor ?? selectedZone?.feeMinor ?? 0;
  const displayDiscountMinor = activeCheckout?.discountMinor ?? discountMinor;
  const totalMinor =
    activeCheckout?.totalMinor ??
    Math.max(0, subtotalMinor + (selectedZone?.feeMinor ?? 0) - discountMinor);
  const phoneReady = Boolean(context && !context.phoneRequired && context.profile.phone.trim());
  const couponReady =
    !couponCode.trim() ||
    (debouncedCouponCode.trim() === couponCode.trim() &&
      !couponQuery.isFetching &&
      couponValidation?.valid === true);
  const currentStatus = checkoutStatusQuery.data?.status ?? activeCheckout?.status ?? null;
  const paymentNotice = getPaymentNotice(currentStatus);
  const canResume = Boolean(
    activeCheckout?.accessCode &&
      currentStatus &&
      isResumableCheckoutStatus(currentStatus) &&
      paymentStage === "ready",
  );
  const canCreate = Boolean(
    !activeCheckout &&
      signedIn &&
      phoneReady &&
      selectedAddressId &&
      selectedZoneId &&
      normalizedLines.length > 0 &&
      couponReady &&
      paymentStage === "ready",
  );
  const canPay = canResume || canCreate;

  useEffect(() => {
    if (!active) return;
    void preloadPaystackPopup().catch(() => undefined);
  }, [active]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCouponCode(couponCode.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [couponCode]);

  useEffect(() => {
    if (!context) return;
    const firstAddressId = uniqueById(context.addresses).at(0)?.id ?? null;
    const firstZoneId = uniqueById(context.deliveryZones).at(0)?.id ?? null;
    setSelectedAddressId((current) =>
      current && context.addresses.some((address) => address.id === current)
        ? current
        : (context.defaultAddressId ?? firstAddressId),
    );
    setSelectedZoneId((current) =>
      current && context.deliveryZones.some((zone) => zone.id === current)
        ? current
        : (context.selectedDeliveryZoneId ?? firstZoneId),
    );
    setPhone(context.profile.phone);
    setPhoneConfirmation(context.profile.phone);
    setActiveCheckout((current) => current ?? context.activeCheckout);
  }, [context]);

  useEffect(() => {
    if (!context || !selectedAddress || activeCheckout) return;
    selectZoneForAddress(selectedAddress, context, setSelectedZoneId);
  }, [activeCheckout, context, selectedAddress]);

  useEffect(() => {
    const checkout = checkoutStatusQuery.data;
    if (!checkout || completedOrder.current === checkout.orderNumber) return;
    setActiveCheckout(checkout);
    if (checkout.status === "success") {
      completedOrder.current = checkout.orderNumber;
      onPaid(checkout.orderNumber);
      return;
    }
    if (isTerminalFailure(checkout.status)) setPaymentStage("ready");
  }, [checkoutStatusQuery.data, onPaid]);

  async function savePhone(): Promise<void> {
    if (!context) return;
    const normalizedPhone = phone.trim();
    const normalizedConfirmation = phoneConfirmation.trim();
    if (normalizedPhone.replaceAll(/\D/g, "").length < 7) {
      toast.error("Enter a valid phone number.");
      return;
    }
    if (normalizedPhone !== normalizedConfirmation) {
      toast.error("The phone numbers do not match.");
      return;
    }

    try {
      const profile = await updateProfile.mutateAsync({
        firstName: context.profile.firstName,
        lastName: context.profile.lastName,
        preferredName: context.profile.preferredName || undefined,
        phone: normalizedPhone,
      });
      queryClient.setQueryData<CheckoutContext>(checkoutKeys.context(), (current) =>
        current ? { ...current, profile, profileComplete: true, phoneRequired: false } : current,
      );
      toast.success("Phone number saved to your account.");
    } catch (error: unknown) {
      toast.error(readErrorMessage(error, "Your phone number could not be saved."));
    }
  }

  async function startPayment(): Promise<void> {
    if (!context || !canPay) return;

    setPaymentStage("creating");
    try {
      let checkout: CheckoutDraft;
      if (activeCheckout?.accessCode && isResumableCheckoutStatus(activeCheckout.status)) {
        checkout = activeCheckout;
      } else {
        if (!selectedAddressId || !selectedZoneId || normalizedLines.length === 0) {
          setPaymentStage("ready");
          return;
        }
        checkout = await createCheckout.mutateAsync({
          idempotencyKey: idempotencyKey.current,
          addressId: selectedAddressId,
          deliveryZoneId: selectedZoneId,
          ...(couponValidation?.valid ? { couponCode: couponValidation.code } : {}),
          lines: normalizedLines.map((line) => ({
            productId: line.productId,
            ...(line.variantId ? { variantId: line.variantId } : {}),
            quantity: line.quantity,
          })),
        });
      }
      setActiveCheckout(checkout);
      if (!checkout.accessCode) {
        throw new Error("This payment cannot be reopened. Open the order in your account for help.");
      }

      setPaymentStage("paying");
      const outcome = await resumePaystackTransaction(checkout.accessCode);
      if (outcome.kind === "cancelled") {
        setPaymentStage("ready");
        toast.message("Payment was closed. Your checkout is saved and ready when you are.");
        return;
      }
      if (outcome.kind === "error") throw new Error(outcome.message);

      setPaymentStage("verifying");
      const settlement = await verifyPayment.mutateAsync(checkout.paymentId);
      if (settlement.status === "success") {
        completedOrder.current = settlement.orderNumber;
        onPaid(settlement.orderNumber);
        return;
      }
      setPaymentStage("ready");
      if (isTerminalFailure(settlement.status)) {
        toast.error(paymentOutcomeMessage(settlement.status));
        return;
      }
      toast.message("We received the payment update and are waiting for confirmation.");
    } catch (error: unknown) {
      setPaymentStage("ready");
      toast.error(readErrorMessage(error, "Payment could not be completed."));
    }
  }

  if (!signedIn) {
    return (
      <CheckoutPanelShell onBack={onBack} title="Checkout">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            Sign in to use your saved delivery details. Your bag will stay exactly as it is.
          </p>
          <Button
            onClick={() => auth.actions.openSignin(() => openStorefrontOverlay("cartDrawer"))}
            type="button"
          >
            Sign in to continue
          </Button>
        </div>
      </CheckoutPanelShell>
    );
  }

  if (contextQuery.isPending) {
    return (
      <CheckoutPanelShell onBack={onBack} title="Checkout">
        <div className="grid flex-1 place-items-center px-6 text-sm text-[var(--muted)]">
          Loading your saved delivery details…
        </div>
      </CheckoutPanelShell>
    );
  }

  if (contextQuery.isError || !context) {
    return (
      <CheckoutPanelShell onBack={onBack} title="Checkout">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-[var(--muted)]">
            {readErrorMessage(contextQuery.error, "Checkout details could not be loaded.")}
          </p>
          <Button onClick={() => void contextQuery.refetch()} type="button" variant="outline">
            Try again
          </Button>
        </div>
      </CheckoutPanelShell>
    );
  }

  return (
    <CheckoutPanelShell onBack={onBack} title="Checkout">
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {paymentNotice ? <PaymentStatusCard notice={paymentNotice} /> : null}
        {activeCheckout && !paymentNotice ? (
          <section className="rounded-xl border border-[var(--line)] bg-[var(--sage-light)] p-4 text-sm">
            <p className="font-medium">Your checkout is saved</p>
            <p className="mt-1 leading-5 text-[var(--muted)]">
              Continue the existing payment for order {activeCheckout.orderNumber}. Your delivery
              details and total are already locked in.
            </p>
          </section>
        ) : null}

        <section className="space-y-3">
          <SectionHeading label="Account details" />
          <SummaryCard>
            <p className="font-medium text-[var(--ink)]">{profileDisplayName(context)}</p>
            <p>{context.profile.email ?? "Email unavailable"}</p>
            {phoneReady ? <p>{context.profile.phone}</p> : null}
          </SummaryCard>
          {!activeCheckout && context.phoneRequired ? (
            <div className="grid gap-3 rounded-xl border border-[var(--line)] p-4">
              <p className="text-sm leading-5 text-[var(--muted)]">
                Add your phone number for delivery updates. We will save it to your account so you
                only need to enter it once.
              </p>
              <Input
                aria-label="Phone number"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
                value={phone}
              />
              <Input
                aria-label="Confirm phone number"
                inputMode="tel"
                onChange={(event) => setPhoneConfirmation(event.target.value)}
                placeholder="Confirm phone number"
                value={phoneConfirmation}
              />
              <Button
                disabled={updateProfile.isPending}
                onClick={() => void savePhone()}
                type="button"
                variant="outline"
              >
                {updateProfile.isPending ? "Saving…" : "Save phone number"}
              </Button>
            </div>
          ) : null}
        </section>

        {!activeCheckout ? (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <SectionHeading label="Delivery address" />
                {addresses.length > 1 ? (
                  <Button
                    onClick={() => setShowAddressSelector((current) => !current)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {showAddressSelector ? "Keep selected address" : "Change delivery address"}
                  </Button>
                ) : null}
              </div>

              {selectedAddress ? <AddressSummary address={selectedAddress} /> : null}

              {showAddressSelector && addresses.length > 1 ? (
                <label className="grid gap-2 text-sm">
                  <span className="text-[var(--muted)]">Choose a saved address</span>
                  <select
                    className="h-10 rounded-lg border border-input bg-control px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    onChange={(event) => setSelectedAddressId(event.target.value)}
                    value={selectedAddressId ?? ""}
                  >
                    {addresses.map((address) => (
                      <option key={`checkout-address:${address.id}`} value={address.id}>
                        {address.label}
                        {address.isDefault ? " · Default" : ""} · {address.city}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {addresses.length === 0 ? (
                <SummaryCard>
                  <p>No delivery address is saved yet.</p>
                  <Button
                    className="mt-3 px-0"
                    nativeButton={false}
                    render={<Link href="/account/addresses?returnTo=checkout" />}
                    size="sm"
                    variant="link"
                  >
                    Add an address in your account
                  </Button>
                </SummaryCard>
              ) : (
                <Button
                  className="px-0"
                  nativeButton={false}
                  render={<Link href="/account/addresses?returnTo=checkout" />}
                  size="sm"
                  variant="link"
                >
                  Manage saved addresses
                </Button>
              )}
            </section>

            <section className="space-y-3">
              <SectionHeading label="Delivery estimate" />
              {selectedZone ? (
                <SummaryCard>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[var(--ink)]">{selectedZone.name}</p>
                      <p className="mt-1">{selectedZone.city}</p>
                      <p className="mt-1 text-xs">
                        {selectedZone.estimatedDays || "We will confirm the timing after payment."}
                      </p>
                    </div>
                    <p className="font-mono font-medium text-[var(--ink)] tabular-nums">
                      {formatNaira(selectedZone.feeMinor)}
                    </p>
                  </div>
                </SummaryCard>
              ) : (
                <SummaryCard>
                  We do not have a delivery option for this address yet. Choose another saved
                  address or update your addresses in your account.
                </SummaryCard>
              )}
            </section>

            <section className="space-y-3">
              <SectionHeading label="Coupon code" />
              <div className="rounded-xl border border-[var(--line)] p-4">
                <Input
                  aria-label="Coupon code"
                  autoComplete="off"
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  value={couponCode}
                />
                {couponCode.trim() ? (
                  <p
                    aria-live="polite"
                    className={`mt-2 text-xs ${
                      couponQuery.isFetching
                        ? "text-[var(--muted)]"
                        : couponValidation?.valid
                          ? "text-emerald-700"
                          : "text-red-700"
                    }`}
                  >
                    {couponQuery.isFetching
                      ? "Checking your code…"
                      : couponValidation?.message || "Enter at least two characters."}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Add a valid code to see your updated total.
                  </p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--bone-2)] px-6 py-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 text-[var(--muted)]">
            <span>Items</span>
            <span>{formatNaira(displaySubtotalMinor)}</span>
          </div>
          <div className="flex justify-between gap-4 text-[var(--muted)]">
            <span>{activeCheckout ? "Delivery" : "Estimated delivery"}</span>
            <span>{displayDeliveryFeeMinor > 0 ? formatNaira(displayDeliveryFeeMinor) : "—"}</span>
          </div>
          {displayDiscountMinor > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-700">
              <span>{activeCheckout ? "Discount" : `Coupon ${couponValidation?.code ?? ""}`}</span>
              <span>−{formatNaira(displayDiscountMinor)}</span>
            </div>
          ) : null}
          <div className="flex items-end justify-between gap-4 border-t border-[var(--line)] pt-3">
            <span className="font-medium">Total</span>
            <span className="font-serif text-2xl">{formatNaira(totalMinor)}</span>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          disabled={!canPay}
          onClick={() => void startPayment()}
          type="button"
        >
          {paymentLabel(paymentStage, Boolean(activeCheckout))}
        </Button>
        {activeCheckout && !activeCheckout.accessCode ? (
          <p className="mt-3 text-center text-[11px] leading-4 text-red-700">
            This payment cannot be reopened here. Open the order in your account for help.
          </p>
        ) : (
          <p className="mt-3 text-center text-[11px] leading-4 text-[var(--muted)]">
            A secure payment window will open. Your order is confirmed only after payment is
            verified.
          </p>
        )}
      </div>
    </CheckoutPanelShell>
  );
}

function CheckoutPanelShell({
  children,
  onBack,
  title,
}: {
  children: ReactNode;
  onBack: () => void;
  title: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-5">
        <Button
          aria-label="Back to bag"
          onClick={onBack}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          ←
        </Button>
        <div>
          <p className="font-serif text-3xl font-normal italic">{title}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Delivery and secure payment</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function PaymentStatusCard({ notice }: { notice: PaymentNotice }) {
  const toneClass = {
    neutral: "border-[var(--line)] bg-[var(--sage-light)]",
    warning: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100",
    danger: "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
  }[notice.tone];

  return (
    <section aria-live="polite" className={`rounded-xl border p-4 text-sm ${toneClass}`}>
      <p className="font-medium">{notice.title}</p>
      <p className="mt-1 leading-5 opacity-80">{notice.detail}</p>
    </section>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
      {label}
    </h3>
  );
}

function SummaryCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--line)] p-4 text-sm leading-5 text-[var(--muted)]">
      {children}
    </div>
  );
}

function AddressSummary({ address }: { address: OwnedAddress }) {
  return (
    <SummaryCard>
      <p className="font-medium text-[var(--ink)]">
        {address.label}
        {address.isDefault ? " · Default" : ""}
      </p>
      <p className="mt-1">
        {[address.line1, address.line2, address.city, address.state].filter(Boolean).join(", ")}
      </p>
      {address.deliveryNotes ? <p className="mt-1 text-xs">{address.deliveryNotes}</p> : null}
    </SummaryCard>
  );
}

function profileDisplayName(context: CheckoutContext): string {
  return (
    context.profile.preferredName.trim() ||
    [context.profile.firstName, context.profile.lastName].filter(Boolean).join(" ") ||
    context.profile.email?.split("@").at(0) ||
    "Your account"
  );
}

function selectZoneForAddress(
  address: OwnedAddress,
  context: CheckoutContext,
  select: (zoneId: string | null) => void,
): void {
  const city = normalizeLocation(address.city);
  const zone = uniqueById(context.deliveryZones).find(
    (item) => normalizeLocation(item.city) === city,
  );
  select(zone?.id ?? null);
}

function mergeCheckoutLines(lines: readonly StorefrontCheckoutLine[]): StorefrontCheckoutLine[] {
  const merged = new Map<string, StorefrontCheckoutLine>();
  for (const line of lines) {
    if (!line.productId || !Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    const key = `${line.productId}:${line.variantId ?? "product"}`;
    const current = merged.get(key);
    merged.set(key, {
      productId: line.productId,
      variantId: line.variantId,
      quantity: (current?.quantity ?? 0) + line.quantity,
    });
  }
  return Array.from(merged.values());
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) byId.set(item.id, item);
  return Array.from(byId.values());
}

function normalizeLocation(value: string): string {
  return value.trim().toLocaleLowerCase("en-NG");
}

function formatNaira(amountMinor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function paymentLabel(stage: PaymentStage, resuming: boolean): string {
  switch (stage) {
    case "creating":
      return "Preparing payment…";
    case "paying":
      return "Complete payment in the secure window…";
    case "verifying":
      return "Confirming payment…";
    case "ready":
      return resuming ? "Continue payment" : "Pay securely";
  }
}

function getPaymentNotice(status: CheckoutStatus | null): PaymentNotice | null {
  switch (status) {
    case "initializing":
    case "initialized":
    case "pending":
      return {
        title: "Payment is still in progress",
        detail: "You can continue this payment without creating another order.",
        tone: "neutral",
      };
    case "failed":
      return {
        title: "Payment was not completed",
        detail: "Your checkout and bag are saved. Use Continue payment below to try again safely.",
        tone: "danger",
      };
    case "abandoned":
      return {
        title: "The payment window was closed",
        detail: "Nothing has been lost. Your checkout is saved and ready to continue.",
        tone: "warning",
      };
    case "reversed":
      return {
        title: "Payment was reversed",
        detail: "This order was not marked paid. Open the order in your account if you need help.",
        tone: "danger",
      };
    case "review_required":
      return {
        title: "Payment is being reviewed",
        detail: "Please do not pay again yet. We will update the order when the review is complete.",
        tone: "warning",
      };
    case "success":
    case null:
      return null;
  }
}

function isResumableCheckoutStatus(status: CheckoutStatus): boolean {
  return status !== "success" && status !== "reversed" && status !== "review_required";
}

function isTerminalFailure(status: CheckoutStatus): boolean {
  return status === "failed" || status === "abandoned" || status === "reversed" || status === "review_required";
}

function paymentOutcomeMessage(status: CheckoutStatus): string {
  switch (status) {
    case "failed":
      return "Payment was not completed. Your checkout is saved.";
    case "abandoned":
      return "The payment window was closed. Your checkout is saved.";
    case "reversed":
      return "Payment was reversed. Open the order in your account for help.";
    case "review_required":
      return "Payment is being reviewed. Please do not pay again yet.";
    default:
      return "Payment is still being confirmed.";
  }
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return fallback;
}

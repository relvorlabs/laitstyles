"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  CheckoutDeliveryQuote,
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

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

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
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );
  const selectedQuote = useMemo(
    () =>
      context?.deliveryQuotes.find((quote) => quote.addressId === selectedAddressId) ??
      context?.selectedDeliveryQuote ??
      null,
    [context, selectedAddressId],
  );
  const couponValidation = couponCode.trim() ? couponQuery.data ?? null : null;
  const discountMinor = couponValidation?.valid ? couponValidation.discountMinor : 0;
  const displaySubtotalMinor = activeCheckout?.subtotalMinor ?? subtotalMinor;
  const displayDeliveryFeeMinor = activeCheckout?.deliveryFeeMinor ?? selectedQuote?.feeMinor ?? 0;
  const displayDiscountMinor = activeCheckout?.discountMinor ?? discountMinor;
  const totalMinor =
    activeCheckout?.totalMinor ??
    Math.max(0, subtotalMinor + (selectedQuote?.feeMinor ?? 0) - discountMinor);
  const phoneReady = Boolean(context && !context.phoneRequired && context.profile.phone.trim());
  const couponReady =
    !couponCode.trim() ||
    (debouncedCouponCode.trim() === couponCode.trim() &&
      !couponQuery.isFetching &&
      couponValidation?.valid === true);
  const currentStatus = checkoutStatusQuery.data?.status ?? activeCheckout?.status ?? null;
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
      selectedQuote &&
      normalizedLines.length > 0 &&
      couponReady &&
      paymentStage === "ready",
  );
  const canPay = canResume || canCreate;
  const blocker = getCheckoutBlocker({
    activeCheckout,
    couponCode,
    couponReady,
    couponFetching: couponQuery.isFetching,
    currentStatus,
    lineCount: normalizedLines.length,
    paymentStage,
    phoneReady,
    selectedAddressId,
    selectedQuote,
  });

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
    setSelectedAddressId((current) =>
      current && context.addresses.some((address) => address.id === current)
        ? current
        : (context.defaultAddressId ?? firstAddressId),
    );
    setPhone(context.profile.phone);
    setPhoneConfirmation(context.profile.phone);
    setActiveCheckout((current) => current ?? context.activeCheckout);
  }, [context]);

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
    if (normalizedPhone.replaceAll(/\D/g, "").length < 7) {
      toast.error("Enter a valid phone number.");
      return;
    }
    if (normalizedPhone !== phoneConfirmation.trim()) {
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
      setPhone(profile.phone);
      setPhoneConfirmation(profile.phone);
      toast.success("Delivery number saved.");
    } catch (error: unknown) {
      toast.error(readErrorMessage(error, "Your phone number could not be saved."));
    }
  }

  async function startPayment(): Promise<void> {
    if (!context || !canPay) return;

    setPaymentStage("creating");
    try {
      let checkout: CheckoutDraft;
      const resumableStatus = currentStatus ?? activeCheckout?.status ?? null;
      if (
        activeCheckout?.accessCode &&
        resumableStatus &&
        isResumableCheckoutStatus(resumableStatus)
      ) {
        checkout = activeCheckout;
      } else {
        if (!selectedAddressId || !selectedQuote || normalizedLines.length === 0) {
          setPaymentStage("ready");
          return;
        }
        checkout = await createCheckout.mutateAsync({
          idempotencyKey: idempotencyKey.current,
          addressId: selectedAddressId,
          ...(couponValidation?.valid ? { couponCode: couponValidation.code } : {}),
          lines: normalizedLines.map((line) => ({
            productId: line.productId,
            ...(line.variantId ? { variantId: line.variantId } : {}),
            quantity: line.quantity,
          })),
        });
      }

      setActiveCheckout(checkout);
      if (!checkout.accessCode) throw new Error("payment-access-unavailable");

      setPaymentStage("paying");
      const outcome = await resumePaystackTransaction(checkout.accessCode);
      if (outcome.kind === "cancelled") {
        setPaymentStage("ready");
        toast.message("Payment was closed. Your order is saved and ready to resume.");
        return;
      }
      if (outcome.kind === "error") {
        setPaymentStage("ready");
        toast.error("Paystack could not open. Please try again.");
        return;
      }

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
      toast.message("Payment is still being confirmed. You can resume from this checkout.");
    } catch (error: unknown) {
      setPaymentStage("ready");
      toast.error(readErrorMessage(error, "Payment could not be completed."));
    }
  }

  if (!signedIn) {
    return (
      <CheckoutShell onBack={onBack}>
        <CenteredState
          action={
            <Button
              className="min-h-11 min-w-48"
              onClick={() => auth.actions.openSignin(() => openStorefrontOverlay("checkoutDialog"))}
              type="button"
            >
              Sign in to continue
            </Button>
          }
          detail="Your cart stays saved while we load your contact and delivery details."
          title="Sign in to checkout"
        />
      </CheckoutShell>
    );
  }

  if (contextQuery.isPending) {
    return (
      <CheckoutShell onBack={onBack}>
        <CenteredState detail="Loading your contact, addresses and payment status." title="Preparing checkout" />
      </CheckoutShell>
    );
  }

  if (contextQuery.isError || !context) {
    return (
      <CheckoutShell onBack={onBack}>
        <CenteredState
          action={
            <Button onClick={() => void contextQuery.refetch()} type="button" variant="outline">
              Retry
            </Button>
          }
          detail={readErrorMessage(contextQuery.error, "Checkout details could not be loaded.")}
          title="Checkout unavailable"
        />
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell onBack={onBack}>
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        <div className="space-y-6">
          {activeCheckout ? (
            <StatusCard
              detail={paymentStatusDetail(currentStatus)}
              title={`Order ${activeCheckout.orderNumber}`}
            />
          ) : null}

          {!activeCheckout ? (
            <>
              <CheckoutSection title="Contact">
                {phoneReady ? (
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--line)] p-4">
                    <div>
                      <p className="font-medium">{profileDisplayName(context)}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{context.profile.phone}</p>
                    </div>
                    <span className="text-xs font-medium text-[var(--sage)]">Confirmed</span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[var(--line)] p-4">
                    <p className="text-sm text-[var(--muted)]">
                      Add the number the delivery team should use for this order.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Input
                        aria-label="Delivery phone number"
                        autoComplete="tel"
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Phone number"
                        type="tel"
                        value={phone}
                      />
                      <Input
                        aria-label="Confirm delivery phone number"
                        autoComplete="tel"
                        onChange={(event) => setPhoneConfirmation(event.target.value)}
                        placeholder="Confirm number"
                        type="tel"
                        value={phoneConfirmation}
                      />
                    </div>
                    <Button
                      className="mt-3 min-h-11"
                      disabled={updateProfile.isPending}
                      onClick={() => void savePhone()}
                      type="button"
                      variant="outline"
                    >
                      {updateProfile.isPending ? "Saving…" : "Save delivery number"}
                    </Button>
                  </div>
                )}
              </CheckoutSection>

              <CheckoutSection title="Delivery address">
                {addresses.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--line)] p-4">
                    <p className="text-sm font-medium">No delivery address is saved yet.</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Add an address, then return here to continue.
                    </p>
                    <Button
                      className="mt-4 min-h-11"
                      render={<Link href="/account/addresses?returnTo=checkout" />}
                      variant="outline"
                    >
                      Add delivery address
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <AddressOption
                        address={address}
                        key={address.id}
                        onSelect={() => setSelectedAddressId(address.id)}
                        quote={context.deliveryQuotes.find(
                          (candidate) => candidate.addressId === address.id,
                        )}
                        selected={address.id === selectedAddressId}
                      />
                    ))}
                    <Button
                      render={<Link href="/account/addresses?returnTo=checkout" />}
                      size="sm"
                      variant="ghost"
                    >
                      Add or edit addresses
                    </Button>
                  </div>
                )}
              </CheckoutSection>

              <CheckoutSection title="Promo code">
                <Input
                  aria-label="Promo code"
                  autoCapitalize="characters"
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Enter code"
                  value={couponCode}
                />
                {couponCode.trim() ? (
                  <p
                    className={`mt-2 text-xs ${
                      couponValidation?.valid ? "text-[var(--sage)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {couponQuery.isFetching
                      ? "Checking code…"
                      : (couponValidation?.message ?? "Enter a valid promo code.")}
                  </p>
                ) : null}
              </CheckoutSection>
            </>
          ) : null}

          <CheckoutSection title="Order summary">
            <div className="rounded-lg border border-[var(--line)] p-4">
              <SummaryRow label="Items" value={formatMoney(displaySubtotalMinor)} />
              <SummaryRow label="Delivery" value={formatMoney(displayDeliveryFeeMinor)} />
              {displayDiscountMinor > 0 ? (
                <SummaryRow label="Discount" value={`−${formatMoney(displayDiscountMinor)}`} />
              ) : null}
              <div className="mt-4 flex items-end justify-between border-t border-[var(--line)] pt-4">
                <span className="font-medium">Total</span>
                <span className="font-serif text-2xl tabular-nums">{formatMoney(totalMinor)}</span>
              </div>
              {selectedQuote && !activeCheckout ? (
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  {selectedQuote.label} · {deliveryEstimate(selectedQuote)}
                </p>
              ) : null}
            </div>
          </CheckoutSection>
        </div>
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--bone)] px-5 py-4 sm:px-7">
        {blocker ? (
          <p className="mb-3 text-sm text-[var(--muted)]" id="checkout-payment-help">
            {blocker}
          </p>
        ) : (
          <p className="mb-3 text-xs text-[var(--muted)]" id="checkout-payment-help">
            Paystack opens in a secure payment window. Your order is confirmed only after server verification.
          </p>
        )}
        <Button
          aria-describedby="checkout-payment-help"
          className="min-h-12 w-full text-sm"
          disabled={!canPay}
          onClick={() => void startPayment()}
          type="button"
        >
          {paymentLabel(paymentStage, Boolean(activeCheckout), totalMinor)}
        </Button>
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--bone)]">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4 pr-14 sm:px-7">
        <Button aria-label="Back to cart" onClick={onBack} size="icon-sm" type="button" variant="ghost">
          ←
        </Button>
        <div>
          <h2 className="font-serif text-2xl">Checkout</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Delivery and secure payment</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CheckoutSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function CenteredState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center">
      <div>
        <p className="font-serif text-2xl">{title}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function CheckoutSectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold">{children}</h3>;
}

void CheckoutSectionTitle;

function AddressOption({
  address,
  quote,
  selected,
  onSelect,
}: {
  address: OwnedAddress;
  quote?: CheckoutDeliveryQuote;
  selected: boolean;
  onSelect: () => void;
}) {
  const addressText = [address.line1, address.line2, address.city, address.state]
    .filter(Boolean)
    .join(", ");

  return (
    <Button
      aria-label={`${address.label}${address.isDefault ? ", default" : ""}`}
      className={`h-auto min-h-11 w-full items-start justify-start rounded-lg border p-4 text-left ${
        selected
          ? "border-[var(--ink)] bg-[var(--bone-2)]"
          : "border-[var(--line)] bg-transparent"
      }`}
      onClick={onSelect}
      type="button"
      variant="ghost"
    >
      <span className="w-full min-w-0">
        <span className="flex items-start justify-between gap-3">
          <span className="font-medium">{address.label}</span>
          {address.isDefault ? <span className="text-xs text-[var(--muted)]">Default</span> : null}
        </span>
        <span className="mt-1 block whitespace-normal text-sm leading-5 text-[var(--muted)]">
          {addressText}
        </span>
        {quote ? (
          <span className="mt-3 flex items-center justify-between gap-3 text-xs">
            <span>{quote.label}</span>
            <span className="tabular-nums">{formatMoney(quote.feeMinor)}</span>
          </span>
        ) : (
          <span className="mt-3 block text-xs text-[var(--muted)]">Delivery quote unavailable</span>
        )}
        {quote ? (
          <span className="mt-1 block text-xs text-[var(--muted)]">
            This address is covered · {deliveryEstimate(quote)}
          </span>
        ) : null}
      </span>
    </Button>
  );
}

function StatusCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--sage-light)] p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function getCheckoutBlocker({
  activeCheckout,
  couponCode,
  couponReady,
  couponFetching,
  currentStatus,
  lineCount,
  paymentStage,
  phoneReady,
  selectedAddressId,
  selectedQuote,
}: {
  activeCheckout: CheckoutDraft | null;
  couponCode: string;
  couponReady: boolean;
  couponFetching: boolean;
  currentStatus: CheckoutStatus | null;
  lineCount: number;
  paymentStage: PaymentStage;
  phoneReady: boolean;
  selectedAddressId: string | null;
  selectedQuote: CheckoutDeliveryQuote | null;
}): string | null {
  if (paymentStage !== "ready") return "Payment is already in progress.";
  if (activeCheckout) {
    if (currentStatus === "success") return "This payment has already been confirmed.";
    if (!activeCheckout.accessCode) return "The saved payment cannot be resumed yet. Retry shortly.";
    if (currentStatus && !isResumableCheckoutStatus(currentStatus)) {
      return paymentOutcomeMessage(currentStatus);
    }
    return null;
  }
  if (lineCount < 1) return "Your cart is empty. Add an item before checkout.";
  if (!phoneReady) return "Save a delivery phone number to continue.";
  if (!selectedAddressId) return "Add or select a delivery address to continue.";
  if (!selectedQuote) return "A delivery quote is required before payment.";
  if (couponFetching) return "Checking your promo code…";
  if (couponCode.trim() && !couponReady) return "Enter a valid promo code or remove it.";
  return null;
}

function paymentLabel(stage: PaymentStage, resuming: boolean, totalMinor: number): string {
  switch (stage) {
    case "creating":
      return "Preparing payment…";
    case "paying":
      return "Opening Paystack…";
    case "verifying":
      return "Confirming payment…";
    case "ready":
      return `${resuming ? "Resume payment" : "Pay"} · ${formatMoney(totalMinor)}`;
  }
}

function isResumableCheckoutStatus(status: CheckoutStatus): boolean {
  return [
    "initializing",
    "initialized",
    "pending",
    "failed",
    "abandoned",
    "reversed",
    "review_required",
  ].includes(status);
}

function isTerminalFailure(status: CheckoutStatus): boolean {
  return status === "failed" || status === "abandoned" || status === "reversed";
}

function paymentOutcomeMessage(status: CheckoutStatus): string {
  switch (status) {
    case "failed":
      return "Payment failed. Check your details and try again.";
    case "abandoned":
      return "Payment was not completed. You can resume it.";
    case "reversed":
      return "Payment was reversed. No successful charge was recorded.";
    case "review_required":
      return "Payment needs review. You can retry or contact support.";
    case "pending":
    case "initializing":
    case "initialized":
      return "Payment is still being confirmed.";
    case "success":
      return "Payment confirmed.";
  }
}

function paymentStatusDetail(status: CheckoutStatus | null): string {
  if (!status) return "Your order is saved. Continue payment when you are ready.";
  return paymentOutcomeMessage(status);
}

function deliveryEstimate(quote: CheckoutDeliveryQuote): string {
  const value = quote.estimatedDays?.trim();
  if (!value) return "Delivery timing will be confirmed";
  const range = value.includes("day") ? value : `${value} working days`;
  return `Estimated arrival: ${range}.`;
}

function profileDisplayName(context: CheckoutContext): string {
  return (
    context.profile.preferredName ||
    [context.profile.firstName, context.profile.lastName].filter(Boolean).join(" ") ||
    context.profile.email?.split("@").at(0) ||
    "Your account"
  );
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
  return [...merged.values()];
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function formatMoney(minor: number): string {
  return currencyFormatter.format(minor / 100).replace("NGN", "₦");
}

function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

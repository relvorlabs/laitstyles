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
type PaymentNotice = {
  title: string;
  detail: string;
  tone: "neutral" | "warning" | "danger";
};
type CheckoutBlocker = {
  message: string;
  tone: "muted" | "danger";
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
      selectedQuote &&
      normalizedLines.length > 0 &&
      couponReady &&
      paymentStage === "ready",
  );
  const canPay = canResume || canCreate;
  const checkoutBlocker = canPay
    ? null
    : getCheckoutBlocker({
        activeCheckout,
        couponCode,
        couponReady,
        couponFetching: couponQuery.isFetching,
        currentStatus,
        lineCount: normalizedLines.length,
        paymentStage,
        phoneReady,
        selectedAddressId,
        selectedDeliveryQuote: selectedQuote,
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
      setPhone(profile.phone);
      setPhoneConfirmation(profile.phone);
      queryClient.setQueryData<CheckoutContext>(checkoutKeys.context(), (current) =>
        current ? { ...current, profile, profileComplete: true, phoneRequired: false } : current,
      );
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
        toast.message("Payment was closed. Your checkout is saved and ready when you are.");
        return;
      }
      if (outcome.kind === "error") throw new Error("payment-window-failed");

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
      <CheckoutPanelShell onBack={onBack} title="Private checkout">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <Eyebrow>Your fitting room is saved</Eyebrow>
          <div>
            <p className="font-serif text-3xl">Sign in to arrange delivery</p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Your bag stays untouched while we bring in your saved contact and address details.
            </p>
          </div>
          <Button
            className="min-w-48 rounded-full"
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
      <CheckoutPanelShell onBack={onBack} title="Private checkout">
        <div className="grid flex-1 place-items-center px-6 text-sm text-[var(--muted)]">
          Preparing your delivery atelier…
        </div>
      </CheckoutPanelShell>
    );
  }

  if (contextQuery.isError || !context) {
    return (
      <CheckoutPanelShell onBack={onBack} title="Private checkout">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
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
    <CheckoutPanelShell onBack={onBack} title="Private checkout">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-8 px-5 py-6 sm:px-8 sm:py-8">
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--ink)] px-5 py-5 text-[var(--bone)] sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--bone)]/60">
                  Laitstyles delivery service
                </p>
                <h2 className="mt-2 font-serif text-2xl italic sm:text-3xl">
                  Your edit, delivered nationwide.
                </h2>
              </div>
              <span className="rounded-full border border-[var(--bone)]/20 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em]">
                Nigeria-wide
              </span>
            </div>
            <p className="mt-3 max-w-xl text-xs leading-5 text-[var(--bone)]/70">
              Choose any saved Nigerian address. The applicable regional or nationwide rate is
              quoted before the secure payment window opens.
            </p>
          </div>

          {paymentNotice ? <PaymentStatusCard notice={paymentNotice} /> : null}
          {activeCheckout && !paymentNotice ? (
            <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--sage-light)] p-5 text-sm">
              <Eyebrow>Saved order</Eyebrow>
              <p className="mt-2 font-serif text-2xl">{activeCheckout.orderNumber}</p>
              <p className="mt-2 leading-6 text-[var(--muted)]">
                Delivery details and total are locked. Continue the existing payment below rather
                than creating another order.
              </p>
            </section>
          ) : null}

          {!activeCheckout ? (
            <>
              <CheckoutSection number="01" title="Delivery contact">
                {phoneReady ? (
                  <EditorialCard>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-serif text-xl">{profileDisplayName(context)}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{context.profile.phone}</p>
                      </div>
                      <span className="rounded-full bg-[var(--sage-light)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em]">
                        Confirmed
                      </span>
                    </div>
                  </EditorialCard>
                ) : (
                  <EditorialCard>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Add the number our delivery partner should use for this order.
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
                      className="mt-3 rounded-full"
                      disabled={updateProfile.isPending}
                      onClick={() => void savePhone()}
                      type="button"
                      variant="outline"
                    >
                      {updateProfile.isPending ? "Saving number…" : "Save delivery number"}
                    </Button>
                  </EditorialCard>
                )}
              </CheckoutSection>

              <CheckoutSection number="02" title="Where should this edit arrive?">
                {addresses.length > 0 ? (
                  <div className="grid gap-3">
                    {addresses.map((address) => (
                      <AddressChoice
                        address={address}
                        key={`checkout-address:${address.id}`}
                        onSelect={() => setSelectedAddressId(address.id)}
                        selected={address.id === selectedAddressId}
                      />
                    ))}
                  </div>
                ) : (
                  <EditorialCard>
                    <p className="text-sm text-[var(--muted)]">No delivery address is saved yet.</p>
                  </EditorialCard>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    nativeButton={false}
                    render={<Link href="/account/addresses?returnTo=checkout" />}
                    size="sm"
                    variant="outline"
                  >
                    {addresses.length > 0 ? "Add or edit addresses" : "Add delivery address"}
                  </Button>
                  {selectedAddress && !selectedAddress.isDefault ? (
                    <span className="self-center text-xs text-[var(--muted)]">
                      This address applies to this checkout only unless you make it default in your
                      account.
                    </span>
                  ) : null}
                </div>
              </CheckoutSection>

              <CheckoutSection number="03" title="Nationwide delivery">
                {selectedAddress && selectedQuote ? (
                  <DeliveryQuoteCard address={selectedAddress} quote={selectedQuote} />
                ) : (
                  <EditorialCard>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Select an address to reveal the delivery rate. Every valid Nigerian address
                      remains eligible.
                    </p>
                  </EditorialCard>
                )}
              </CheckoutSection>

              <CheckoutSection number="04" title="Private offer">
                <EditorialCard>
                  <label className="grid gap-2">
                    <span className="text-xs text-[var(--muted)]">
                      Enter a coupon code from a Laitstyles offer.
                    </span>
                    <Input
                      aria-label="Coupon code"
                      autoComplete="off"
                      className="font-mono uppercase tracking-[0.12em]"
                      onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                      placeholder="LAIT-STYLE"
                      value={couponCode}
                    />
                  </label>
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
                  ) : null}
                </EditorialCard>
              </CheckoutSection>
            </>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--bone-2)] px-5 py-5 sm:px-8 sm:py-6">
        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--bone)] p-5 shadow-[0_18px_60px_rgba(24,23,20,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <Eyebrow>Order summary</Eyebrow>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Secure Paystack payment
            </span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <SummaryRow label="The edit" value={formatNaira(displaySubtotalMinor)} />
            <SummaryRow
              label={activeCheckout ? "Delivery" : "Nationwide delivery"}
              value={displayDeliveryFeeMinor > 0 ? formatNaira(displayDeliveryFeeMinor) : "Complimentary"}
            />
            {displayDiscountMinor > 0 ? (
              <SummaryRow
                accent
                label={activeCheckout ? "Private offer" : `Offer ${couponValidation?.code ?? ""}`}
                value={`−${formatNaira(displayDiscountMinor)}`}
              />
            ) : null}
          </div>
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-[var(--line)] pt-4">
            <div>
              <p className="text-xs text-[var(--muted)]">Total to pay</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                Confirmed only after verification
              </p>
            </div>
            <span className="font-serif text-3xl sm:text-4xl">{formatNaira(totalMinor)}</span>
          </div>
          <Button
            aria-describedby="checkout-payment-help"
            className="mt-5 h-12 w-full rounded-full text-sm uppercase tracking-[0.12em]"
            disabled={!canPay}
            onClick={() => void startPayment()}
            type="button"
          >
            {paymentLabel(paymentStage, Boolean(activeCheckout))}
          </Button>
          <p
            className={`mx-auto mt-3 max-w-md text-center text-[11px] leading-5 ${
              checkoutBlocker?.tone === "danger" ? "text-red-700" : "text-[var(--muted)]"
            }`}
            id="checkout-payment-help"
          >
            {checkoutBlocker?.message ??
              "A secure payment window will open. Your order is confirmed only after payment is verified."}
          </p>
        </div>
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
      <div className="flex items-center gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-8 sm:py-5">
        <Button
          aria-label="Back to bag"
          className="rounded-full"
          onClick={onBack}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          ←
        </Button>
        <div className="min-w-0">
          <p className="truncate font-serif text-2xl font-normal italic sm:text-3xl">{title}</p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Delivery · offer · verified payment
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CheckoutSection({
  children,
  number,
  title,
}: {
  children: ReactNode;
  number: string;
  title: string;
}) {
  return (
    <section aria-labelledby={`checkout-section-${number}`}>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-[9px] tracking-[0.18em] text-[var(--muted)]">{number}</span>
        <h3 className="font-serif text-2xl" id={`checkout-section-${number}`}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function EditorialCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--bone)] p-4 sm:p-5">
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">
      {children}
    </p>
  );
}

function AddressChoice({
  address,
  onSelect,
  selected,
}: {
  address: OwnedAddress;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`w-full rounded-[1.4rem] border p-4 text-left transition sm:p-5 ${
        selected
          ? "border-[var(--ink)] bg-[var(--sage-light)] shadow-[0_12px_36px_rgba(24,23,20,0.08)]"
          : "border-[var(--line)] bg-[var(--bone)] hover:border-[var(--ink)]/50"
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="flex items-start justify-between gap-4">
        <span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-lg">{address.label || "Delivery address"}</span>
            {address.isDefault ? (
              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em]">
                Default
              </span>
            ) : null}
          </span>
          <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">
            {[address.line1, address.line2, address.city, address.state].filter(Boolean).join(", ")}
          </span>
          {address.deliveryNotes ? (
            <span className="mt-2 block text-xs italic text-[var(--muted)]">
              “{address.deliveryNotes}”
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border ${
            selected ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--line)]"
          }`}
        >
          {selected ? <span className="size-1.5 rounded-full bg-[var(--bone)]" /> : null}
        </span>
      </span>
    </button>
  );
}

function DeliveryQuoteCard({
  address,
  quote,
}: {
  address: OwnedAddress;
  quote: CheckoutDeliveryQuote;
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--bone)]">
      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-start sm:p-6">
        <div>
          <Eyebrow>{quote.coverageLabel}</Eyebrow>
          <p className="mt-2 font-serif text-2xl">{quote.label}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            To {address.city}
            {address.state ? `, ${address.state}` : ""}. This address is covered and will not be
            blocked by its city.
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {formatEstimatedDays(quote.estimatedDays)}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-serif text-3xl">
            {quote.feeMinor > 0 ? formatNaira(quote.feeMinor) : "Complimentary"}
          </p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Applied automatically
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--line)] bg-[var(--sage-light)] px-5 py-3 text-[11px] leading-5 text-[var(--muted)] sm:px-6">
        Regional rates are used when configured; every other Nigerian address receives the
        nationwide rate.
      </div>
    </div>
  );
}

function PaymentStatusCard({ notice }: { notice: PaymentNotice }) {
  const toneClass = {
    neutral: "border-[var(--line)] bg-[var(--sage-light)]",
    warning:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100",
    danger:
      "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
  }[notice.tone];

  return (
    <section aria-live="polite" className={`rounded-[1.5rem] border p-5 text-sm ${toneClass}`}>
      <p className="font-serif text-xl">{notice.title}</p>
      <p className="mt-2 leading-6 opacity-80">{notice.detail}</p>
    </section>
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
    <div className={`flex justify-between gap-4 ${accent ? "text-emerald-700" : "text-[var(--muted)]"}`}>
      <span>{label}</span>
      <span className="font-medium text-current tabular-nums">{value}</span>
    </div>
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

function formatNaira(amountMinor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function formatEstimatedDays(value: string | null): string {
  if (!value) return "Timing is confirmed after payment.";
  const range = value.includes("-")
    ? `${value} working days`
    : `${value} working day${value === "1" ? "" : "s"}`;
  return `Estimated arrival: ${range}.`;
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
      return resuming ? "Continue secure payment" : "Pay securely";
  }
}

function getCheckoutBlocker({
  activeCheckout,
  couponCode,
  couponFetching,
  couponReady,
  currentStatus,
  lineCount,
  paymentStage,
  phoneReady,
  selectedAddressId,
  selectedDeliveryQuote,
}: {
  activeCheckout: CheckoutDraft | null;
  couponCode: string;
  couponFetching: boolean;
  couponReady: boolean;
  currentStatus: CheckoutStatus | null;
  lineCount: number;
  paymentStage: PaymentStage;
  phoneReady: boolean;
  selectedAddressId: string | null;
  selectedDeliveryQuote: CheckoutDeliveryQuote | null;
}): CheckoutBlocker | null {
  if (paymentStage !== "ready") {
    return { message: "Keep this checkout open while payment is being prepared.", tone: "muted" };
  }
  if (activeCheckout) {
    if (!activeCheckout.accessCode) {
      return {
        message: "This payment cannot be reopened here. Open the order in your account for help.",
        tone: "danger",
      };
    }
    if (currentStatus === "reversed") {
      return {
        message: "This payment was reversed. Do not pay again from this checkout.",
        tone: "danger",
      };
    }
    if (currentStatus === "review_required") {
      return {
        message: "This payment is being reviewed. Please do not pay again yet.",
        tone: "danger",
      };
    }
    return null;
  }
  if (lineCount === 0) {
    return { message: "Your bag has no purchasable items.", tone: "danger" };
  }
  if (!phoneReady) {
    return { message: "Save a delivery phone number to continue.", tone: "muted" };
  }
  if (!selectedAddressId) {
    return { message: "Add or select a delivery address to continue.", tone: "muted" };
  }
  if (!selectedDeliveryQuote) {
    return {
      message: "Refresh checkout to load the nationwide delivery quote for this address.",
      tone: "danger",
    };
  }
  if (couponCode.trim() && couponFetching) {
    return { message: "Checking your coupon code…", tone: "muted" };
  }
  if (!couponReady) {
    return { message: "Remove the coupon or enter a valid code to continue.", tone: "danger" };
  }
  return null;
}

function getPaymentNotice(status: CheckoutStatus | null): PaymentNotice | null {
  switch (status) {
    case "initializing":
    case "initialized":
    case "pending":
      return {
        title: "Payment is still in progress",
        detail: "Continue this payment without creating another order.",
        tone: "neutral",
      };
    case "failed":
      return {
        title: "Payment was not completed",
        detail: "Your checkout and bag are saved. Continue payment below to try again safely.",
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
  return (
    status === "failed" ||
    status === "abandoned" ||
    status === "reversed" ||
    status === "review_required"
  );
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
  return error instanceof ApiClientError ? error.message : fallback;
}

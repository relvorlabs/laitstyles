"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/http/client";
import {
  checkoutContextQueryOptions,
  checkoutCouponQueryOptions,
  checkoutQueryOptions,
  useCreateCheckout,
  useVerifyCheckoutPayment,
} from "@/modules/checkout/client/hooks";
import { checkoutKeys } from "@/modules/checkout/client/keys";
import type { CheckoutContext, CheckoutDraft } from "@/modules/checkout/types";
import { useUpdateOwnedProfile } from "@/modules/customers/client/account-hooks";
import type { OwnedAddress } from "@/modules/customers/types";
import {
  preloadPaystackPopup,
  resumePaystackTransaction,
} from "@/modules/payments/client/paystack-popup";
import { useStorefrontAuth } from "@/modules/auth/ui/storefront-auth-provider";
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
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [phone, setPhone] = useState("");
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
      active && signedIn && debouncedCouponCode.trim().length >= 2,
    ),
  );

  const context = contextQuery.data;
  const selectedAddress = useMemo(
    () => context?.addresses.find((address) => address.id === selectedAddressId) ?? null,
    [context?.addresses, selectedAddressId],
  );
  const selectedZone = useMemo(
    () => context?.deliveryZones.find((zone) => zone.id === selectedZoneId) ?? null,
    [context?.deliveryZones, selectedZoneId],
  );
  const couponValidation = couponCode.trim() ? couponQuery.data ?? null : null;
  const discountMinor = couponValidation?.valid ? couponValidation.discountMinor : 0;
  const totalMinor = Math.max(0, subtotalMinor + (selectedZone?.feeMinor ?? 0) - discountMinor);
  const phoneReady = Boolean(context && !context.phoneRequired && context.profile.phone.trim());
  const couponReady =
    !couponCode.trim() ||
    (debouncedCouponCode.trim() === couponCode.trim() &&
      !couponQuery.isFetching &&
      couponValidation?.valid === true);
  const canPay = Boolean(
    signedIn &&
      phoneReady &&
      selectedAddressId &&
      selectedZoneId &&
      lines.length > 0 &&
      couponReady &&
      paymentStage === "ready",
  );

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
    setSelectedAddressId((current) => current ?? context.defaultAddressId);
    setSelectedZoneId((current) => current ?? context.selectedDeliveryZoneId);
    setPhone(context.profile.phone);
    setActiveCheckout((current) => current ?? context.activeCheckout);
  }, [context]);

  useEffect(() => {
    if (!context || !selectedAddress) return;
    selectZoneForAddress(selectedAddress, context, setSelectedZoneId);
  }, [context, selectedAddress]);

  useEffect(() => {
    const checkout = checkoutStatusQuery.data;
    if (!checkout || completedOrder.current === checkout.orderNumber) return;
    setActiveCheckout(checkout);
    if (checkout.status === "success") {
      completedOrder.current = checkout.orderNumber;
      onPaid(checkout.orderNumber);
      return;
    }
    if (isTerminalFailure(checkout.status)) {
      setPaymentStage("ready");
    }
  }, [checkoutStatusQuery.data, onPaid]);

  async function savePhone(): Promise<void> {
    if (!context) return;
    const normalizedPhone = phone.trim();
    if (normalizedPhone.replaceAll(/\D/g, "").length < 7) {
      toast.error("Enter a valid phone number.");
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
        current
          ? { ...current, profile, profileComplete: true, phoneRequired: false }
          : current,
      );
      toast.success("Phone number saved to your account.");
    } catch (error: unknown) {
      toast.error(readErrorMessage(error, "Your phone number could not be saved."));
    }
  }

  async function startPayment(): Promise<void> {
    if (!context || !canPay || !selectedAddressId || !selectedZoneId) return;

    setPaymentStage("creating");
    try {
      const checkout = activeCheckout?.accessCode
        ? activeCheckout
        : await createCheckout.mutateAsync({
            idempotencyKey: idempotencyKey.current,
            addressId: selectedAddressId,
            deliveryZoneId: selectedZoneId,
            ...(couponValidation?.valid ? { couponCode: couponValidation.code } : {}),
            lines: lines.map((line) => ({
              productId: line.productId,
              ...(line.variantId ? { variantId: line.variantId } : {}),
              quantity: line.quantity,
            })),
          });
      setActiveCheckout(checkout);
      if (!checkout.accessCode) {
        throw new Error(
          "This checkout cannot reopen its payment window. Open the order in your account for support.",
        );
      }

      setPaymentStage("paying");
      const outcome = await resumePaystackTransaction(checkout.accessCode);
      if (outcome.kind === "cancelled") {
        setPaymentStage("ready");
        toast.message("Payment was cancelled. Your checkout is saved and can be resumed.");
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
      if (isTerminalFailure(settlement.status)) {
        setPaymentStage("ready");
        toast.error("Payment was not confirmed by Paystack. You can reopen this checkout safely.");
        return;
      }
      toast.message("Paystack received the payment. We are waiting for final confirmation.");
    } catch (error: unknown) {
      setPaymentStage("ready");
      toast.error(readErrorMessage(error, "Checkout could not be completed."));
    }
  }

  if (!signedIn) {
    return (
      <CheckoutPanelShell onBack={onBack} title="Checkout">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
            Sign in to use your saved account details and delivery address. Your bag stays here.
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
          Loading your account and saved delivery details…
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
        {activeCheckout ? (
          <section className="rounded-xl border border-[var(--line)] bg-[var(--sage-light)] p-4 text-sm">
            <p className="font-medium">Resuming {activeCheckout.orderNumber}</p>
            <p className="mt-1 leading-5 text-[var(--muted)]">
              Your order and selected delivery details are already saved. Continue the existing
              Paystack payment instead of creating another checkout.
            </p>
          </section>
        ) : null}

        <section className="space-y-3">
          <SectionHeading label="Account details" />
          <SummaryCard>
            <p className="font-medium text-[var(--ink)]">{profileDisplayName(context)}</p>
            <p>{context.profile.email}</p>
            {phoneReady ? <p>{context.profile.phone}</p> : null}
          </SummaryCard>
          {context.phoneRequired ? (
            <div className="grid gap-3 rounded-xl border border-[var(--line)] p-4">
              <p className="text-sm leading-5 text-[var(--muted)]">
                Add and confirm a phone number for delivery updates. We will save it to your
                account, so checkout will not ask again.
              </p>
              <Input
                aria-label="Phone number"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
                value={phone}
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

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading label="Delivery address" />
            {context.addresses.length > 1 ? (
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

          {showAddressSelector && context.addresses.length > 1 ? (
            <label className="grid gap-2 text-sm">
              <span className="text-[var(--muted)]">Choose an existing saved address</span>
              <select
                className="h-10 rounded-lg border border-input bg-control px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onChange={(event) => setSelectedAddressId(event.target.value)}
                value={selectedAddressId ?? ""}
              >
                {context.addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label}{address.isDefault ? " · Default" : ""} · {address.city}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {context.addresses.length === 0 ? (
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
                    {selectedZone.estimatedDays || "Timing will be confirmed after payment."}
                  </p>
                </div>
                <p className="font-mono font-medium text-[var(--ink)] tabular-nums">
                  {formatNaira(selectedZone.feeMinor)}
                </p>
              </div>
            </SummaryCard>
          ) : (
            <SummaryCard>
              This address is outside the configured delivery zones. Choose another saved address
              or update your addresses in the account area.
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
                  ? "Validating automatically…"
                  : couponValidation?.message || "Enter at least two characters."}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Codes validate automatically; there is no Apply button.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--bone-2)] px-6 py-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 text-[var(--muted)]">
            <span>Items</span>
            <span>{formatNaira(subtotalMinor)}</span>
          </div>
          <div className="flex justify-between gap-4 text-[var(--muted)]">
            <span>Estimated delivery</span>
            <span>{selectedZone ? formatNaira(selectedZone.feeMinor) : "—"}</span>
          </div>
          {discountMinor > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-700">
              <span>Coupon {couponValidation?.code}</span>
              <span>−{formatNaira(discountMinor)}</span>
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
        <p className="mt-3 text-center text-[11px] leading-4 text-[var(--muted)]">
          Paystack opens securely. The order is marked paid only after server verification.
        </p>
      </div>
    </CheckoutPanelShell>
  );
}

function CheckoutPanelShell({
  children,
  onBack,
  title,
}: {
  children: React.ReactNode;
  onBack: () => void;
  title: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-5">
        <Button aria-label="Back to bag" onClick={onBack} size="icon-sm" type="button" variant="ghost">
          ←
        </Button>
        <div>
          <p className="font-serif text-3xl font-normal italic">{title}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Account details, delivery and payment</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
      {label}
    </h3>
  );
}

function SummaryCard({ children }: { children: React.ReactNode }) {
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
        {address.label}{address.isDefault ? " · Default" : ""}
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
    context.profile.email?.split("@")[0] ||
    "Your account"
  );
}

function selectZoneForAddress(
  address: OwnedAddress,
  context: CheckoutContext,
  select: (zoneId: string | null) => void,
): void {
  const city = normalizeLocation(address.city);
  const zone = context.deliveryZones.find((item) => normalizeLocation(item.city) === city);
  select(zone?.id ?? null);
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
      return "Preparing secure payment…";
    case "paying":
      return "Paystack is open…";
    case "verifying":
      return "Verifying payment…";
    case "ready":
      return resuming ? "Resume secure payment" : "Pay securely with Paystack";
  }
}

function isTerminalFailure(status: CheckoutDraft["status"]): boolean {
  return ["failed", "abandoned", "reversed", "review_required"].includes(status);
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return fallback;
}

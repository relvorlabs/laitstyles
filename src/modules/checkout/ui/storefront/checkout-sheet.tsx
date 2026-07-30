"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/http/client";
import {
  checkoutContextQueryOptions,
  checkoutQueryOptions,
  useCreateCheckout,
  useVerifyCheckoutPayment,
} from "@/modules/checkout/client/hooks";
import { checkoutKeys } from "@/modules/checkout/client/keys";
import type { CheckoutContext, CheckoutDraft } from "@/modules/checkout/types";
import {
  useCreateOwnedAddress,
  useUpdateOwnedProfile,
} from "@/modules/customers/client/account-hooks";
import type {
  CreateOwnedAddressInput,
  OwnedAddress,
  OwnedProfile,
} from "@/modules/customers/types";
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

type ProfileDraft = {
  firstName: string;
  lastName: string;
  preferredName: string;
  phone: string;
};

const emptyProfile: ProfileDraft = {
  firstName: "",
  lastName: "",
  preferredName: "",
  phone: "",
};

const emptyAddress: CreateOwnedAddressInput = {
  label: "Home",
  line1: "",
  line2: "",
  city: "",
  state: "",
  deliveryNotes: "",
  isDefault: true,
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
  const createAddress = useCreateOwnedAddress();
  const updateProfile = useUpdateOwnedProfile();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfile);
  const [addressDraft, setAddressDraft] = useState<CreateOwnedAddressInput>(emptyAddress);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentStage, setPaymentStage] = useState<PaymentStage>("ready");
  const [activeCheckout, setActiveCheckout] = useState<CheckoutDraft | null>(null);
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const completedOrder = useRef<string | null>(null);
  const checkoutStatusQuery = useQuery(
    checkoutQueryOptions(activeCheckout?.checkoutId ?? ""),
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
  const totalMinor = subtotalMinor + (selectedZone?.feeMinor ?? 0);
  const profileComplete = isProfileComplete(profileDraft, context?.profile.email ?? null);
  const canPay = Boolean(
    signedIn &&
      profileComplete &&
      selectedAddressId &&
      selectedZoneId &&
      lines.length > 0 &&
      paymentStage === "ready",
  );

  useEffect(() => {
    if (!active) return;
    void preloadPaystackPopup().catch(() => undefined);
  }, [active]);

  useEffect(() => {
    if (!context) return;
    setSelectedAddressId((current) => current ?? context.defaultAddressId);
    setSelectedZoneId((current) => current ?? context.selectedDeliveryZoneId);
    setProfileDraft(profileToDraft(context.profile));
    setShowAddressForm(context.addresses.length === 0);
  }, [context]);

  useEffect(() => {
    if (!context || !selectedAddress) return;
    const city = normalizeLocation(selectedAddress.city);
    const matchingZone = context.deliveryZones.find(
      (zone) => normalizeLocation(zone.city) === city,
    );
    if (matchingZone) setSelectedZoneId(matchingZone.id);
  }, [context, selectedAddress]);

  useEffect(() => {
    const checkout = checkoutStatusQuery.data;
    if (!checkout || completedOrder.current === checkout.orderNumber) return;
    if (checkout.status === "success") {
      completedOrder.current = checkout.orderNumber;
      onPaid(checkout.orderNumber);
      return;
    }
    if (isTerminalFailure(checkout.status)) {
      setPaymentStage("ready");
      toast.error("Paystack did not confirm this payment. Your bag has not been marked as paid.");
    }
  }, [checkoutStatusQuery.data, onPaid]);

  async function saveProfile(): Promise<void> {
    if (!context?.profile.email) {
      toast.error("Add an email address to your account before checkout.");
      return;
    }
    if (!profileComplete) {
      toast.error("Add your first name, last name and phone number.");
      return;
    }

    try {
      const profile = await updateProfile.mutateAsync({
        firstName: profileDraft.firstName.trim(),
        lastName: profileDraft.lastName.trim(),
        preferredName: profileDraft.preferredName.trim() || undefined,
        phone: profileDraft.phone.trim(),
      });
      queryClient.setQueryData<CheckoutContext>(checkoutKeys.context(), (current) =>
        current ? { ...current, profile, profileComplete: true } : current,
      );
      toast.success("Account details saved.");
    } catch (error: unknown) {
      toast.error(readErrorMessage(error, "Account details could not be saved."));
    }
  }

  async function saveAddress(): Promise<void> {
    if (!addressDraft.line1.trim() || !addressDraft.city.trim()) {
      toast.error("Add a street address and city.");
      return;
    }

    try {
      const address = await createAddress.mutateAsync({
        ...addressDraft,
        label: addressDraft.label?.trim() || undefined,
        line1: addressDraft.line1.trim(),
        line2: addressDraft.line2?.trim() || undefined,
        city: addressDraft.city.trim(),
        state: addressDraft.state?.trim() || undefined,
        deliveryNotes: addressDraft.deliveryNotes?.trim() || undefined,
        isDefault: context?.addresses.length === 0 ? true : addressDraft.isDefault,
      });
      mergeCreatedAddress(queryClient, address);
      setSelectedAddressId(address.id);
      setAddressDraft(emptyAddress);
      setShowAddressForm(false);
      selectZoneForAddress(address, context, setSelectedZoneId);
      toast.success("Delivery address saved.");
    } catch (error: unknown) {
      toast.error(readErrorMessage(error, "The delivery address could not be saved."));
    }
  }

  async function startPayment(): Promise<void> {
    if (!context || !canPay || !selectedAddressId || !selectedZoneId) return;

    setPaymentStage("creating");
    try {
      const checkout = await createCheckout.mutateAsync({
        idempotencyKey: idempotencyKey.current,
        addressId: selectedAddressId,
        deliveryZoneId: selectedZoneId,
        lines: lines.map((line) => ({
          productId: line.productId,
          ...(line.variantId ? { variantId: line.variantId } : {}),
          quantity: line.quantity,
        })),
      });
      setActiveCheckout(checkout);
      if (!checkout.accessCode) {
        throw new Error("Paystack did not return a payment access code.");
      }

      setPaymentStage("paying");
      const outcome = await resumePaystackTransaction(checkout.accessCode);
      if (outcome.kind === "cancelled") {
        setPaymentStage("ready");
        toast.message("Payment was cancelled. Nothing has been marked as paid.");
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
        idempotencyKey.current = crypto.randomUUID();
        setPaymentStage("ready");
        toast.error("Payment was not confirmed by Paystack. You can try again safely.");
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
            onClick={() =>
              auth.actions.openSignin(() => openStorefrontOverlay("cartDrawer"))
            }
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
          Loading your checkout details…
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
        <section className="space-y-3">
          <SectionHeading label="Account details" />
          {profileComplete ? (
            <SummaryCard>
              <p className="font-medium">
                {profileDraft.preferredName || `${profileDraft.firstName} ${profileDraft.lastName}`}
              </p>
              <p>{context.profile.email}</p>
              <p>{profileDraft.phone}</p>
            </SummaryCard>
          ) : (
            <div className="grid gap-3 rounded-xl border border-[var(--line)] p-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label="First name"
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, firstName: event.target.value }))
                  }
                  placeholder="First name"
                  value={profileDraft.firstName}
                />
                <Input
                  aria-label="Last name"
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, lastName: event.target.value }))
                  }
                  placeholder="Last name"
                  value={profileDraft.lastName}
                />
              </div>
              <Input
                aria-label="Preferred name"
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, preferredName: event.target.value }))
                }
                placeholder="Preferred name (optional)"
                value={profileDraft.preferredName}
              />
              <Input
                aria-label="Phone number"
                inputMode="tel"
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="Phone number"
                value={profileDraft.phone}
              />
              <Button
                disabled={updateProfile.isPending}
                onClick={() => void saveProfile()}
                type="button"
                variant="outline"
              >
                {updateProfile.isPending ? "Saving…" : "Save account details"}
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading label="Delivery address" />
            {context.addresses.length > 0 ? (
              <Button
                onClick={() => setShowAddressForm((current) => !current)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {showAddressForm ? "Cancel" : "Add address"}
              </Button>
            ) : null}
          </div>

          {context.addresses.length > 0 ? (
            <div className="grid gap-2">
              {context.addresses.map((address) => (
                <label
                  className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] p-4 has-[:checked]:border-[var(--ink)]"
                  key={address.id}
                >
                  <input
                    checked={selectedAddressId === address.id}
                    className="mt-1"
                    name="checkout-address"
                    onChange={() => setSelectedAddressId(address.id)}
                    type="radio"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium">
                      {address.label}{address.isDefault ? " · Default" : ""}
                    </span>
                    <span className="mt-1 block leading-5 text-[var(--muted)]">
                      {[address.line1, address.line2, address.city, address.state]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {showAddressForm ? (
            <div className="grid gap-3 rounded-xl border border-[var(--line)] p-4">
              <Input
                aria-label="Address label"
                onChange={(event) =>
                  setAddressDraft((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="Label, e.g. Home"
                value={addressDraft.label ?? ""}
              />
              <Input
                aria-label="Street address"
                onChange={(event) =>
                  setAddressDraft((current) => ({ ...current, line1: event.target.value }))
                }
                placeholder="Street address"
                value={addressDraft.line1}
              />
              <Input
                aria-label="Address line two"
                onChange={(event) =>
                  setAddressDraft((current) => ({ ...current, line2: event.target.value }))
                }
                placeholder="Apartment or landmark (optional)"
                value={addressDraft.line2 ?? ""}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label="City"
                  onChange={(event) =>
                    setAddressDraft((current) => ({ ...current, city: event.target.value }))
                  }
                  placeholder="City"
                  value={addressDraft.city}
                />
                <Input
                  aria-label="State"
                  onChange={(event) =>
                    setAddressDraft((current) => ({ ...current, state: event.target.value }))
                  }
                  placeholder="State"
                  value={addressDraft.state ?? ""}
                />
              </div>
              <Input
                aria-label="Delivery notes"
                onChange={(event) =>
                  setAddressDraft((current) => ({
                    ...current,
                    deliveryNotes: event.target.value,
                  }))
                }
                placeholder="Delivery note (optional)"
                value={addressDraft.deliveryNotes ?? ""}
              />
              <Button
                disabled={createAddress.isPending}
                onClick={() => void saveAddress()}
                type="button"
                variant="outline"
              >
                {createAddress.isPending ? "Saving…" : "Save delivery address"}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <SectionHeading label="Delivery estimate" />
          {context.deliveryZones.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-[var(--line)] p-4">
              <label className="grid gap-2 text-sm">
                <span className="text-[var(--muted)]">Delivery area</span>
                <select
                  className="h-10 rounded-lg border border-input bg-control px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  onChange={(event) => setSelectedZoneId(event.target.value)}
                  value={selectedZoneId ?? ""}
                >
                  <option disabled value="">
                    Select a delivery area
                  </option>
                  {context.deliveryZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} · {zone.city}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium">Estimated delivery</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {selectedZone?.estimatedDays ||
                      "Timing will be confirmed when delivery operations are connected."}
                  </p>
                </div>
                <p className="font-mono font-medium tabular-nums">
                  {selectedZone ? formatNaira(selectedZone.feeMinor) : "—"}
                </p>
              </div>
            </div>
          ) : (
            <SummaryCard>
              Delivery pricing is not configured yet. Payment remains disabled until a valid
              delivery estimate is available.
            </SummaryCard>
          )}
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
          {paymentLabel(paymentStage)}
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

function profileToDraft(profile: OwnedProfile): ProfileDraft {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    preferredName: profile.preferredName,
    phone: profile.phone,
  };
}

function isProfileComplete(profile: ProfileDraft, email: string | null): boolean {
  return Boolean(email && profile.firstName.trim() && profile.lastName.trim() && profile.phone.trim());
}

function mergeCreatedAddress(queryClient: ReturnType<typeof useQueryClient>, address: OwnedAddress) {
  queryClient.setQueryData<CheckoutContext>(checkoutKeys.context(), (current) => {
    if (!current) return current;
    const addresses = address.isDefault
      ? current.addresses.map((item) => ({ ...item, isDefault: false }))
      : current.addresses;
    return {
      ...current,
      addresses: [...addresses, address],
      defaultAddressId: address.isDefault ? address.id : current.defaultAddressId,
    };
  });
}

function selectZoneForAddress(
  address: OwnedAddress,
  context: CheckoutContext | undefined,
  select: (zoneId: string | null) => void,
): void {
  if (!context) return;
  const city = normalizeLocation(address.city);
  const zone = context.deliveryZones.find((item) => normalizeLocation(item.city) === city);
  if (zone) select(zone.id);
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

function paymentLabel(stage: PaymentStage): string {
  switch (stage) {
    case "creating":
      return "Preparing secure payment…";
    case "paying":
      return "Paystack is open…";
    case "verifying":
      return "Verifying payment…";
    case "ready":
      return "Pay securely with Paystack";
  }
}

function isTerminalFailure(status: CheckoutDraft["status"]): boolean {
  return ["failed", "abandoned", "reversed", "review_required"].includes(status);
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return fallback;
}

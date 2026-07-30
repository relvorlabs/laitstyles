"use client";

import { FavouriteIcon, ShoppingBag03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ApiClientError } from "@/lib/http/client";
import { cn } from "@/lib/utils";
import {
  checkoutContextQueryOptions,
  useCreateCheckout,
  useVerifyCheckoutPayment,
} from "@/modules/checkout/client/hooks";
import type { CheckoutDeliveryZone } from "@/modules/checkout/types";
import { useStorefrontAuth } from "@/modules/auth/ui/storefront-auth-provider";
import { useCreateOwnedAddress } from "@/modules/customers/client/account-hooks";
import type { CreateOwnedAddressInput } from "@/modules/customers/types";
import { resumePaystackTransaction } from "@/modules/payments/client/paystack-popup";
import { money } from "@/modules/products/ui/storefront/catalogue-data";
import {
  useStorefrontCart,
  useStorefrontCatalogueData,
  useStorefrontOverlay,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";

const emptyAddress: CreateOwnedAddressInput = {
  label: "Home",
  line1: "",
  line2: "",
  city: "",
  state: "",
  deliveryNotes: "",
  isDefault: true,
};

export function StorefrontCartSheet({ className }: { className?: string }) {
  const router = useRouter();
  const { products } = useStorefrontCatalogueData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const overlay = useStorefrontOverlay();
  const auth = useStorefrontAuth();
  const createCheckout = useCreateCheckout();
  const verifyPayment = useVerifyCheckoutPayment();
  const createAddress = useCreateOwnedAddress();
  const checkoutContext = useQuery(
    checkoutContextQueryOptions(auth.state.signedIn && overlay.openId === "cartDrawer"),
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressDraft, setAddressDraft] = useState<CreateOwnedAddressInput>(emptyAddress);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const recommendations = products
    .filter(
      (product) =>
        product.status === "available" && !cart.lines.some((line) => line.productId === product.id),
    )
    .slice(0, 2);

  useEffect(() => {
    const context = checkoutContext.data;
    if (!context) return;
    setSelectedAddressId((current) =>
      current && context.addresses.some((address) => address.id === current)
        ? current
        : context.defaultAddressId,
    );
    setSelectedZoneId((current) =>
      current && context.deliveryZones.some((zone) => zone.id === current)
        ? current
        : context.selectedDeliveryZoneId,
    );
    if (context.addresses.length === 0) setShowAddressForm(true);
  }, [checkoutContext.data]);

  const selectedAddress = checkoutContext.data?.addresses.find(
    (address) => address.id === selectedAddressId,
  );
  const selectedZone = checkoutContext.data?.deliveryZones.find(
    (zone) => zone.id === selectedZoneId,
  );
  const deliveryFeeNaira = (selectedZone?.feeMinor ?? 0) / 100;
  const checkoutTotal = cart.subtotal + deliveryFeeNaira;
  const checkoutBusy = createCheckout.isPending || verifyPayment.isPending;

  const availableZones = useMemo(() => {
    const zones = checkoutContext.data?.deliveryZones ?? [];
    if (!selectedAddress) return zones;
    const matching = zones.filter(
      (zone) => normalizeCity(zone.city) === normalizeCity(selectedAddress.city),
    );
    return matching.length > 0 ? matching : zones;
  }, [checkoutContext.data?.deliveryZones, selectedAddress]);

  function selectAddress(addressId: string) {
    setSelectedAddressId(addressId);
    const context = checkoutContext.data;
    const address = context?.addresses.find((candidate) => candidate.id === addressId);
    const matchingZone = address
      ? context?.deliveryZones.find(
          (zone) => normalizeCity(zone.city) === normalizeCity(address.city),
        )
      : null;
    if (matchingZone) setSelectedZoneId(matchingZone.id);
    setCheckoutError(null);
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError(null);
    try {
      const created = await createAddress.mutateAsync(addressDraft);
      setSelectedAddressId(created.id);
      setAddressDraft(emptyAddress);
      setShowAddressForm(false);
      await checkoutContext.refetch();
    } catch (error: unknown) {
      setCheckoutError(readableError(error, "The delivery address could not be saved."));
    }
  }

  async function beginCheckout() {
    setCheckoutError(null);
    setCheckoutNotice(null);
    if (!auth.state.signedIn) {
      auth.actions.openSignin(() => overlay.open("cartDrawer"));
      return;
    }
    if (!auth.state.userEmail) {
      setCheckoutError("Add your email and phone in Account profile before paying.");
      return;
    }
    if (!selectedAddressId) {
      setShowAddressForm(true);
      setCheckoutError("Add or select a delivery address before paying.");
      return;
    }
    if (!selectedZoneId) {
      setCheckoutError("Delivery is not available for the selected address yet.");
      return;
    }

    try {
      const checkout = await createCheckout.mutateAsync({
        idempotencyKey: crypto.randomUUID(),
        addressId: selectedAddressId,
        deliveryZoneId: selectedZoneId,
        lines: cart.lines.map((line) => ({
          productId: line.productId,
          ...(line.variantId ? { variantId: line.variantId } : {}),
          quantity: line.qty,
        })),
      });
      if (!checkout.accessCode) {
        throw new Error("Paystack did not return a payment access code.");
      }

      const popup = await resumePaystackTransaction(checkout.accessCode);
      if (popup.kind === "cancelled") {
        setCheckoutNotice("Payment was cancelled. Your order is still unpaid.");
        return;
      }
      if (popup.kind === "error") throw new Error(popup.message);

      const settlement = await verifyPayment.mutateAsync(checkout.paymentId);
      if (settlement.status === "success") {
        cart.clear();
        overlay.close();
        router.push(`/order-confirmation?order=${encodeURIComponent(settlement.orderNumber)}`);
        return;
      }

      setCheckoutNotice("Payment is still being confirmed. You can track it from your orders.");
      router.push("/account/orders?payment=processing");
    } catch (error: unknown) {
      setCheckoutError(readableError(error, "Checkout could not be completed."));
    }
  }

  return (
    <Sheet
      onOpenChange={(open) => (open ? overlay.open("cartDrawer") : overlay.close())}
      open={overlay.openId === "cartDrawer"}
    >
      <SheetTrigger
        render={
          <Button
            aria-label={`Bag, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
            className={cn("relative flex items-center justify-center", className)}
            size="icon"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={20} strokeWidth={1.6} />
        {cart.count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--ink)] px-1 font-mono text-[10px] text-[var(--bone)]">
            {cart.count}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent
        className="lst-storefront flex w-full flex-col border-l border-[var(--line)] bg-[var(--bone)] p-0 text-[var(--ink)] sm:max-w-[520px]"
        side="right"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5 text-left">
          <div className="flex items-baseline gap-2">
            <SheetTitle className="font-serif text-3xl font-normal italic text-[var(--ink)]">
              Your bag
            </SheetTitle>
            <span className="font-mono text-xs text-[var(--muted)] tabular-nums">{cart.count}</span>
          </div>
          <SheetDescription className="text-xs text-[var(--muted)]">
            Checkout uses the delivery and contact details already saved to your account.
          </SheetDescription>
        </SheetHeader>

        {cart.views.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[var(--sage-light)] text-[var(--ink)]">
              <HugeiconsIcon aria-hidden="true" icon={ShoppingBag03Icon} size={26} strokeWidth={1.6} />
            </span>
            <div>
              <p className="font-serif text-2xl">Your bag is waiting</p>
              <p className="mt-1 max-w-[300px] text-sm leading-relaxed text-[var(--muted)]">
                Add a piece from the archive and it will stay here as you move through the shop.
              </p>
            </div>
            <Button
              className="rounded-full"
              onClick={() => {
                overlay.close();
                router.push("/products");
              }}
              size="lg"
            >
              Shop the archive
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {cart.views.map(({ product, lineKey, lineQty, variantLabel, unitPriceNaira }) => (
                <article className="grid grid-cols-[88px_1fr] gap-4 border-b border-[var(--line)] py-5" key={lineKey}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-[var(--linen)]">
                    {product.images[0] ? (
                      <CloudImage alt={product.name} className="object-cover" fill sizes="88px" src={product.images[0]} />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      Grade {product.condition} · {variantLabel ?? product.size}
                    </p>
                    <h3 className="mt-1 truncate font-serif text-lg">{product.name}</h3>
                    <p className="mt-1 text-sm font-semibold">{money(unitPriceNaira * lineQty)}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {product.inventory === "one-of-one" ? (
                        <span className="text-xs text-[var(--muted)]">One-of-one</span>
                      ) : (
                        <div className="inline-flex h-8 items-center rounded-full border border-[var(--line)]">
                          <Button aria-label={`Decrease ${product.name} quantity`} onClick={() => cart.changeQuantity(lineKey, -1)} size="icon" variant="ghost">−</Button>
                          <span className="min-w-6 text-center font-mono text-xs">{lineQty}</span>
                          <Button aria-label={`Increase ${product.name} quantity`} onClick={() => cart.changeQuantity(lineKey, 1)} size="icon" variant="ghost">+</Button>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <Button
                          className="gap-1.5"
                          onClick={() => {
                            if (!saved.idSet.has(product.id)) void saved.toggleProduct(product.id);
                            cart.removeLine(lineKey);
                          }}
                          size="lg"
                          type="button"
                          variant="link"
                        >
                          <HugeiconsIcon icon={FavouriteIcon} size={14} strokeWidth={1.6} />
                          Save
                        </Button>
                        <Button onClick={() => cart.removeLine(lineKey)} size="lg" type="button" variant="link">Remove</Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <CheckoutAccountSection
                addressDraft={addressDraft}
                availableZones={availableZones}
                contextLoading={checkoutContext.isLoading}
                creatingAddress={createAddress.isPending}
                onAddressDraftChange={setAddressDraft}
                onAddressSubmit={addAddress}
                onProfileClick={() => {
                  overlay.close();
                  router.push("/account/profile");
                }}
                onSelectAddress={selectAddress}
                onSelectZone={setSelectedZoneId}
                onShowAddressForm={setShowAddressForm}
                selectedAddressId={selectedAddressId}
                selectedZoneId={selectedZoneId}
                showAddressForm={showAddressForm}
                signedIn={auth.state.signedIn}
                userEmail={auth.state.userEmail}
                addresses={checkoutContext.data?.addresses ?? []}
              />

              {recommendations.length > 0 ? (
                <section className="py-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Complete the edit</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {recommendations.map((product) => (
                      <Button className="group h-auto min-w-0 justify-start p-0 text-left" key={product.id} onClick={() => cart.addProduct(product.id)} type="button" variant="ghost">
                        <span className="min-w-0">
                          <span className="relative block aspect-[4/3] overflow-hidden rounded-sm bg-[var(--linen)]">
                            {product.images[0] ? <CloudImage alt="" className="object-cover transition-transform group-hover:scale-[1.03]" fill sizes="190px" src={product.images[0]} /> : null}
                          </span>
                          <span className="mt-2 block truncate text-xs font-medium">{product.name}</span>
                          <span className="block text-[11px] text-[var(--muted)]">Add · {money(product.price)}</span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="border-t border-[var(--line)] bg-[var(--bone-2)] px-6 py-5">
              <SummaryRow label="Subtotal" value={money(cart.subtotal)} />
              <SummaryRow
                label="Estimated delivery"
                value={selectedZone ? money(deliveryFeeNaira) : "Select address"}
              />
              <div className="mt-3 flex items-end justify-between border-t border-[var(--line)] pt-3">
                <span className="text-sm font-medium">Total</span>
                <span className="font-serif text-2xl">{money(checkoutTotal)}</span>
              </div>
              {checkoutError ? <p className="mt-3 text-sm text-destructive" role="alert">{checkoutError}</p> : null}
              {checkoutNotice ? <p className="mt-3 text-sm text-[var(--muted)]" role="status">{checkoutNotice}</p> : null}
              <Button className="mt-4 w-full" disabled={checkoutBusy} onClick={() => void beginCheckout()}>
                {checkoutBusy
                  ? "Opening secure payment…"
                  : auth.state.signedIn
                    ? `Pay ${money(checkoutTotal)} with Paystack`
                    : "Sign in to checkout"}
              </Button>
              <p className="mt-3 text-center text-[11px] leading-4 text-[var(--muted)]">
                Availability is rechecked before Paystack opens. Delivery is currently an estimate.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

type CheckoutAccountSectionProps = {
  signedIn: boolean;
  userEmail: string | null;
  contextLoading: boolean;
  addresses: Array<{
    id: string;
    label: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    isDefault: boolean;
  }>;
  selectedAddressId: string | null;
  selectedZoneId: string | null;
  availableZones: CheckoutDeliveryZone[];
  showAddressForm: boolean;
  creatingAddress: boolean;
  addressDraft: CreateOwnedAddressInput;
  onSelectAddress: (addressId: string) => void;
  onSelectZone: (zoneId: string) => void;
  onShowAddressForm: (show: boolean) => void;
  onAddressDraftChange: (input: CreateOwnedAddressInput) => void;
  onAddressSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onProfileClick: () => void;
};

function CheckoutAccountSection(props: CheckoutAccountSectionProps) {
  return (
    <section className="border-b border-[var(--line)] py-6" aria-labelledby="checkout-delivery-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Checkout details</p>
          <h3 className="mt-1 font-serif text-xl" id="checkout-delivery-title">Delivery</h3>
        </div>
        {props.signedIn && props.addresses.length > 0 ? (
          <Button onClick={() => props.onShowAddressForm(!props.showAddressForm)} size="sm" type="button" variant="outline">
            {props.showAddressForm ? "Cancel" : "Add address"}
          </Button>
        ) : null}
      </div>

      {!props.signedIn ? (
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Sign in to use your saved contact and delivery details.</p>
      ) : !props.userEmail ? (
        <div className="mt-3 rounded-md border border-[var(--line)] p-3">
          <p className="text-sm text-[var(--muted)]">Your account needs an email and phone before payment.</p>
          <Button className="mt-2" onClick={props.onProfileClick} size="sm" type="button" variant="outline">Complete profile</Button>
        </div>
      ) : props.contextLoading ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Loading your saved delivery details…</p>
      ) : (
        <>
          {props.addresses.length > 0 ? (
            <div className="mt-4 space-y-2">
              {props.addresses.map((address) => (
                <label className="flex cursor-pointer gap-3 rounded-md border border-[var(--line)] p-3" key={address.id}>
                  <input
                    checked={props.selectedAddressId === address.id}
                    className="mt-1"
                    name="checkout-address"
                    onChange={() => props.onSelectAddress(address.id)}
                    type="radio"
                    value={address.id}
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium">
                      {address.label}{address.isDefault ? " · Default" : ""}
                    </span>
                    <span className="mt-0.5 block leading-5 text-[var(--muted)]">
                      {[address.line1, address.line2, address.city, address.state].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {props.showAddressForm || props.addresses.length === 0 ? (
            <form className="mt-4 grid gap-3 rounded-md border border-[var(--line)] p-4" onSubmit={(event) => void props.onAddressSubmit(event)}>
              <CheckoutInput label="Label" onChange={(value) => props.onAddressDraftChange({ ...props.addressDraft, label: value })} value={props.addressDraft.label ?? ""} />
              <CheckoutInput label="Street address" onChange={(value) => props.onAddressDraftChange({ ...props.addressDraft, line1: value })} required value={props.addressDraft.line1} />
              <CheckoutInput label="Apartment, suite or landmark" onChange={(value) => props.onAddressDraftChange({ ...props.addressDraft, line2: value })} value={props.addressDraft.line2 ?? ""} />
              <div className="grid grid-cols-2 gap-3">
                <CheckoutInput label="City" onChange={(value) => props.onAddressDraftChange({ ...props.addressDraft, city: value })} required value={props.addressDraft.city} />
                <CheckoutInput label="State" onChange={(value) => props.onAddressDraftChange({ ...props.addressDraft, state: value })} value={props.addressDraft.state ?? ""} />
              </div>
              <CheckoutInput label="Delivery notes" onChange={(value) => props.onAddressDraftChange({ ...props.addressDraft, deliveryNotes: value })} value={props.addressDraft.deliveryNotes ?? ""} />
              <Button disabled={props.creatingAddress} type="submit">
                {props.creatingAddress ? "Saving address…" : "Save delivery address"}
              </Button>
            </form>
          ) : null}

          {props.availableZones.length > 0 ? (
            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block font-medium">Delivery estimate</span>
              <select
                className="h-10 w-full rounded-md border border-[var(--line)] bg-transparent px-3"
                onChange={(event) => props.onSelectZone(event.target.value)}
                value={props.selectedZoneId ?? ""}
              >
                <option disabled value="">Select delivery area</option>
                {props.availableZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} · {money(zone.feeMinor / 100)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      )}
    </section>
  );
}

function CheckoutInput({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      <input
        className="h-10 w-full rounded-md border border-[var(--line)] bg-transparent px-3"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function normalizeCity(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function readableError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return fallback;
}

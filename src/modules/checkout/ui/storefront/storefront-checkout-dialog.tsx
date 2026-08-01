"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStorefrontAuth } from "@/modules/auth/ui/storefront-auth-provider";
import { checkoutContextQueryOptions } from "@/modules/checkout/client/hooks";
import { subscribeCheckoutSessionReset } from "@/modules/checkout/client/session-events";
import type { StorefrontCheckoutLine } from "@/modules/checkout/ui/storefront/checkout-sheet";
import { StorefrontCheckoutSheet } from "@/modules/checkout/ui/storefront/checkout-sheet";
import { subscribePaystackWindowHandoff } from "@/modules/payments/client/paystack-popup";
import { useStorefrontOverlay } from "@/modules/storefront-shell/client/storefront-runtime";

export function StorefrontCheckoutDialog({
  lines,
  subtotalMinor,
  onPaid,
}: {
  lines: readonly StorefrontCheckoutLine[];
  subtotalMinor: number;
  onPaid: (orderNumber: string) => void;
}) {
  const auth = useStorefrontAuth();
  const { openId, open: openOverlay, close: closeOverlay } = useStorefrontOverlay();
  const open = openId === "checkoutDialog";
  const checkoutContext = useQuery(
    checkoutContextQueryOptions(open && auth.state.signedIn),
  );
  const [sessionRevision, setSessionRevision] = useState(0);
  const reopenAfterPayment = useRef(false);
  const checkoutOpen = useRef(open);
  const cartFingerprint = useMemo(
    () =>
      lines
        .map((line) => `${line.productId}:${line.variantId ?? "product"}:${line.quantity}`)
        .sort()
        .join("|"),
    [lines],
  );
  const checkoutSessionKey = `${checkoutContext.data?.activeCheckout?.checkoutId ?? "new"}:${cartFingerprint}:${subtotalMinor}:${sessionRevision}`;

  useEffect(() => {
    checkoutOpen.current = open;
  }, [open]);

  useEffect(
    () => subscribeCheckoutSessionReset(() => setSessionRevision((current) => current + 1)),
    [],
  );

  useEffect(
    () =>
      subscribePaystackWindowHandoff((handoff) => {
        if (handoff.stage === "opening") {
          reopenAfterPayment.current = checkoutOpen.current;
          if (reopenAfterPayment.current) closeOverlay();
          return;
        }

        if (handoff.reopenCheckout && reopenAfterPayment.current) {
          window.setTimeout(() => openOverlay("checkoutDialog"), 0);
        }
        reopenAfterPayment.current = false;
      }),
    [closeOverlay, openOverlay],
  );

  function returnToCart(): void {
    closeOverlay();
    window.setTimeout(() => openOverlay("cartDrawer"), 220);
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (nextOpen) openOverlay("checkoutDialog");
        else if (openId === "checkoutDialog") closeOverlay();
      }}
      open={open}
    >
      <DialogContent
        className="lst-storefront flex max-h-[calc(100dvh-1rem)] w-[min(760px,calc(100%-1rem))] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bone)] p-0 text-[var(--ink)] sm:max-h-[calc(100dvh-2rem)]"
        showCloseButton
      >
        <DialogTitle className="sr-only">Checkout</DialogTitle>
        <DialogDescription className="sr-only">
          Confirm your contact, delivery address, promo code, order total and payment.
        </DialogDescription>
        <StorefrontCheckoutSheet
          active={open}
          key={checkoutSessionKey}
          lines={lines}
          onBack={returnToCart}
          onPaid={onPaid}
          subtotalMinor={subtotalMinor}
        />
      </DialogContent>
    </Dialog>
  );
}

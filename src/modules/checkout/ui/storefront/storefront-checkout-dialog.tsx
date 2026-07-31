"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const { openId, open: openOverlay, close: closeOverlay } = useStorefrontOverlay();
  const open = openId === "checkoutDialog";
  const reopenAfterPayment = useRef(false);
  const checkoutOpen = useRef(open);

  useEffect(() => {
    checkoutOpen.current = open;
  }, [open]);

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
        className="lst-storefront max-h-[calc(100dvh-1rem)] w-[min(760px,calc(100%-1rem))] max-w-none overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bone)] p-0 text-[var(--ink)] sm:max-h-[calc(100dvh-2rem)]"
        showCloseButton
      >
        <DialogTitle className="sr-only">Checkout</DialogTitle>
        <DialogDescription className="sr-only">
          Confirm your contact, delivery address, promo code, order total and payment.
        </DialogDescription>
        <StorefrontCheckoutSheet
          active={open}
          lines={lines}
          onBack={returnToCart}
          onPaid={onPaid}
          subtotalMinor={subtotalMinor}
        />
      </DialogContent>
    </Dialog>
  );
}

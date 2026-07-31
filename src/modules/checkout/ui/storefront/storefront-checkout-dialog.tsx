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
  const overlay = useStorefrontOverlay();
  const open = overlay.openId === "checkoutDialog";
  const reopenAfterPayment = useRef(false);

  useEffect(
    () =>
      subscribePaystackWindowHandoff((handoff) => {
        if (handoff.stage === "opening") {
          reopenAfterPayment.current = overlay.openId === "checkoutDialog";
          if (reopenAfterPayment.current) overlay.close();
          return;
        }

        if (handoff.reopenCheckout && reopenAfterPayment.current) {
          window.setTimeout(() => overlay.open("checkoutDialog"), 0);
        }
        reopenAfterPayment.current = false;
      }),
    [overlay],
  );

  function returnToCart(): void {
    overlay.close();
    window.setTimeout(() => overlay.open("cartDrawer"), 220);
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (nextOpen) overlay.open("checkoutDialog");
        else if (overlay.openId === "checkoutDialog") overlay.close();
      }}
      open={open}
    >
      <DialogContent
        className="lst-storefront max-h-[calc(100dvh-1rem)] w-[min(760px,calc(100%-1rem))] max-w-none overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bone)] p-0 text-[var(--ink)] sm:max-h-[calc(100dvh-2rem)]"
        keepMounted
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

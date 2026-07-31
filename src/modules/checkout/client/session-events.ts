"use client";

export type CheckoutSessionResetReason =
  | "payment-initialization-failed"
  | "closed-idempotency-session";

const CHECKOUT_SESSION_RESET_EVENT = "laitstyles:checkout-session-reset";

export function requestCheckoutSessionReset(reason: CheckoutSessionResetReason): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CheckoutSessionResetReason>(CHECKOUT_SESSION_RESET_EVENT, { detail: reason }),
  );
}

export function subscribeCheckoutSessionReset(
  listener: (reason: CheckoutSessionResetReason) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) =>
    listener((event as CustomEvent<CheckoutSessionResetReason>).detail);
  window.addEventListener(CHECKOUT_SESSION_RESET_EVENT, handler);
  return () => window.removeEventListener(CHECKOUT_SESSION_RESET_EVENT, handler);
}

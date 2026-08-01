import { openStorefrontOverlay } from "@/modules/storefront-shell/client/storefront-overlay-events";

const RESUME_CHECKOUT_EVENT = "laitstyles:resume-checkout";

export function requestStorefrontCheckoutResume(): void {
  if (typeof window === "undefined") return;
  openStorefrontOverlay("checkoutDialog");
  window.dispatchEvent(new Event(RESUME_CHECKOUT_EVENT));
}

export function subscribeToStorefrontCheckoutResume(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(RESUME_CHECKOUT_EVENT, listener);
  return () => window.removeEventListener(RESUME_CHECKOUT_EVENT, listener);
}

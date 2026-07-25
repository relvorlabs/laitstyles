"use client";

export type QuickViewRequest = { productId: string };
export type ImageViewerRequest = {
  productId: string;
  index?: number;
  images?: readonly string[];
};
export type AuthDialogRequest = {
  mode: "signin" | "signup";
  onSuccess?: () => void;
};

const QUICK_VIEW_EVENT = "laitstyles:quick-view";
const IMAGE_VIEWER_EVENT = "laitstyles:image-viewer";
const AUTH_DIALOG_EVENT = "laitstyles:auth-dialog";

export function openQuickView(productId: string) {
  window.dispatchEvent(
    new CustomEvent<QuickViewRequest>(QUICK_VIEW_EVENT, { detail: { productId } }),
  );
}

export function openImageViewer(request: ImageViewerRequest) {
  window.dispatchEvent(new CustomEvent<ImageViewerRequest>(IMAGE_VIEWER_EVENT, { detail: request }));
}

export function openAuthDialog(request: AuthDialogRequest) {
  window.dispatchEvent(new CustomEvent<AuthDialogRequest>(AUTH_DIALOG_EVENT, { detail: request }));
}

export function subscribeQuickView(listener: (request: QuickViewRequest) => void) {
  return subscribe<QuickViewRequest>(QUICK_VIEW_EVENT, listener);
}

export function subscribeImageViewer(listener: (request: ImageViewerRequest) => void) {
  return subscribe<ImageViewerRequest>(IMAGE_VIEWER_EVENT, listener);
}

export function subscribeAuthDialog(listener: (request: AuthDialogRequest) => void) {
  return subscribe<AuthDialogRequest>(AUTH_DIALOG_EVENT, listener);
}

function subscribe<T>(eventName: string, listener: (detail: T) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<T>).detail);
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}

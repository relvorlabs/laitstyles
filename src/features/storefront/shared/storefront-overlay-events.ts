"use client";

import {
  storefrontUiStore,
  type StorefrontOverlayId,
} from "@/stores/storefront-ui.store";

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
const TRANSIENT_OVERLAY_CLOSE_EVENT = "laitstyles:close-transient-overlays";

export function openQuickView(productId: string) {
  prepareTransientOverlay();
  dispatch<QuickViewRequest>(QUICK_VIEW_EVENT, { productId });
}

export function openImageViewer(request: ImageViewerRequest) {
  prepareTransientOverlay();
  dispatch<ImageViewerRequest>(IMAGE_VIEWER_EVENT, request);
}

export function openAuthDialog(request: AuthDialogRequest) {
  prepareTransientOverlay();
  dispatch<AuthDialogRequest>(AUTH_DIALOG_EVENT, request);
}

export function openStorefrontOverlay(id: StorefrontOverlayId) {
  closeTransientStorefrontOverlays();
  storefrontUiStore.getState().open(id);
}

export function closeStorefrontOverlays() {
  storefrontUiStore.getState().close();
  closeTransientStorefrontOverlays();
}

export function closeTransientStorefrontOverlays() {
  window.dispatchEvent(new Event(TRANSIENT_OVERLAY_CLOSE_EVENT));
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

export function subscribeTransientOverlayClose(listener: () => void) {
  window.addEventListener(TRANSIENT_OVERLAY_CLOSE_EVENT, listener);
  return () => window.removeEventListener(TRANSIENT_OVERLAY_CLOSE_EVENT, listener);
}

function prepareTransientOverlay() {
  storefrontUiStore.getState().close();
  closeTransientStorefrontOverlays();
}

function dispatch<T>(eventName: string, detail: T) {
  window.dispatchEvent(new CustomEvent<T>(eventName, { detail }));
}

function subscribe<T>(eventName: string, listener: (detail: T) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<T>).detail);
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}

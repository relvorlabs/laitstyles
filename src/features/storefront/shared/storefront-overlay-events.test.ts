// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { storefrontUiStore } from "@/stores/storefront-ui.store";
import {
  openImageViewer,
  openQuickView,
  openStorefrontOverlay,
  subscribeImageViewer,
  subscribeQuickView,
  subscribeTransientOverlayClose,
} from "./storefront-overlay-events";

beforeEach(() => {
  storefrontUiStore.getState().reset();
});

describe("storefront overlay coordination", () => {
  it("closes the active Zustand overlay before opening quick view", () => {
    const onClose = vi.fn();
    const onQuickView = vi.fn();
    const unsubscribeClose = subscribeTransientOverlayClose(onClose);
    const unsubscribeQuickView = subscribeQuickView(onQuickView);
    storefrontUiStore.getState().open("searchModal");

    openQuickView("product-1");

    expect(storefrontUiStore.getState().openId).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onQuickView).toHaveBeenCalledWith({ productId: "product-1" });
    unsubscribeClose();
    unsubscribeQuickView();
  });

  it("closes transient overlays before opening a Zustand overlay", () => {
    const onClose = vi.fn();
    const unsubscribeClose = subscribeTransientOverlayClose(onClose);

    openStorefrontOverlay("cartDrawer");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(storefrontUiStore.getState().openId).toBe("cartDrawer");
    unsubscribeClose();
  });

  it("closes the current transient overlay before opening the image viewer", () => {
    const onClose = vi.fn();
    const onImageViewer = vi.fn();
    const unsubscribeClose = subscribeTransientOverlayClose(onClose);
    const unsubscribeImageViewer = subscribeImageViewer(onImageViewer);

    openImageViewer({ productId: "product-2", index: 3 });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onImageViewer).toHaveBeenCalledWith({ productId: "product-2", index: 3 });
    unsubscribeClose();
    unsubscribeImageViewer();
  });
});

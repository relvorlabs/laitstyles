"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import type { CartSelection } from "./cart-lines";
import { openImageViewer, openQuickView } from "./storefront-overlay-events";
import {
  showStorefrontToast,
  useStorefrontCart,
  useStorefrontCatalogData,
  useStorefrontOverlay,
  useStorefrontRecent,
  useStorefrontSavedItems,
} from "./storefront-runtime";
import { productById } from "./catalogue-data";

/**
 * Temporary import-compatibility facade during Phase 6 consumer migration.
 * It renders no provider and owns no state. Delete after the last legacy import moves.
 */
export function StorefrontProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useStorefront() {
  const catalog = useStorefrontCatalogData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const recent = useStorefrontRecent();
  const overlay = useStorefrontOverlay();
  const findProduct = useCallback(
    (productId: string) => productById(catalog.products, productId),
    [catalog.products],
  );
  const savedSet = useMemo(() => new Set(saved.ids), [saved.ids]);

  const addToCart = useCallback(
    (productId: string, selection?: CartSelection, quantity = 1) =>
      cart.addProduct(productId, selection, quantity),
    [cart.addProduct],
  );
  const toggleSaved = useCallback(
    (productId: string) => saved.toggleProduct(productId),
    [saved.toggleProduct],
  );

  return {
    products: catalog.products,
    categories: catalog.categories,
    measurementsCm: catalog.measurementsCm,
    variantOptionsByProductId: catalog.variantOptionsByProductId,
    productById: findProduct,
    saved: savedSet,
    cart: cart.lines,
    cartLines: cart.views,
    cartCount: cart.count,
    subtotal: cart.subtotal,
    savedList: saved.items,
    recent: recent.ids,
    recentList: recent.items,
    openId: overlay.openId,
    open: overlay.open,
    closeAll: overlay.close,
    openQuick: openQuickView,
    openImageViewerFor: (
      productId: string,
      index = 0,
      images?: readonly string[],
    ) => openImageViewer({ productId, index, images }),
    addToCart,
    toggleSaved,
    removeFromCart: cart.removeLine,
    changeQty: cart.changeQuantity,
    showToast: showStorefrontToast,
  };
}

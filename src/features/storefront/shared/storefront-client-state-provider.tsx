"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import type { CartLine } from "./cart-lines";
import type { StorefrontHoldIntent } from "./storefront-client-state";
import {
  useStorefrontCatalogData,
  useStorefrontHolds,
} from "./storefront-runtime";
import { productById } from "./catalogue-data";
import {
  cartStore,
  selectCartHydrated,
  selectCartLines,
  useCartStore,
} from "@/stores/cart.store";
import {
  savedItemsStore,
  selectSavedHydrated,
  selectSavedIds,
  useSavedItemsStore,
} from "@/stores/saved-items.store";
import {
  selectHolds,
  selectUiHydrated,
  useStorefrontUiStore,
} from "@/stores/storefront-ui.store";

type StorefrontClientStateValue = {
  ready: boolean;
  cart: readonly CartLine[];
  saved: Set<string>;
  holds: readonly StorefrontHoldIntent[];
  holdSecondsByProduct: Readonly<Record<string, number>>;
  setCart: (next: readonly CartLine[]) => void;
  updateCart: (updater: (current: readonly CartLine[]) => readonly CartLine[]) => void;
  setSaved: (next: Set<string>) => void;
  holdProduct: (productId: string) => boolean;
  releaseProduct: (productId: string) => void;
  reholdProduct: (productId: string) => boolean;
  clearCart: () => void;
};

/**
 * Temporary Phase 6 compatibility shell. It owns no state and exists only until
 * the final StorefrontProvider consumers are migrated to focused hooks.
 */
export function StorefrontClientStateProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useStorefrontClientState(): StorefrontClientStateValue {
  const { products } = useStorefrontCatalogData();
  const cart = useCartStore(selectCartLines);
  const cartHydrated = useCartStore(selectCartHydrated);
  const savedIds = useSavedItemsStore(selectSavedIds);
  const savedHydrated = useSavedItemsStore(selectSavedHydrated);
  const holds = useStorefrontUiStore(selectHolds);
  const uiHydrated = useStorefrontUiStore(selectUiHydrated);
  const holdRuntime = useStorefrontHolds();
  const saved = useMemo(() => new Set(savedIds), [savedIds]);

  const setCart = useCallback((next: readonly CartLine[]) => {
    cartStore.setState({ lines: [...next] });
  }, []);
  const updateCart = useCallback(
    (updater: (current: readonly CartLine[]) => readonly CartLine[]) => {
      cartStore.setState((state) => ({ lines: updater(state.lines) }));
    },
    [],
  );
  const setSaved = useCallback((next: Set<string>) => {
    savedItemsStore.setState({ ids: [...next] });
  }, []);
  const holdProduct = useCallback(
    (productId: string) => {
      const product = productById(products, productId);
      if (!product || product.status !== "available") return false;
      holdRuntime.holdProduct(product.id);
      return true;
    },
    [holdRuntime.holdProduct, products],
  );
  const releaseProduct = useCallback(
    (productId: string) => holdRuntime.releaseProduct(productId),
    [holdRuntime.releaseProduct],
  );
  const reholdProduct = useCallback(
    (productId: string) => holdProduct(productId),
    [holdProduct],
  );
  const clearCart = useCallback(() => cartStore.getState().clear(), []);

  return {
    ready: cartHydrated && savedHydrated && uiHydrated,
    cart,
    saved,
    holds,
    holdSecondsByProduct: holdRuntime.secondsByProduct,
    setCart,
    updateCart,
    setSaved,
    holdProduct,
    releaseProduct,
    reholdProduct,
    clearCart,
  };
}

export function formatHoldTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

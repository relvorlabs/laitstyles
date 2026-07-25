"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { restoreCartLines } from "@/modules/cart/cart-restoration";
import { useStorefrontCatalogue } from "@/modules/products/client/storefront-catalogue";
import {
  loadStorefrontClientState,
  persistStorefrontClientState,
  STOREFRONT_CLIENT_STATE_VERSION,
} from "@/modules/storefront-shell/client/storefront-client-state";
import {
  StorefrontHoldClockBoundary,
  useStorefrontHoldNow,
} from "@/modules/storefront-shell/client/storefront-hold-clock";
import { StorefrontHoldAlert } from "@/modules/storefront-shell/ui/storefront-feedback";
import { cartStore, selectCartHydrated, selectCartLines, useCartStore } from "@/stores/cart.store";
import {
  savedItemsStore,
  selectSavedHydrated,
  selectSavedIds,
  useSavedItemsStore,
} from "@/stores/saved-items.store";
import {
  selectHolds,
  selectRecentIds,
  selectUiHydrated,
  storefrontUiStore,
  useStorefrontUiStore,
} from "@/stores/storefront-ui.store";

const RECENT_STORAGE_KEY = "laitstyles-storefront:v1:recent";
const LEGACY_RECENT_STORAGE_KEY = "laitstyles-recent";
const UTILITY_STORAGE_KEY = "laitstyles-storefront:v1:utility";

export function StorefrontStateHydrator({ children }: { children: ReactNode }) {
  const catalogue = useStorefrontCatalogue();
  const hydrationStarted = useRef(false);
  const cart = useCartStore(selectCartLines);
  const cartHydrated = useCartStore(selectCartHydrated);
  const saved = useSavedItemsStore(selectSavedIds);
  const savedHydrated = useSavedItemsStore(selectSavedHydrated);
  const holds = useStorefrontUiStore(selectHolds);
  const recentIds = useStorefrontUiStore(selectRecentIds);
  const uiHydrated = useStorefrontUiStore(selectUiHydrated);
  const utilityDismissed = useStorefrontUiStore((state) => state.utilityDismissed);
  const ready = cartHydrated && savedHydrated && uiHydrated;

  useEffect(() => {
    if (hydrationStarted.current || !catalogue.data) return;
    hydrationStarted.current = true;

    const frame = window.requestAnimationFrame(() => {
      const loaded = loadStorefrontClientState(window.sessionStorage, window.localStorage);
      const recentIds = readStringArray(
        window.sessionStorage.getItem(RECENT_STORAGE_KEY) ??
          window.sessionStorage.getItem(LEGACY_RECENT_STORAGE_KEY),
      );
      const utilityDismissed =
        window.sessionStorage.getItem(UTILITY_STORAGE_KEY) === "dismissed";

      cartStore
        .getState()
        .hydrate(
          restoreCartLines(
            loaded.snapshot.cart,
            catalogue.data.products,
            catalogue.data.variantOptionsByProductId,
          ),
        );
      savedItemsStore.getState().hydrate(loaded.snapshot.saved);
      storefrontUiStore.getState().hydrate({
        recentIds,
        utilityDismissed,
        holds: loaded.snapshot.holds,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [catalogue.data]);

  useEffect(() => {
    if (!ready) return;

    persistStorefrontClientState(window.sessionStorage, window.localStorage, {
      version: STOREFRONT_CLIENT_STATE_VERSION,
      cart: cart.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.qty,
      })),
      saved: [...saved],
      holds: [...holds],
    });

    try {
      window.sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentIds));
      window.sessionStorage.removeItem(LEGACY_RECENT_STORAGE_KEY);
      if (utilityDismissed) {
        window.sessionStorage.setItem(UTILITY_STORAGE_KEY, "dismissed");
      } else {
        window.sessionStorage.removeItem(UTILITY_STORAGE_KEY);
      }
    } catch {
      // Browser preferences are best effort; the in-memory stores remain usable.
    }
  }, [cart, holds, ready, recentIds, saved, utilityDismissed]);

  return (
    <StorefrontHoldClockBoundary>
      {children}
      <StorefrontHoldAlertRuntime />
    </StorefrontHoldClockBoundary>
  );
}

function StorefrontHoldAlertRuntime() {
  const holds = useStorefrontUiStore(selectHolds);
  const dismissed = useStorefrontUiStore((state) => state.holdAlertDismissed);
  const dismiss = useStorefrontUiStore((state) => state.dismissHoldAlert);
  const now = useStorefrontHoldNow();

  const seconds = useMemo(
    () =>
      holds
        .map((hold) => Math.max(0, Math.ceil((hold.expiresAt - now) / 1000)))
        .filter(Boolean),
    [holds, now],
  );

  if (seconds.length === 0 || dismissed) return null;

  return (
    <StorefrontHoldAlert
      count={seconds.length}
      onDismiss={dismiss}
      secondsLeft={Math.min(...seconds)}
    />
  );
}

function readStringArray(serialized: string | null): string[] {
  if (!serialized) return [];
  try {
    const value = JSON.parse(serialized) as unknown;
    return Array.isArray(value)
      ? value.filter((candidate): candidate is string => typeof candidate === "string")
      : [];
  } catch {
    return [];
  }
}

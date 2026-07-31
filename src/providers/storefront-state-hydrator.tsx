"use client";

import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { restoreCartLines } from "@/modules/cart/cart-restoration";
import {
  ownedCartQueryOptions,
  useMergeOwnedCart,
  useReplaceOwnedCart,
} from "@/modules/cart/client/hooks";
import type { OwnedCartWriteInput } from "@/modules/cart/types";
import { checkoutContextQueryOptions } from "@/modules/checkout/client/hooks";
import { requestStorefrontCheckoutResume } from "@/modules/checkout/client/recovery-events";
import { useReconcileSavedProductsOnAuth } from "@/modules/customers/client/account-hooks";
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
import {
  StorefrontCheckoutAlert,
  StorefrontHoldAlert,
} from "@/modules/storefront-shell/ui/storefront-feedback";
import { useSession } from "@/providers/session-provider";
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
const CART_URL = "/api/v1/account/cart";

export function StorefrontStateHydrator({ children }: { children: ReactNode }) {
  const session = useSession();
  const catalogue = useStorefrontCatalogue();
  const ownedCartQuery = useQuery(ownedCartQueryOptions(session.signedIn));
  const mergeOwnedCart = useMergeOwnedCart();
  const replaceOwnedCart = useReplaceOwnedCart();
  const hydratedIdentity = useRef<string | null>(null);
  const auxiliaryHydrated = useRef(false);
  const syncTimer = useRef<number | undefined>(undefined);
  const lastSyncedSignature = useRef("");
  const cart = useCartStore(selectCartLines);
  const cartHydrated = useCartStore(selectCartHydrated);
  const saved = useSavedItemsStore(selectSavedIds);
  const savedHydrated = useSavedItemsStore(selectSavedHydrated);
  const holds = useStorefrontUiStore(selectHolds);
  const recentIds = useStorefrontUiStore(selectRecentIds);
  const uiHydrated = useStorefrontUiStore(selectUiHydrated);
  const utilityDismissed = useStorefrontUiStore((state) => state.utilityDismissed);
  const ready = cartHydrated && savedHydrated && uiHydrated;
  const identityKey = session.signedIn ? `consumer:${session.email ?? "unknown"}` : "guest";
  useReconcileSavedProductsOnAuth(session.signedIn && savedHydrated);

  useEffect(() => {
    if (!catalogue.data || hydratedIdentity.current === identityKey) return;
    if (session.signedIn && (ownedCartQuery.isPending || !ownedCartQuery.data)) return;
    hydratedIdentity.current = identityKey;

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      void (async () => {
        const loaded = loadStorefrontClientState(window.sessionStorage, window.localStorage);
        const guestLines = restoreCartLines(
          loaded.snapshot.cart,
          catalogue.data.products,
          catalogue.data.variantOptionsByProductId,
        );
        let nextLines = guestLines;

        if (session.signedIn && ownedCartQuery.data) {
          const guestIntent = cartWriteInput(guestLines);
          let owned = ownedCartQuery.data;
          if (guestIntent.lines.length > 0) {
            try {
              owned = await mergeOwnedCart.mutateAsync(guestIntent);
            } catch {
              // Keep the canonical server snapshot when a merge cannot be completed.
            }
          }
          nextLines = restoreCartLines(
            owned.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
            })),
            catalogue.data.products,
            catalogue.data.variantOptionsByProductId,
          );
          lastSyncedSignature.current = cartSignature(nextLines);
          persistStorefrontClientState(window.sessionStorage, window.localStorage, {
            version: STOREFRONT_CLIENT_STATE_VERSION,
            cart: [],
            saved: loaded.snapshot.saved,
            holds: loaded.snapshot.holds,
          });
        }

        if (cancelled) return;
        cartStore.getState().hydrate(nextLines);

        if (!auxiliaryHydrated.current) {
          auxiliaryHydrated.current = true;
          const storedRecentIds = readStringArray(
            window.sessionStorage.getItem(RECENT_STORAGE_KEY) ??
              window.sessionStorage.getItem(LEGACY_RECENT_STORAGE_KEY),
          );
          const storedUtilityDismissed =
            window.sessionStorage.getItem(UTILITY_STORAGE_KEY) === "dismissed";
          savedItemsStore.getState().hydrate(loaded.snapshot.saved);
          storefrontUiStore.getState().hydrate({
            recentIds: storedRecentIds,
            utilityDismissed: storedUtilityDismissed,
            holds: loaded.snapshot.holds,
          });
        }
      })();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [
    catalogue.data,
    identityKey,
    mergeOwnedCart,
    ownedCartQuery.data,
    ownedCartQuery.isPending,
    session.signedIn,
  ]);

  useEffect(() => {
    if (!ready) return;

    persistStorefrontClientState(window.sessionStorage, window.localStorage, {
      version: STOREFRONT_CLIENT_STATE_VERSION,
      cart: session.signedIn ? [] : cartWriteInput(cart).lines,
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
  }, [cart, holds, ready, recentIds, saved, session.signedIn, utilityDismissed]);

  useEffect(() => {
    if (!ready || !session.signedIn || hydratedIdentity.current !== identityKey) return;
    const signature = cartSignature(cart);
    if (signature === lastSyncedSignature.current) return;

    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      const input = cartWriteInput(cart);
      void replaceOwnedCart
        .mutateAsync(input)
        .then((snapshot) => {
          lastSyncedSignature.current = snapshotSignature(snapshot.lines);
        })
        .catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(syncTimer.current);
  }, [cart, identityKey, ready, replaceOwnedCart, session.signedIn]);

  useEffect(() => {
    if (!ready || !session.signedIn) return;
    const flush = () => {
      const body = JSON.stringify(cartWriteInput(cartStore.getState().lines));
      void fetch(CART_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        credentials: "same-origin",
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [ready, session.signedIn]);

  return (
    <StorefrontHoldClockBoundary>
      {children}
      <StorefrontRecoveryAlertRuntime signedIn={session.signedIn} />
    </StorefrontHoldClockBoundary>
  );
}

function StorefrontRecoveryAlertRuntime({ signedIn }: { signedIn: boolean }) {
  const checkoutContext = useQuery(checkoutContextQueryOptions(signedIn));
  const [dismissedCheckoutId, setDismissedCheckoutId] = useState<string | null>(null);
  const activeCheckout = checkoutContext.data?.activeCheckout ?? null;

  if (!signedIn) return <StorefrontHoldAlertRuntime />;

  if (activeCheckout && dismissedCheckoutId !== activeCheckout.checkoutId) {
    return (
      <StorefrontCheckoutAlert
        onDismiss={() => setDismissedCheckoutId(activeCheckout.checkoutId)}
        onResume={requestStorefrontCheckoutResume}
        orderNumber={activeCheckout.orderNumber}
        status={activeCheckout.status}
      />
    );
  }
  return <StorefrontHoldAlertRuntime />;
}

function StorefrontHoldAlertRuntime() {
  const holds = useStorefrontUiStore(selectHolds);
  const dismissed = useStorefrontUiStore((state) => state.holdAlertDismissed);
  const dismiss = useStorefrontUiStore((state) => state.dismissHoldAlert);
  const now = useStorefrontHoldNow();

  const seconds = useMemo(
    () =>
      holds.map((hold) => Math.max(0, Math.ceil((hold.expiresAt - now) / 1000))).filter(Boolean),
    [holds, now],
  );

  if (seconds.length === 0 || dismissed) return null;

  return (
    <StorefrontHoldAlert
      count={seconds.length}
      onCheckout={requestStorefrontCheckoutResume}
      onDismiss={dismiss}
      secondsLeft={Math.min(...seconds)}
    />
  );
}

function cartWriteInput(
  lines: readonly { productId: string; variantId: string | null; qty: number }[],
): OwnedCartWriteInput {
  return {
    lines: lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.qty,
    })),
  };
}

function cartSignature(
  lines: readonly { productId: string; variantId: string | null; qty: number }[],
): string {
  return lines
    .map((line) => `${line.productId}:${line.variantId ?? "default"}:${line.qty}`)
    .sort()
    .join("|");
}

function snapshotSignature(
  lines: readonly { productId: string; variantId: string | null; quantity: number }[],
): string {
  return lines
    .map((line) => `${line.productId}:${line.variantId ?? "default"}:${line.quantity}`)
    .sort()
    .join("|");
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
